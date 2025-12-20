import { logger } from './logger';

export interface FatalRecoveryConfig {
  maxRestartAttempts: number;
  restartBackoffBase: number;
  restartBackoffMax: number;
  fatalErrorWindow: number;
  maxFatalErrorsInWindow: number;
  statePreservationEnabled: boolean;
}

const DEFAULT_CONFIG: FatalRecoveryConfig = {
  maxRestartAttempts: 5,
  restartBackoffBase: 10000,
  restartBackoffMax: 300000,
  fatalErrorWindow: 3600000,
  maxFatalErrorsInWindow: 10,
  statePreservationEnabled: true
};

class FatalErrorTracker {
  private fatalErrors: number[] = [];
  private readonly config: FatalRecoveryConfig;

  constructor(config: FatalRecoveryConfig) {
    this.config = config;
  }

  recordFatalError(): void {
    const now = Date.now();
    this.fatalErrors.push(now);
    this.cleanOldErrors();
  }

  shouldStop(): boolean {
    this.cleanOldErrors();
    return this.fatalErrors.length >= this.config.maxFatalErrorsInWindow;
  }

  getFatalErrorCount(): number {
    this.cleanOldErrors();
    return this.fatalErrors.length;
  }

  private cleanOldErrors(): void {
    const now = Date.now();
    const cutoff = now - this.config.fatalErrorWindow;
    this.fatalErrors = this.fatalErrors.filter(timestamp => timestamp > cutoff);
  }

  reset(): void {
    this.fatalErrors = [];
  }
}

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

  async handleFatalError(
    error: Error,
    recoveryFn: () => Promise<void>,
    statePreservationFn?: () => Promise<void>
  ): Promise<void> {
    this.lastFatalError = error;
    this.lastFatalErrorTime = Date.now();
    this.fatalErrorTracker.recordFatalError();
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
    if (this.config.statePreservationEnabled && statePreservationFn) {
      try {
        await statePreservationFn();
        logger.warn('[FATAL] State preserved before recovery attempt');
      } catch (stateError) {
        logger.error(`[FATAL] Failed to preserve state: ${stateError instanceof Error ? stateError.message : String(stateError)}`);
      }
    }
    const delay = this.calculateRestartDelay();
    const delaySeconds = (delay / 1000).toFixed(2);

    logger.error(
      `[FATAL] Fatal error encountered (attempt ${this.restartAttempts + 1}/${this.config.maxRestartAttempts}). ` +
      `Restarting in ${delaySeconds}s. Error: ${error.message}\n${error.stack}`
    );
    await new Promise(resolve => setTimeout(resolve, delay));
    this.restartAttempts++;
    try {
      await recoveryFn();
      this.restartAttempts = 0;
      logger.warn(`[FATAL] Recovery successful after ${this.restartAttempts} attempts`);
    } catch (recoveryError) {
      logger.error(
        `[FATAL] Recovery attempt ${this.restartAttempts} failed: ` +
        `${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`
      );
      throw recoveryError;
    }
  }

  private calculateRestartDelay(): number {
    const exponentialDelay = this.config.restartBackoffBase * Math.pow(2, this.restartAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.config.restartBackoffMax);
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(1000, cappedDelay + jitter);
  }

  resetRestartAttempts(): void {
    if (this.restartAttempts > 0) {
      logger.warn(`[FATAL] Resetting restart attempts (was ${this.restartAttempts})`);
      this.restartAttempts = 0;
    }
  }

  resetFatalErrorTracking(): void {
    this.fatalErrorTracker.reset();
    logger.warn('[FATAL] Fatal error tracking reset');
  }

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

