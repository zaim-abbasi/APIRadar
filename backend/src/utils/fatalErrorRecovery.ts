import { logger } from './logger';

const DEFAULTS = { maxAttempts: 5, backoffBase: 1000, backoffMax: 60000, errorWindow: 3600000, maxErrors: 10, stability: 300000 };

export class FatalErrorRecoveryManager {
  private attempts = 0;
  private errors: number[] = [];
  private stabilityTimer: NodeJS.Timeout | null = null;
  private config = DEFAULTS;

  constructor(config: Partial<typeof DEFAULTS> = {}) { this.config = { ...DEFAULTS, ...config }; }

  async handleFatalError(_err: Error, recover: () => Promise<void>, opts: { signal?: AbortSignal } = {}) {
    if (this.stabilityTimer) { clearTimeout(this.stabilityTimer); this.stabilityTimer = null; }
    const now = Date.now();
    this.errors = this.errors.filter(t => now - t < this.config.errorWindow);
    this.errors.push(now);

    if (this.errors.length > this.config.maxErrors) throw new Error('Too many fatal errors');
    while (this.attempts < this.config.maxAttempts) {
      if (opts.signal?.aborted) throw new Error('Recovery aborted');
      const delay = Math.min(this.config.backoffBase * Math.pow(2, this.attempts), this.config.backoffMax);
      logger.error(`[FATAL] Restarting in ${(delay / 1000).toFixed(1)}s (Attempt ${this.attempts + 1}/${this.config.maxAttempts})`);
      await new Promise((r, j) => {
        const t = setTimeout(r, delay);
        opts.signal?.addEventListener('abort', () => { clearTimeout(t); j(new Error('Aborted')); });
      });
      this.attempts++;
      try {
        await recover();
        logger.warn(`[FATAL] Recovered. Stabilizing...`);
        this.stabilityTimer = setTimeout(() => { logger.init('[FATAL] Stable'); this.attempts = 0; }, this.config.stability);
        this.stabilityTimer.unref();
        return;
      } catch (e) { logger.error(`[FATAL] Recovery failed: ${e instanceof Error ? e.message : e}`); }
    }
    throw new Error('Max restart attempts exceeded');
  }

  reset() { this.attempts = 0; this.errors = []; logger.warn('[FATAL] Reset'); }
  getStatus() { return { attempts: this.attempts, errorsInWindow: this.errors.length }; }
}

export const fatalErrorRecoveryManager = new FatalErrorRecoveryManager();
