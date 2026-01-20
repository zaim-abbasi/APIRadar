import { logger } from './logger';

interface Config {
  maxRestartAttempts: number;
  restartBackoffBase: number;
  restartBackoffMax: number;
  fatalErrorWindow: number;
  maxFatalErrorsInWindow: number;
  stabilityThreshold: number;
  statePreservationEnabled: boolean;
}

const DEFAULTS: Config = {
  maxRestartAttempts: 5, restartBackoffBase: 1000, restartBackoffMax: 60000,
  fatalErrorWindow: 3600000, maxFatalErrorsInWindow: 10, stabilityThreshold: 300000, statePreservationEnabled: true
};

class ErrorTracker {
  private buckets = new Array(60).fill(0);
  private lastRotation = Date.now();
  private total = 0;
  constructor(private window: number) { }

  record() { this.rotate(); this.buckets[this.buckets.length - 1]++; this.total++; }
  count() { this.rotate(); return this.total; }
  reset() { this.buckets.fill(0); this.total = 0; this.lastRotation = Date.now(); }

  private rotate() {
    const duration = this.window / this.buckets.length;
    const shifts = Math.floor((Date.now() - this.lastRotation) / duration);
    if (!shifts) return;
    if (shifts >= this.buckets.length) { this.reset(); return; }
    for (let i = 0; i < shifts; i++) { this.total -= this.buckets.shift() || 0; this.buckets.push(0); }
    this.lastRotation += shifts * duration;
  }
}

export class FatalErrorRecoveryManager {
  private attempts = 0;
  private tracker: ErrorTracker;
  private config: Config;
  private lastError: Error | null = null;
  private lastErrorTime = 0;
  private stabilityTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<Config> = {}) {
    this.config = { ...DEFAULTS, ...config };
    this.tracker = new ErrorTracker(this.config.fatalErrorWindow);
  }

  async handleFatalError(error: Error, recoveryFn: () => Promise<void>, opts: { statePreservationFn?: () => Promise<void>; abortSignal?: AbortSignal } = {}) {
    if (this.stabilityTimer) { clearTimeout(this.stabilityTimer); this.stabilityTimer = null; }
    this.lastError = error; this.lastErrorTime = Date.now(); this.tracker.record();

    if (this.tracker.count() >= this.config.maxFatalErrorsInWindow) {
      logger.error(`[FATAL] Too many errors (${this.tracker.count()}) in window. Stopping.`);
      throw new Error('Too many fatal errors');
    }

    while (true) {
      if (this.attempts >= this.config.maxRestartAttempts) {
        logger.error(`[FATAL] Max attempts (${this.config.maxRestartAttempts}) exceeded.`);
        throw new Error('Max restart attempts exceeded');
      }
      if (opts.abortSignal?.aborted) throw new Error('Recovery aborted');

      if (this.config.statePreservationEnabled && opts.statePreservationFn) {
        try { await opts.statePreservationFn(); logger.warn('[FATAL] State preserved'); } catch { }
      }

      const delay = Math.max(1000, Math.min(this.config.restartBackoffBase * Math.pow(2, this.attempts), this.config.restartBackoffMax) * (1 + 0.2 * (Math.random() * 2 - 1)));
      logger.error(`[FATAL] Attempt ${this.attempts + 1}/${this.config.maxRestartAttempts}. Restarting in ${(delay / 1000).toFixed(1)}s.`);

      await this.wait(delay, opts.abortSignal);
      this.attempts++;

      try {
        await recoveryFn();
        logger.warn(`[FATAL] Recovery successful. Stability period (${(this.config.stabilityThreshold / 1000).toFixed(0)}s).`);
        this.stabilityTimer = setTimeout(() => { logger.init(`[FATAL] Stable. Resetting attempts.`); this.attempts = 0; }, this.config.stabilityThreshold);
        this.stabilityTimer.unref();
        return;
      } catch (e) { logger.error(`[FATAL] Attempt ${this.attempts} failed: ${e instanceof Error ? e.message : e}`); }
    }
  }

  private wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new Error('Aborted'));
      const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
      const onAbort = () => { clearTimeout(timer); reject(new Error('Aborted')); };
      signal?.addEventListener('abort', onAbort);
    });
  }

  resetRestartAttempts() { this.attempts = 0; }
  resetFatalErrorTracking() { this.tracker.reset(); logger.warn('[FATAL] Tracking reset'); }
  getStatus() { return { restartAttempts: this.attempts, fatalErrorsInWindow: this.tracker.count(), lastError: this.lastError?.message, lastErrorTime: this.lastErrorTime }; }
}

export const fatalErrorRecoveryManager = new FatalErrorRecoveryManager();
