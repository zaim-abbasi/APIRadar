import { logger } from './logger';

export class ConcurrencyManager {
  private activeTasks = 0;
  private readonly maxConcurrency: number;
  private readonly queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeTasks < this.maxConcurrency) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeTasks++;
      this.runTask(item).finally(() => {
        this.activeTasks--;
        this.processQueue();
      });
    }

    this.isProcessing = false;
  }

  private async runTask<T>(item: {
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }): Promise<void> {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }

  async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results = await Promise.allSettled(
      tasks.map(task => this.execute(task))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.warn(`[CONCURRENCY] Task ${index} failed: ${result.reason}`);
        throw result.reason;
      }
    });
  }

  getStatus(): {
    activeTasks: number;
    queuedTasks: number;
    maxConcurrency: number;
    utilization: number; // Percentage
  } {
    return {
      activeTasks: this.activeTasks,
      queuedTasks: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      utilization: (this.activeTasks / this.maxConcurrency) * 100
    };
  }

  async waitForCompletion(): Promise<void> {
    while (this.activeTasks > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  clearQueue(): void {
    const size = this.queue.length;
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue.length = 0;
    logger.warn(`[CONCURRENCY] Cleared ${size} queued tasks`);
  }
}

