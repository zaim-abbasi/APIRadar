import { logger } from './logger';

interface QueuedTask {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  priority: number;
  timeoutMs?: number;
}

export class ConcurrencyManager {
  private activeTasks = 0;
  private readonly maxConcurrency: number;
  private readonly queue: QueuedTask[] = [];
  private drainResolvers: Array<() => void> = [];

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T>(
    task: () => Promise<T>,
    options: { priority?: number; timeoutMs?: number } = {}
  ): Promise<T> {
    const { priority = 0, timeoutMs } = options;

    return new Promise<T>((resolve, reject) => {
      const item: QueuedTask = {
        task: task as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
        ...(timeoutMs !== undefined && { timeoutMs })
      };
      this.insertByPriority(item);
      this.scheduleProcessing();
    });
  }

  private insertByPriority(item: QueuedTask): void {
    if (item.priority === 0 || this.queue.length === 0) {
      this.queue.push(item);
      return;
    }
    const insertIndex = this.queue.findIndex(q => q.priority < item.priority);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }
  }

  private scheduleProcessing(): void {
    queueMicrotask(() => this.processQueue());
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.activeTasks < this.maxConcurrency) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeTasks++;
      this.runTask(item);
    }
  }

  private runTask(item: QueuedTask): void {
    const taskPromise = item.task();

    const wrappedPromise = item.timeoutMs
      ? this.withTimeout(taskPromise, item.timeoutMs)
      : taskPromise;

    wrappedPromise
      .then(result => item.resolve(result))
      .catch(error => item.reject(error))
      .finally(() => {
        this.activeTasks--;
        this.checkDrain();
        this.scheduleProcessing();
      });
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Task timeout after ${ms}ms`)), ms);
      promise
        .then(result => { clearTimeout(timer); resolve(result); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  private checkDrain(): void {
    if (this.activeTasks === 0 && this.queue.length === 0 && this.drainResolvers.length > 0) {
      this.drainResolvers.forEach(resolve => resolve());
      this.drainResolvers = [];
    }
  }

  async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(tasks.map(task => this.execute(task)));
  }

  getStatus(): {
    activeTasks: number;
    queuedTasks: number;
    maxConcurrency: number;
    utilization: number;
  } {
    return {
      activeTasks: this.activeTasks,
      queuedTasks: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      utilization: Math.round((this.activeTasks / this.maxConcurrency) * 100)
    };
  }

  waitForCompletion(): Promise<void> {
    if (this.activeTasks === 0 && this.queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => this.drainResolvers.push(resolve));
  }

  clearQueue(): void {
    const size = this.queue.length;
    this.queue.forEach(item => item.reject(new Error('Queue cleared')));
    this.queue.length = 0;
    if (size > 0) logger.warn(`[CONCURRENCY] Cleared ${size} queued tasks`);
  }
}
