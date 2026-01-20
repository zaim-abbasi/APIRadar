import { logger } from './logger';
import mongoose from 'mongoose';
import { CircuitBreaker, CircuitBreakerError } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';

interface QueuedOp<T = any> {
  op: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: any) => void;
  ts: number;
}

export class DatabaseResilienceManager {
  private cb = new CircuitBreaker('database', { failureThreshold: 5, successThreshold: 2, timeout: 30000, resetTimeout: 60000 });
  private queue: QueuedOp[] = [];
  private processing = false;
  private readonly maxQueue = 1000;
  private readonly maxAge = 3600000;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private connState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  constructor() {
    if (mongoose.connection.readyState === 1) this.connState = 'connected';
    mongoose.connection.on('connected', () => { this.connState = 'connected'; logger.warn('[DB] MongoDB connection established'); this.processQueue(); });
    mongoose.connection.on('disconnected', () => { this.connState = 'disconnected'; logger.error('[DB] MongoDB connection lost'); });
    mongoose.connection.on('connecting', () => { this.connState = 'connecting'; logger.warn('[DB] MongoDB connecting...'); });
    mongoose.connection.on('error', e => logger.error(`[DB] MongoDB connection error: ${e.message}`));
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  private available() { return mongoose.connection.readyState === 1 && !this.cb.isOpen(); }

  async execute<T>(op: () => Promise<T>, opts: { queueOnFailure?: boolean; timeout?: number } = {}): Promise<T> {
    const { queueOnFailure = true, timeout = 30000 } = opts;
    if (this.available()) {
      try {
        return await this.cb.execute(op, timeout);
      } catch (e) {
        if (e instanceof CircuitBreakerError) {
          logger.error(`[DB] Circuit breaker is OPEN. ${queueOnFailure ? 'Queuing.' : 'Failed.'}`);
          if (queueOnFailure) return this.enqueue(op);
        } else if (this.retryable(e)) {
          try { return await retryWithBackoff(() => this.cb.execute(op, timeout), { maxRetries: 3, baseDelay: 1000 }, 'DB'); }
          catch { if (queueOnFailure) return this.enqueue(op); throw e; }
        }
        throw e;
      }
    }
    if (queueOnFailure) { logger.warn('[DB] Database unavailable, queuing'); return this.enqueue(op); }
    throw new Error('Database unavailable');
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueue) { logger.error(`[DB] Queue full (${this.maxQueue})`); reject(new Error('Queue full')); return; }
      this.queue.push({ op, resolve, reject, ts: Date.now() });
      logger.warn(`[DB] Queued. Size: ${this.queue.length}/${this.maxQueue}`);
      if (this.available()) this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || !this.queue.length || !this.available()) return;
    this.processing = true;
    try {
      while (this.queue.length && this.available()) {
        const item = this.queue.shift()!;
        if (Date.now() - item.ts > this.maxAge) { item.reject(new Error('Expired')); continue; }
        try {
          item.resolve(await this.execute(item.op, { queueOnFailure: false }));
          logger.warn(`[DB] Processed. Remaining: ${this.queue.length}`);
        } catch (e) { item.reject(e); }
      }
    } finally {
      this.processing = false;
      if (this.queue.length && this.available()) void this.processQueue();
    }
  }

  private cleanup() {
    if (!this.queue.length) return;
    const now = Date.now();
    const before = this.queue.length;
    this.queue = this.queue.filter(o => { if (now - o.ts > this.maxAge) { o.reject(new Error('Expired')); return false; } return true; });
    if (this.queue.length < before) logger.warn(`[DB] Cleaned ${before - this.queue.length} expired ops`);
  }

  private retryable(e: any): boolean {
    if (['MongoNetworkError', 'MongoServerSelectionError', 'MongoTimeoutError'].includes(e.name)) return true;
    if (e.code === 11000) return false;
    return e.message?.includes('connection') || e.message?.includes('timeout') || false;
  }

  stop() { if (this.cleanupTimer) { clearInterval(this.cleanupTimer); this.cleanupTimer = null; } }
  getQueueStatus() { return { size: this.queue.length, maxSize: this.maxQueue, circuitBreakerState: this.cb.getState(), connectionState: this.connState }; }
  clearQueue() { const n = this.queue.length; this.queue.forEach(o => o.reject(new Error('Cleared'))); this.queue = []; logger.warn(`[DB] Cleared ${n} ops`); }
}

export const dbResilienceManager = new DatabaseResilienceManager();
