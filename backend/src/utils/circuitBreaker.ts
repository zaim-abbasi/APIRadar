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
  monitoringPeriod: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 300000,
  monitoringPeriod: 60000
};

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = []; // Timestamps of failures
  private successes: number = 0;    // Success count in HALF_OPEN
  private lastFailureTime: number = 0;
  private openedAt: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();
    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for ${this.name}. Service is failing.`,
        CircuitState.OPEN
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    this.cleanOldFailures();
    return this.failures.length;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
    this.openedAt = 0;
    logger.warn(`[CIRCUIT] ${this.name} manually reset`);
  }

  private updateState(): void {
    const now = Date.now();
    this.cleanOldFailures();
    if (this.state === CircuitState.OPEN) {
      if (now - this.openedAt >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        logger.warn(`[CIRCUIT] ${this.name} transitioning to HALF_OPEN (testing recovery)`);
      }
    }
    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
      this.state = CircuitState.CLOSED;
      this.failures = [];
      logger.warn(`[CIRCUIT] ${this.name} transitioning to CLOSED (recovered)`);
    }
    if (this.state === CircuitState.CLOSED && this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = now;
      this.successes = 0;
      logger.error(`[CIRCUIT] ${this.name} transitioning to OPEN (${this.failures.length} failures)`);
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
    } else if (this.state === CircuitState.CLOSED) {
      const now = Date.now();
      if (this.lastFailureTime > 0 && now - this.lastFailureTime > this.config.resetTimeout) {
        this.failures = [];
        this.lastFailureTime = 0;
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.openedAt = now;
      this.successes = 0;
      logger.error(`[CIRCUIT] ${this.name} failed in HALF_OPEN, returning to OPEN`);
    }
    this.cleanOldFailures();
  }

  shouldCountAsFailure(error: any): boolean {
    if (error?.response?.status === 401) {
      return false;
    }
    return true;
  }

  private cleanOldFailures(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    this.failures = this.failures.filter(timestamp => timestamp > cutoff);
  }

  getStatus(): {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    openedAt: number | null;
  } {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      openedAt: this.openedAt || null
    };
  }
}

