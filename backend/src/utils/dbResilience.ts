import { logger } from './logger';
import mongoose from 'mongoose';
import { CircuitBreaker, CircuitBreakerError, CircuitState } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';

/**
 * Database Operation Queue
 * Stores operations that failed due to DB issues for retry later
 */
interface QueuedOperation {
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
}

/**
 * Database Resilience Manager
 * 
 * Root Implementation:
 * - Monitors MongoDB connection state
 * - Queues operations when DB is unavailable
 * - Retries queued operations when DB recovers
 * - Circuit breaker prevents overwhelming failing DB
 * - Graceful degradation: continues scanning even if DB fails
 */
export class DatabaseResilienceManager {
  private circuitBreaker: CircuitBreaker;
  private operationQueue: QueuedOperation[] = [];
  private isProcessingQueue = false;
  private maxQueueSize = 1000;
  private maxQueuedOperationAge = 3600000; // 1 hour
  private queueProcessingInterval = 5000; // Check queue every 5 seconds
  private queueProcessorIntervalId: NodeJS.Timeout | null = null;
  private connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  constructor() {
    // Circuit breaker for DB operations
    this.circuitBreaker = new CircuitBreaker('database', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000, // 30s before testing recovery
      resetTimeout: 60000,
      monitoringPeriod: 60000
    });

    // Monitor MongoDB connection state
    this.setupConnectionMonitoring();

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Setup MongoDB connection state monitoring
   */
  private setupConnectionMonitoring(): void {
    if (mongoose.connection.readyState === 1) {
      this.connectionState = 'connected';
    }

    mongoose.connection.on('connected', () => {
      this.connectionState = 'connected';
      logger.warn('[DB] MongoDB connection established');
      // Process queue when connection is restored
      this.processQueue();
    });

    mongoose.connection.on('disconnected', () => {
      this.connectionState = 'disconnected';
      logger.error('[DB] MongoDB connection lost');
    });

    mongoose.connection.on('connecting', () => {
      this.connectionState = 'connecting';
      logger.warn('[DB] MongoDB connecting...');
    });

    mongoose.connection.on('error', (error) => {
      logger.error(`[DB] MongoDB connection error: ${error.message}`);
    });
  }

  /**
   * Check if database is available
   */
  private isDatabaseAvailable(): boolean {
    return mongoose.connection.readyState === 1 && !this.circuitBreaker.isOpen();
  }

  /**
   * Execute database operation with resilience
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      queueOnFailure?: boolean;    // Queue operation if DB unavailable
      timeout?: number;            // Operation timeout
    } = {}
  ): Promise<T> {
    const {
      queueOnFailure = true,
      timeout = 30000
    } = options;

    // If DB is available, execute immediately
    if (this.isDatabaseAvailable()) {
      try {
        return await this.circuitBreaker.execute(async () => {
          // Add timeout to operation
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Database operation timeout')), timeout);
          });

          return await Promise.race([operation(), timeoutPromise]);
        });
      } catch (error) {
        // If circuit breaker is open or operation failed, handle accordingly
        if (error instanceof CircuitBreakerError) {
          logger.error(`[DB] Circuit breaker is OPEN. ${queueOnFailure ? 'Queuing operation.' : 'Operation failed.'}`);
          
          if (queueOnFailure) {
            return this.queueOperation(operation);
          }
        }

        // For other errors, retry with backoff if retryable
        if (this.isRetryableError(error)) {
          try {
            return await retryWithBackoff(
              () => this.circuitBreaker.execute(operation),
              { maxRetries: 3, baseDelay: 1000 },
              'DB'
            );
          } catch (retryError) {
            if (queueOnFailure) {
              return this.queueOperation(operation);
            }
            throw retryError;
          }
        }

        throw error;
      }
    }

    // DB is not available
    if (queueOnFailure) {
      logger.warn('[DB] Database unavailable, queuing operation');
      return this.queueOperation(operation);
    } else {
      throw new Error('Database is not available and queueOnFailure is false');
    }
  }

  /**
   * Queue operation for later execution
   */
  private queueOperation<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Check queue size
      if (this.operationQueue.length >= this.maxQueueSize) {
        logger.error(`[DB] Operation queue is full (${this.maxQueueSize}). Dropping operation.`);
        reject(new Error('Database operation queue is full'));
        return;
      }

      this.operationQueue.push({
        operation: operation as () => Promise<any>,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      });

      logger.warn(`[DB] Operation queued. Queue size: ${this.operationQueue.length}/${this.maxQueueSize}`);
    });
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    if (!this.isDatabaseAvailable()) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process operations in batches
      const batchSize = 10;
      const batch = this.operationQueue.splice(0, batchSize);

      for (const queuedOp of batch) {
        // Check if operation is too old
        const age = Date.now() - queuedOp.timestamp;
        if (age > this.maxQueuedOperationAge) {
          logger.warn(`[DB] Dropping queued operation (age: ${Math.round(age / 1000)}s)`);
          queuedOp.reject(new Error('Queued operation expired'));
          continue;
        }

        try {
          const result = await this.execute(queuedOp.operation, {
            queueOnFailure: false
          });
          queuedOp.resolve(result);
          logger.warn(`[DB] Successfully processed queued operation. Queue remaining: ${this.operationQueue.length}`);
        } catch (error) {
          queuedOp.retries++;
          
          // Re-queue if retries not exhausted
          if (queuedOp.retries < 3) {
            this.operationQueue.push(queuedOp);
            logger.warn(`[DB] Re-queuing failed operation (retry ${queuedOp.retries}/3)`);
          } else {
            logger.error(`[DB] Queued operation failed after ${queuedOp.retries} retries`);
            queuedOp.reject(error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    this.queueProcessorIntervalId = setInterval(() => {
      this.processQueue();
    }, this.queueProcessingInterval);
  }

  /**
   * Stop queue processor
   */
  stop(): void {
    if (this.queueProcessorIntervalId) {
      clearInterval(this.queueProcessorIntervalId);
      this.queueProcessorIntervalId = null;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return true;
    }

    // Timeout errors
    if (error.name === 'MongoTimeoutError') {
      return true;
    }

    // Transient errors
    if (error.code === 11000) { // Duplicate key (can retry with different data)
      return false; // Actually not retryable, but handled gracefully
    }

    // Network errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    maxSize: number;
    circuitBreakerState: CircuitState;
    connectionState: string;
  } {
    return {
      size: this.operationQueue.length,
      maxSize: this.maxQueueSize,
      circuitBreakerState: this.circuitBreaker.getState(),
      connectionState: this.connectionState
    };
  }

  /**
   * Clear operation queue (use with caution)
   */
  clearQueue(): void {
    const size = this.operationQueue.length;
    this.operationQueue.forEach(op => {
      op.reject(new Error('Operation queue cleared'));
    });
    this.operationQueue = [];
    logger.warn(`[DB] Cleared ${size} queued operations`);
  }
}

// Singleton instance
export const dbResilienceManager = new DatabaseResilienceManager();

