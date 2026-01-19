import { logger } from './logger';
import mongoose from 'mongoose';
import { CircuitBreaker, CircuitBreakerError, CircuitState } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';

interface QueuedOperation {
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
}

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
    this.circuitBreaker = new CircuitBreaker('database', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000
    });
    this.setupConnectionMonitoring();
    this.startQueueProcessor();
  }

  private setupConnectionMonitoring(): void {
    if (mongoose.connection.readyState === 1) {
      this.connectionState = 'connected';
    }

    mongoose.connection.on('connected', () => {
      this.connectionState = 'connected';
      logger.warn('[DB] MongoDB connection established');
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

  private isDatabaseAvailable(): boolean {
    return mongoose.connection.readyState === 1 && !this.circuitBreaker.isOpen();
  }

  async execute<T>(
    operation: () => Promise<T>,
    options: {
      queueOnFailure?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const {
      queueOnFailure = true,
      timeout = 30000
    } = options;

    if (this.isDatabaseAvailable()) {
      try {
        return await this.circuitBreaker.execute(async () => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Database operation timeout')), timeout);
          });

          return await Promise.race([operation(), timeoutPromise]);
        });
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          logger.error(`[DB] Circuit breaker is OPEN. ${queueOnFailure ? 'Queuing operation.' : 'Operation failed.'}`);

          if (queueOnFailure) {
            return this.queueOperation(operation);
          }
        }
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
    if (queueOnFailure) {
      logger.warn('[DB] Database unavailable, queuing operation');
      return this.queueOperation(operation);
    } else {
      throw new Error('Database is not available and queueOnFailure is false');
    }
  }

  private queueOperation<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    if (!this.isDatabaseAvailable()) {
      return;
    }

    this.isProcessingQueue = true;
    try {
      const batchSize = 10;
      const batch = this.operationQueue.splice(0, batchSize);
      for (const queuedOp of batch) {
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

  private startQueueProcessor(): void {
    this.queueProcessorIntervalId = setInterval(() => {
      this.processQueue();
    }, this.queueProcessingInterval);
  }

  stop(): void {
    if (this.queueProcessorIntervalId) {
      clearInterval(this.queueProcessorIntervalId);
      this.queueProcessorIntervalId = null;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return true;
    }
    if (error.name === 'MongoTimeoutError') {
      return true;
    }
    if (error.code === 11000) {
      return false;
    }
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

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

  clearQueue(): void {
    const size = this.operationQueue.length;
    this.operationQueue.forEach(op => {
      op.reject(new Error('Operation queue cleared'));
    });
    this.operationQueue = [];
    logger.warn(`[DB] Cleared ${size} queued operations`);
  }
}

export const dbResilienceManager = new DatabaseResilienceManager();

