import { logger } from './logger';
import mongoose from 'mongoose';
import { CircuitBreaker, CircuitBreakerError } from './circuitBreaker';

interface Op<T> { fn: () => Promise<T>; resolve: (v: T) => void; reject: (e: any) => void; ts: number; }

export class DatabaseResilienceManager {
  private cb = new CircuitBreaker('database', { failureThreshold: 5, timeout: 30000 });
  private queue: Op<any>[] = [];
  private processing = false;

  constructor() {
    mongoose.connection.on('connected', () => { logger.warn('[DB] Connected'); this.process(); });
    mongoose.connection.on('disconnected', () => logger.error('[DB] Disconnected'));
    setInterval(() => this.cleanup(), 60000).unref();
  }

  async execute<T>(fn: () => Promise<T>, opts: { queue?: boolean; timeout?: number } = {}): Promise<T> {
    const { queue = true, timeout = 30000 } = opts;
    if (mongoose.connection.readyState === 1 && !this.cb.isOpen()) {
      try { return await this.cb.execute(fn, timeout); }
      catch (e) {
        if (!queue || (!this.retryable(e) && !(e instanceof CircuitBreakerError))) throw e;
      }
    }
    if (!queue) throw new Error('DB unavailable');
    return new Promise((resolve, reject) => {
      if (this.queue.length >= 1000) return reject(new Error('Queue full'));
      this.queue.push({ fn, resolve, reject, ts: Date.now() });
      logger.warn(`[DB] Queued (${this.queue.length})`);
    });
  }

  private async process() {
    if (this.processing || !this.queue.length || mongoose.connection.readyState !== 1) return;
    this.processing = true;
    while (this.queue.length && mongoose.connection.readyState === 1) {
      const { fn, resolve, reject, ts } = this.queue.shift()!;
      if (Date.now() - ts > 3600000) { reject(new Error('Expired')); continue; }
      try { resolve(await this.execute(fn, { queue: false })); } catch (e) { reject(e); }
    }
    this.processing = false;
  }

  private cleanup() {
    const s = this.queue.length;
    this.queue = this.queue.filter(op => Date.now() - op.ts <= 3600000);
    if (s > this.queue.length) logger.warn(`[DB] Cleaned ${s - this.queue.length} expired ops`);
  }

  private retryable(e: any): boolean {
    return ['MongoNetworkError', 'MongoTimeoutError'].includes(e.name) || e.message?.includes('connection') || e.message?.includes('timeout');
  }
}

export const dbResilienceManager = new DatabaseResilienceManager();
