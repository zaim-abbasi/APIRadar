import { logger } from './logger';

interface QueuedTask {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  priority: number;
  timeoutMs: number | undefined;
}

export class ConcurrencyManager {
  private active = 0;
  private readonly max: number;
  private readonly queue: QueuedTask[] = [];
  private drainResolvers: Array<() => void> = [];

  constructor(maxConcurrency = 5) { this.max = maxConcurrency; }

  async execute<T>(task: () => Promise<T>, options: { priority?: number; timeoutMs?: number } = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueuedTask = {
        task: task as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject, priority: options.priority ?? 0, timeoutMs: options.timeoutMs
      };
      this.insert(item);
      queueMicrotask(() => this.process());
    });
  }

  private insert(item: QueuedTask) {
    if (item.priority === 0 || !this.queue.length) { this.queue.push(item); return; }
    const i = this.queue.findIndex(q => q.priority < item.priority);
    i === -1 ? this.queue.push(item) : this.queue.splice(i, 0, item);
  }

  private process() {
    while (this.queue.length && this.active < this.max) {
      const item = this.queue.shift()!;
      this.active++;
      const p = item.timeoutMs ? this.withTimeout(item.task(), item.timeoutMs) : item.task();
      p.then(r => item.resolve(r)).catch(e => item.reject(e)).finally(() => {
        this.active--;
        if (!this.active && !this.queue.length) {
          this.drainResolvers.forEach(r => r());
          this.drainResolvers = [];
        }
        queueMicrotask(() => this.process());
      });
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Task timeout after ${ms}ms`)), ms);
      promise.then(r => { clearTimeout(timer); resolve(r); }).catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  executeAll<T>(tasks: Array<() => Promise<T>>): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(tasks.map(t => this.execute(t)));
  }

  getStatus() {
    return { activeTasks: this.active, queuedTasks: this.queue.length, maxConcurrency: this.max, utilization: Math.round((this.active / this.max) * 100) };
  }

  waitForCompletion(): Promise<void> {
    if (!this.active && !this.queue.length) return Promise.resolve();
    return new Promise(r => this.drainResolvers.push(r));
  }

  clearQueue() {
    const size = this.queue.length;
    this.queue.forEach(item => item.reject(new Error('Queue cleared')));
    this.queue.length = 0;
    if (size) logger.warn(`[CONCURRENCY] Cleared ${size} queued tasks`);
  }
}
