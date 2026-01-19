import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  bucketCount: number;
  bucketDuration: number;
  requestTimeout?: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 300000,
  bucketCount: 6,
  bucketDuration: 10000,
  requestTimeout: 30000
};

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private buckets: number[];
  private currentBucket: number = 0;
  private lastBucketTime: number = 0;
  private totalRequests: number = 0;
  private successes: number = 0;
  private openedAt: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buckets = new Array(this.config.bucketCount).fill(0);
    this.lastBucketTime = Date.now();
  }

  async execute<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    this.rotateBuckets();
    this.checkOpenState();

    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for ${this.name}`,
        CircuitState.OPEN
      );
    }

    this.totalRequests++;
    const effectiveTimeout = timeout ?? this.config.requestTimeout;

    try {
      const result = effectiveTimeout
        ? await this.withTimeout(fn(), effectiveTimeout)
        : await fn();
      this.onSuccess();
      this.updateState();
      return result;
    } catch (error) {
      this.onFailure(error);
      this.updateState();
      throw error;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout after ${ms}ms`));
      }, ms);
      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private rotateBuckets(): void {
    const now = Date.now();
    const elapsed = now - this.lastBucketTime;
    const bucketsToRotate = Math.floor(elapsed / this.config.bucketDuration);

    if (bucketsToRotate > 0) {
      const rotations = Math.min(bucketsToRotate, this.config.bucketCount);
      for (let i = 0; i < rotations; i++) {
        this.currentBucket = (this.currentBucket + 1) % this.config.bucketCount;
        this.buckets[this.currentBucket] = 0;
      }
      this.lastBucketTime = now - (elapsed % this.config.bucketDuration);
    }
  }

  getFailureCount(): number {
    return this.buckets.reduce((sum, count) => sum + count, 0);
  }

  private transitionTo(newState: CircuitState): void {
    const now = Date.now();
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.OPEN) {
      this.openedAt = now;
      this.successes = 0;
      logger.error(`[CIRCUIT] ${this.name}: ${oldState} → OPEN (${this.getFailureCount()} failures)`);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
      logger.warn(`[CIRCUIT] ${this.name}: ${oldState} → HALF_OPEN`);
    } else if (newState === CircuitState.CLOSED) {
      this.buckets.fill(0);
      this.totalRequests = 0;
      logger.warn(`[CIRCUIT] ${this.name}: ${oldState} → CLOSED (recovered)`);
    }
  }

  private checkOpenState(): void {
    if (this.state === CircuitState.OPEN && Date.now() - this.openedAt >= this.config.timeout) {
      this.transitionTo(CircuitState.HALF_OPEN);
    }
  }

  private updateState(): void {
    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
      this.transitionTo(CircuitState.CLOSED);
    } else if (this.state === CircuitState.CLOSED && this.getFailureCount() >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
    }
  }

  private onFailure(error?: unknown): void {
    if (!this.shouldCountAsFailure(error)) return;

    this.buckets[this.currentBucket] = (this.buckets[this.currentBucket] ?? 0) + 1;

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private shouldCountAsFailure(error: unknown): boolean {
    if (!error || typeof error !== 'object') return true;

    const err = error as { response?: { status?: number }; code?: string | number; message?: string };

    if (err.response?.status === 401 || err.response?.status === 403) return false;
    if (err.response?.status === 404) return false;
    if (err.response?.status === 429) return false;
    if (err.code === 11000) return false;

    if (err.message?.includes('timeout')) return true;
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') return true;
    if (err.response?.status && err.response.status >= 500) return true;

    return true;
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.buckets.fill(0);
    this.successes = 0;
    this.totalRequests = 0;
    this.openedAt = 0;
    logger.warn(`[CIRCUIT] ${this.name} manually reset`);
  }

  getStatus(): {
    name: string;
    state: CircuitState;
    failures: number;
    failureRate: number;
    successes: number;
    openedAt: number | null;
  } {
    const failures = this.getFailureCount();
    const failureRate = this.totalRequests > 0 ? Math.round((failures / this.totalRequests) * 100) : 0;

    return {
      name: this.name,
      state: this.state,
      failures,
      failureRate,
      successes: this.successes,
      openedAt: this.openedAt || null
    };
  }
}
