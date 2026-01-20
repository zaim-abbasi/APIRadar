import { logger } from './logger';

export class ConcurrencyManager {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private max = 5) { }

  async execute<T>(fn: () => Promise<T>, opts: { priority?: number; timeoutMs?: number } = {}): Promise<T> {
    if (this.active >= this.max) await new Promise<void>(r => this.insert(r, opts.priority || 0));
    this.active++;
    try {
      if (opts.timeoutMs) return await Promise.race([fn(), new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), opts.timeoutMs))]);
      return await fn();
    } finally {
      this.active--;
      this.process();
    }
  }

  private insert(resolve: () => void, priority: number) {
    // Simple priority queue insertion
    const idx = this.queue.findIndex((_, i) => (this.queue[i] as any).priority < priority);
    const item = Object.assign(resolve, { priority });
    idx === -1 ? this.queue.push(item) : this.queue.splice(idx, 0, item);
  }

  private process() {
    if (this.queue.length && this.active < this.max) this.queue.shift()!();
  }

  executeAll<T>(tasks: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(tasks.map(t => this.execute(t)));
  }

  getStatus() { return { active: this.active, queued: this.queue.length, max: this.max }; }
  clearQueue() { this.queue = []; logger.warn('[CONCURRENCY] Queue cleared'); }
}
