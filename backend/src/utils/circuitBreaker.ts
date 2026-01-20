import { logger } from './logger';

export enum CircuitState { CLOSED = 'CLOSED', OPEN = 'OPEN', HALF_OPEN = 'HALF_OPEN' }

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

interface Config {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  bucketCount: number;
  bucketDuration: number;
  requestTimeout?: number;
}

const DEFAULTS: Config = {
  failureThreshold: 5, successThreshold: 2, timeout: 60000,
  resetTimeout: 300000, bucketCount: 6, bucketDuration: 10000, requestTimeout: 30000
};

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private buckets: number[];
  private currentBucket = 0;
  private lastBucketTime = Date.now();
  private totalRequests = 0;
  private successes = 0;
  private openedAt = 0;
  private readonly config: Config;
  private readonly name: string;

  constructor(name: string, config: Partial<Config> = {}) {
    this.name = name;
    this.config = { ...DEFAULTS, ...config };
    this.buckets = new Array(this.config.bucketCount).fill(0);
  }

  async execute<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    this.rotateBuckets();
    if (this.state === CircuitState.OPEN && Date.now() - this.openedAt >= this.config.timeout) {
      this.transition(CircuitState.HALF_OPEN);
    }
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerError(`Circuit breaker is OPEN for ${this.name}`, CircuitState.OPEN);
    }
    this.totalRequests++;
    try {
      const result = timeout ?? this.config.requestTimeout
        ? await this.withTimeout(fn(), timeout ?? this.config.requestTimeout!)
        : await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
      promise.then(r => { clearTimeout(timer); resolve(r); }).catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  private rotateBuckets() {
    const elapsed = Date.now() - this.lastBucketTime;
    const rotations = Math.min(Math.floor(elapsed / this.config.bucketDuration), this.config.bucketCount);
    for (let i = 0; i < rotations; i++) {
      this.currentBucket = (this.currentBucket + 1) % this.config.bucketCount;
      this.buckets[this.currentBucket] = 0;
    }
    if (rotations > 0) this.lastBucketTime = Date.now() - (elapsed % this.config.bucketDuration);
  }

  getFailureCount() { return this.buckets.reduce((a, b) => a + b, 0); }
  isOpen() { return this.state === CircuitState.OPEN; }
  getState() { return this.state; }

  reset() {
    this.state = CircuitState.CLOSED;
    this.buckets.fill(0);
    this.successes = this.totalRequests = this.openedAt = 0;
    logger.warn(`[CIRCUIT] ${this.name} manually reset`);
  }

  private transition(to: CircuitState) {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    this.successes = 0;
    if (to === CircuitState.OPEN) {
      this.openedAt = Date.now();
      logger.error(`[CIRCUIT] ${this.name}: ${from} → OPEN (${this.getFailureCount()} failures)`);
    } else if (to === CircuitState.HALF_OPEN) {
      logger.warn(`[CIRCUIT] ${this.name}: ${from} → HALF_OPEN`);
    } else {
      this.buckets.fill(0);
      this.totalRequests = 0;
      logger.warn(`[CIRCUIT] ${this.name}: ${from} → CLOSED (recovered)`);
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) this.transition(CircuitState.CLOSED);
    }
  }

  private onFailure(error?: unknown) {
    if (!this.shouldCount(error)) return;
    this.buckets[this.currentBucket] = (this.buckets[this.currentBucket] ?? 0) + 1;
    if (this.state === CircuitState.HALF_OPEN) {
      this.transition(CircuitState.OPEN);
    } else if (this.getFailureCount() >= this.config.failureThreshold) {
      this.transition(CircuitState.OPEN);
    }
  }

  private shouldCount(error: unknown): boolean {
    if (!error || typeof error !== 'object') return true;
    const e = error as any;
    const status = e.response?.status;
    if ([401, 403, 404, 429].includes(status) || e.code === 11000) return false;
    return true;
  }

  getStatus() {
    const failures = this.getFailureCount();
    return {
      name: this.name, state: this.state, failures,
      failureRate: this.totalRequests > 0 ? Math.round((failures / this.totalRequests) * 100) : 0,
      successes: this.successes, openedAt: this.openedAt || null
    };
  }
}
