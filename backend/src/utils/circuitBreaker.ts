import { logger } from './logger';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Failing, requests fail immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered, allows limited requests
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;       // Number of successes in HALF_OPEN to close
  timeout: number;                // Time in ms before attempting HALF_OPEN
  resetTimeout: number;           // Time in ms before resetting failure count
  monitoringPeriod: number;      // Time window for tracking failures
}

/**
 * Default Circuit Breaker Configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,           // Open after 5 failures
  successThreshold: 2,           // Close after 2 successes in HALF_OPEN
  timeout: 60000,                // Wait 60s before attempting HALF_OPEN
  resetTimeout: 300000,         // Reset failure count after 5 minutes
  monitoringPeriod: 60000       // Track failures in 60s window
};

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker - Prevents cascading failures by stopping requests to failing services
 * 
 * Root Implementation:
 * - Tracks failures in a time window
 * - Automatically opens circuit after threshold failures
 * - Tests recovery in HALF_OPEN state
 * - Closes circuit after successful recovery
 * - Prevents infinite retry loops
 */
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

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.updateState();

    // Handle based on current state
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

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count in current monitoring period
   */
  getFailureCount(): number {
    this.cleanOldFailures();
    return this.failures.length;
  }

  /**
   * Manually reset circuit breaker (for recovery scenarios)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
    this.openedAt = 0;
    logger.warn(`[CIRCUIT] ${this.name} manually reset`);
  }

  /**
   * Update circuit breaker state based on current conditions
   */
  private updateState(): void {
    const now = Date.now();

    // Clean old failures
    this.cleanOldFailures();

    // Transition from OPEN to HALF_OPEN after timeout
    if (this.state === CircuitState.OPEN) {
      if (now - this.openedAt >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        logger.warn(`[CIRCUIT] ${this.name} transitioning to HALF_OPEN (testing recovery)`);
      }
    }

    // Transition from HALF_OPEN to CLOSED after success threshold
    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
      this.state = CircuitState.CLOSED;
      this.failures = [];
      logger.warn(`[CIRCUIT] ${this.name} transitioning to CLOSED (recovered)`);
    }

    // Transition from CLOSED to OPEN if failure threshold exceeded
    if (this.state === CircuitState.CLOSED && this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = now;
      this.successes = 0;
      logger.error(`[CIRCUIT] ${this.name} transitioning to OPEN (${this.failures.length} failures)`);
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count if we've had a long period of success
      const now = Date.now();
      if (this.lastFailureTime > 0 && now - this.lastFailureTime > this.config.resetTimeout) {
        this.failures = [];
        this.lastFailureTime = 0;
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    // If in HALF_OPEN, immediately go back to OPEN
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.openedAt = now;
      this.successes = 0;
      logger.error(`[CIRCUIT] ${this.name} failed in HALF_OPEN, returning to OPEN`);
    }

    // Clean old failures
    this.cleanOldFailures();
  }

  /**
   * Check if error should count towards circuit breaker failures
   * 401 errors (invalid tokens) shouldn't open circuit - they should trigger token rotation
   */
  shouldCountAsFailure(error: any): boolean {
    // Don't count 401 errors as circuit breaker failures
    // These indicate invalid tokens and should trigger token rotation instead
    if (error?.response?.status === 401) {
      return false;
    }
    return true;
  }

  /**
   * Remove failures outside monitoring period
   */
  private cleanOldFailures(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    this.failures = this.failures.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Get status for monitoring
   */
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

