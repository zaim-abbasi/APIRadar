import { logger } from './logger';

/**
 * Fatal Error Recovery Configuration
 */
export interface FatalRecoveryConfig {
  maxRestartAttempts: number;      // Max times to restart after fatal error
  restartBackoffBase: number;        // Base delay for restart backoff (ms)
  restartBackoffMax: number;        // Max delay for restart backoff (ms)
  fatalErrorWindow: number;         // Time window to track fatal errors (ms)
  maxFatalErrorsInWindow: number;  // Max fatal errors before giving up
  statePreservationEnabled: boolean; // Whether to preserve state on fatal errors
}

/**
 * Default Fatal Recovery Configuration
 */
const DEFAULT_CONFIG: FatalRecoveryConfig = {
  maxRestartAttempts: 5,
  restartBackoffBase: 10000,       // Start with 10 seconds
  restartBackoffMax: 300000,        // Max 5 minutes
  fatalErrorWindow: 3600000,       // 1 hour window
  maxFatalErrorsInWindow: 10,       // Max 10 fatal errors per hour
  statePreservationEnabled: true
};

/**
 * Fatal Error Tracker
 */
class FatalErrorTracker {
  private fatalErrors: number[] = [];
  private readonly config: FatalRecoveryConfig;

  constructor(config: FatalRecoveryConfig) {
    this.config = config;
  }

  /**
   * Record a fatal error
   */
  recordFatalError(): void {
    const now = Date.now();
    this.fatalErrors.push(now);
    this.cleanOldErrors();
  }

  /**
   * Check if we should stop trying (too many fatal errors)
   */
  shouldStop(): boolean {
    this.cleanOldErrors();
    return this.fatalErrors.length >= this.config.maxFatalErrorsInWindow;
  }

  /**
   * Get fatal error count in window
   */
  getFatalErrorCount(): number {
    this.cleanOldErrors();
    return this.fatalErrors.length;
  }

  /**
   * Clean errors outside the window
   */
  private cleanOldErrors(): void {
    const now = Date.now();
    const cutoff = now - this.config.fatalErrorWindow;
    this.fatalErrors = this.fatalErrors.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Reset error tracking
   */
  reset(): void {
    this.fatalErrors = [];
  }
}

/**
 * Fatal Error Recovery Manager
 * 
 * Root Implementation:
 * - Tracks fatal errors in time window
 * - Prevents infinite restart loops
 * - Exponential backoff for restarts
 * - State preservation on fatal errors
 * - Alerting when fatal error threshold exceeded
 */
export class FatalErrorRecoveryManager {
  private restartAttempts = 0;
  private fatalErrorTracker: FatalErrorTracker;
  private readonly config: FatalRecoveryConfig;
  private lastFatalError: Error | null = null;
  private lastFatalErrorTime: number = 0;

  constructor(config: Partial<FatalRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fatalErrorTracker = new FatalErrorTracker(this.config);
  }

  /**
   * Handle fatal error with recovery
   */
  async handleFatalError(
    error: Error,
    recoveryFn: () => Promise<void>,
    statePreservationFn?: () => Promise<void>
  ): Promise<void> {
    this.lastFatalError = error;
    this.lastFatalErrorTime = Date.now();
    this.fatalErrorTracker.recordFatalError();

    // Check if we should stop trying
    if (this.fatalErrorTracker.shouldStop()) {
      logger.error(
        `[FATAL] Too many fatal errors (${this.fatalErrorTracker.getFatalErrorCount()}) in window. ` +
        `Stopping recovery attempts. Last error: ${error.message}`
      );
      throw new Error(
        `Fatal error recovery exhausted. ${this.fatalErrorTracker.getFatalErrorCount()} ` +
        `fatal errors in ${this.config.fatalErrorWindow / 1000}s window. Last error: ${error.message}`
      );
    }

    // Check if we've exceeded max restart attempts
    if (this.restartAttempts >= this.config.maxRestartAttempts) {
      logger.error(
        `[FATAL] Max restart attempts (${this.config.maxRestartAttempts}) exceeded. ` +
        `Last error: ${error.message}`
      );
      throw new Error(
        `Fatal error recovery exhausted. ${this.restartAttempts} restart attempts. ` +
        `Last error: ${error.message}`
      );
    }

    // Preserve state if enabled
    if (this.config.statePreservationEnabled && statePreservationFn) {
      try {
        await statePreservationFn();
        logger.warn('[FATAL] State preserved before recovery attempt');
      } catch (stateError) {
        logger.error(`[FATAL] Failed to preserve state: ${stateError instanceof Error ? stateError.message : String(stateError)}`);
      }
    }

    // Calculate restart delay with exponential backoff
    const delay = this.calculateRestartDelay();
    const delaySeconds = (delay / 1000).toFixed(2);

    logger.error(
      `[FATAL] Fatal error encountered (attempt ${this.restartAttempts + 1}/${this.config.maxRestartAttempts}). ` +
      `Restarting in ${delaySeconds}s. Error: ${error.message}\n${error.stack}`
    );

    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, delay));

    // Increment restart attempts
    this.restartAttempts++;

    // Attempt recovery
    try {
      await recoveryFn();
      // Success - reset restart attempts
      this.restartAttempts = 0;
      logger.warn(`[FATAL] Recovery successful after ${this.restartAttempts} attempts`);
    } catch (recoveryError) {
      // Recovery failed - will be handled by next call
      logger.error(
        `[FATAL] Recovery attempt ${this.restartAttempts} failed: ` +
        `${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`
      );
      throw recoveryError;
    }
  }

  /**
   * Calculate restart delay with exponential backoff
   */
  private calculateRestartDelay(): number {
    const exponentialDelay = this.config.restartBackoffBase * Math.pow(2, this.restartAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.config.restartBackoffMax);
    
    // Add jitter (±20%)
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(1000, cappedDelay + jitter);
  }

  /**
   * Reset restart attempts (call after successful operation)
   */
  resetRestartAttempts(): void {
    if (this.restartAttempts > 0) {
      logger.warn(`[FATAL] Resetting restart attempts (was ${this.restartAttempts})`);
      this.restartAttempts = 0;
    }
  }

  /**
   * Reset fatal error tracking (call after extended period of stability)
   */
  resetFatalErrorTracking(): void {
    this.fatalErrorTracker.reset();
    logger.warn('[FATAL] Fatal error tracking reset');
  }

  /**
   * Get recovery status
   */
  getStatus(): {
    restartAttempts: number;
    maxRestartAttempts: number;
    fatalErrorsInWindow: number;
    maxFatalErrorsInWindow: number;
    lastFatalError: string | null;
    lastFatalErrorTime: number | null;
  } {
    return {
      restartAttempts: this.restartAttempts,
      maxRestartAttempts: this.config.maxRestartAttempts,
      fatalErrorsInWindow: this.fatalErrorTracker.getFatalErrorCount(),
      maxFatalErrorsInWindow: this.config.maxFatalErrorsInWindow,
      lastFatalError: this.lastFatalError?.message || null,
      lastFatalErrorTime: this.lastFatalErrorTime || null
    };
  }
}

