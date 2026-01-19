import { logger } from './logger';

export interface FatalRecoveryConfig {
  maxRestartAttempts: number;
  restartBackoffBase: number;
  restartBackoffMax: number;
  fatalErrorWindow: number;
  maxFatalErrorsInWindow: number;
  stabilityThreshold: number; // Time in ms app must run error-free to reset attempts
  statePreservationEnabled: boolean;
}

const DEFAULT_CONFIG: FatalRecoveryConfig = {
  maxRestartAttempts: 5,
  restartBackoffBase: 1000,
  restartBackoffMax: 60000,
  fatalErrorWindow: 3600000, // 1 hour
  maxFatalErrorsInWindow: 10,
  stabilityThreshold: 300000, // 5 minutes
  statePreservationEnabled: true
};

class BucketedErrorTracker {
  private buckets: number[] = new Array(60).fill(0); // 1-minute buckets for 1 hour window
  private lastRotationTime: number = Date.now();
  private readonly config: FatalRecoveryConfig;
  private totalErrors: number = 0;

  constructor(config: FatalRecoveryConfig) {
    this.config = config;
  }

  recordError(): void {
    this.rotateBuckets();
    const lastIndex = this.buckets.length - 1;
    this.buckets[lastIndex] = (this.buckets[lastIndex] || 0) + 1;
    this.totalErrors++;
  }

  getFatalErrorCount(): number {
    this.rotateBuckets();
    return this.totalErrors;
  }

  reset(): void {
    this.buckets.fill(0);
    this.totalErrors = 0;
    this.lastRotationTime = Date.now();
  }

  private rotateBuckets(): void {
    const now = Date.now();
    const bucketDuration = this.config.fatalErrorWindow / this.buckets.length; // e.g., 60s
    const elapsed = now - this.lastRotationTime;

    if (elapsed >= bucketDuration) {
      const bucketsToShift = Math.floor(elapsed / bucketDuration);

      if (bucketsToShift >= this.buckets.length) {
        this.reset();
      } else {
        for (let i = 0; i < bucketsToShift; i++) {
          this.totalErrors -= this.buckets.shift() || 0;
          this.buckets.push(0);
        }
        this.lastRotationTime += bucketsToShift * bucketDuration;
      }
    }
  }
}

export class FatalErrorRecoveryManager {
  private restartAttempts = 0;
  private fatalErrorTracker: BucketedErrorTracker;
  private readonly config: FatalRecoveryConfig;
  private lastFatalError: Error | null = null;
  private lastFatalErrorTime: number = 0;
  private stabilityTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<FatalRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fatalErrorTracker = new BucketedErrorTracker(this.config);
  }

  async handleFatalError(
    error: Error,
    recoveryFn: () => Promise<void>,
    options: {
      statePreservationFn?: () => Promise<void>;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<void> {
    const { statePreservationFn, abortSignal } = options;

    // Clear stability timer if active - we just crashed again!
    this.clearStabilityTimer();

    this.lastFatalError = error;
    this.lastFatalErrorTime = Date.now();
    this.fatalErrorTracker.recordError();

    // Check circuit breaker (too many crashes in window)
    if (this.fatalErrorTracker.getFatalErrorCount() >= this.config.maxFatalErrorsInWindow) {
      const msg = `[FATAL] Too many fatal errors (${this.fatalErrorTracker.getFatalErrorCount()}) in window. Stopping.`;
      logger.error(msg);
      throw new Error(msg);
    }

    // Retry loop
    while (true) {
      // Check limits
      if (this.restartAttempts >= this.config.maxRestartAttempts) {
        const msg = `[FATAL] Max restart attempts (${this.config.maxRestartAttempts}) exceeded.`;
        logger.error(msg);
        throw new Error(msg);
      }

      // Check cancellation
      if (abortSignal?.aborted) {
        throw new Error('Fatal error recovery aborted by signal');
      }

      // Preserve state
      if (this.config.statePreservationEnabled && statePreservationFn) {
        try {
          await statePreservationFn();
          logger.warn('[FATAL] State preserved before recovery attempt');
        } catch (e) {
          logger.error(`[FATAL] Failed to preserve state: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Backoff delay
      const delay = this.calculateRestartDelay();
      logger.error(`[FATAL] Attempt ${this.restartAttempts + 1}/${this.config.maxRestartAttempts}. Restarting in ${(delay / 1000).toFixed(1)}s.`);

      try {
        await this.wait(delay, abortSignal);
      } catch (e: any) {
        if (e.message === 'Aborted') throw new Error('Recovery aborted during backoff');
        throw e;
      }

      this.restartAttempts++;

      try {
        await recoveryFn();

        // Success! But we don't reset attempts yet. We start stability timer.
        logger.warn(`[FATAL] Recovery successful. Entering stability period (${(this.config.stabilityThreshold / 1000).toFixed(0)}s).`);
        this.startStabilityTimer();
        return; // Exit retry loop and return control to application
      } catch (recoveryError) {
        logger.error(`[FATAL] Recovery attempt ${this.restartAttempts} failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
        // Loop continues to next attempt
      }
    }
  }

  private startStabilityTimer(): void {
    this.clearStabilityTimer();
    this.stabilityTimeout = setTimeout(() => {
      logger.init(`[FATAL] Application stable for ${(this.config.stabilityThreshold / 1000).toFixed(0)}s. Resetting restart attempts.`);
      this.resetRestartAttempts();
    }, this.config.stabilityThreshold);
    // Unref so this timer doesn't keep process alive if everything else stops
    this.stabilityTimeout.unref();
  }

  private clearStabilityTimer(): void {
    if (this.stabilityTimeout) {
      clearTimeout(this.stabilityTimeout);
      this.stabilityTimeout = null;
    }
  }

  private wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new Error('Aborted'));

      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const onAbort = () => {
        cleanup();
        reject(new Error('Aborted'));
      };

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };

      signal?.addEventListener('abort', onAbort);
    });
  }

  private calculateRestartDelay(): number {
    const exponentialDelay = this.config.restartBackoffBase * Math.pow(2, this.restartAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.config.restartBackoffMax);
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(1000, cappedDelay + jitter);
  }

  resetRestartAttempts(): void {
    if (this.restartAttempts > 0) {
      this.restartAttempts = 0;
    }
  }

  resetFatalErrorTracking(): void {
    this.fatalErrorTracker.reset();
    logger.warn('[FATAL] Fatal error tracking reset');
  }

  getStatus() {
    return {
      restartAttempts: this.restartAttempts,
      fatalErrorsInWindow: this.fatalErrorTracker.getFatalErrorCount(),
      lastError: this.lastFatalError?.message,
      lastErrorTime: this.lastFatalErrorTime
    };
  }
}

export const fatalErrorRecoveryManager = new FatalErrorRecoveryManager();
