import { logger } from './logger';
import mongoose from 'mongoose';
import { CircuitBreaker, CircuitBreakerError, CircuitState } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';

interface QueuedOperation<T = any> {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export class DatabaseResilienceManager {
  private circuitBreaker: CircuitBreaker;
  private operationQueue: QueuedOperation[] = [];
  private isProcessingQueue = false;
  private readonly maxQueueSize = 1000;
  private readonly maxQueuedOperationAge = 3600000; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;
  private connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  constructor() {
    this.circuitBreaker = new CircuitBreaker('database', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000
    });
    this.setupConnectionMonitoring();
    this.startCleanupInterval();
  }

  private setupConnectionMonitoring(): void {
    if (mongoose.connection.readyState === 1) this.connectionState = 'connected';

    mongoose.connection.on('connected', () => {
      this.connectionState = 'connected';
      logger.warn('[DB] MongoDB connection established');
      this.triggerProcessing();
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
    const { queueOnFailure = true, timeout = 30000 } = options;

    if (this.isDatabaseAvailable()) {
      try {
        // Use Titan Grade CircuitBreaker with native timeout support
        return await this.circuitBreaker.execute(operation, timeout);
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          logger.error(`[DB] Circuit breaker is OPEN. ${queueOnFailure ? 'Queuing operation.' : 'Operation failed.'}`);
          if (queueOnFailure) return this.queueOperation(operation);
        } else if (this.isRetryableError(error)) {
          try {
            return await retryWithBackoff(
              () => this.circuitBreaker.execute(operation, timeout),
              { maxRetries: 3, baseDelay: 1000 },
              'DB'
            );
          } catch (retryError) {
            if (queueOnFailure) return this.queueOperation(operation);
            throw retryError;
          }
        }
        throw error;
      }
    }

    if (queueOnFailure) {
      logger.warn('[DB] Database unavailable, queuing operation');
      return this.queueOperation(operation);
    }
    throw new Error('Database is not available and queueOnFailure is false');
  }

  private queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.operationQueue.length >= this.maxQueueSize) {
        logger.error(`[DB] Operation queue is full (${this.maxQueueSize}). Dropping operation.`);
        reject(new Error('Database operation queue is full'));
        return;
      }

      this.operationQueue.push({
        operation,
        resolve,
        reject,
        timestamp: Date.now()
      });

      logger.warn(`[DB] Operation queued. Queue size: ${this.operationQueue.length}/${this.maxQueueSize}`);

      // Attempt to process immediately if connection just came back
      if (this.isDatabaseAvailable()) this.triggerProcessing();
    });
  }

  private triggerProcessing(): void {
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0 || !this.isDatabaseAvailable()) return;

    this.isProcessingQueue = true;
    try {
      while (this.operationQueue.length > 0 && this.isDatabaseAvailable()) {
        const op = this.operationQueue.shift();
        if (!op) break;

        // Check age before processing
        if (Date.now() - op.timestamp > this.maxQueuedOperationAge) {
          op.reject(new Error('Queued operation expired'));
          continue;
        }

        try {
          // Don't queue again on failure to avoid infinite loops
          const result = await this.execute(op.operation, { queueOnFailure: false });
          op.resolve(result);
          logger.warn(`[DB] Processed queued op. Remaining: ${this.operationQueue.length}`);
        } catch (error) {
          logger.error('[DB] Queued operation failed during processing');
          op.reject(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
      // If items remain, trigger again (maybe partial batch processed or connection flicker)
      if (this.operationQueue.length > 0 && this.isDatabaseAvailable()) {
        this.triggerProcessing();
      }
    }
  }

  private startCleanupInterval(): void {
    // Janitor loop: runs every 60s independently of connection state
    this.cleanupInterval = setInterval(() => {
      if (this.operationQueue.length === 0) return;

      const now = Date.now();
      const initialSize = this.operationQueue.length;

      // Filter in place is tricky, better to build new array or iterate backwards
      // For simplicity/safety, we'll iterate and reject expired ones
      let validOps: QueuedOperation[] = [];

      for (const op of this.operationQueue) {
        if (now - op.timestamp > this.maxQueuedOperationAge) {
          op.reject(new Error('Queued operation expired'));
        } else {
          validOps.push(op);
        }
      }

      if (validOps.length < initialSize) {
        this.operationQueue = validOps;
        logger.warn(`[DB] Cleaned up ${initialSize - validOps.length} expired operations`);
      }
    }, 60000);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') return true;
    if (error.name === 'MongoTimeoutError') return true;
    if (error.code === 11000) return false;
    if (error.message?.includes('connection') || error.message?.includes('timeout')) return true;
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
    this.operationQueue.forEach(op => op.reject(new Error('Operation queue cleared')));
    this.operationQueue = [];
    logger.warn(`[DB] Cleared ${size} queued operations`);
  }
}

export const dbResilienceManager = new DatabaseResilienceManager();
