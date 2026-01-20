import { logger } from './logger';

export enum CircuitState { CLOSED = 'CLOSED', OPEN = 'OPEN', HALF_OPEN = 'HALF_OPEN' }
export class CircuitBreakerError extends Error { constructor(m: string) { super(m); this.name = 'CircuitBreakerError'; } }

const DEFAULTS = { failureThreshold: 5, successThreshold: 2, timeout: 60000, resetTimeout: 300000 };

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private openedAt = 0;
  private config: typeof DEFAULTS;

  constructor(private name: string, config: Partial<typeof DEFAULTS> = {}) { this.config = { ...DEFAULTS, ...config }; }

  async execute<T>(fn: () => Promise<T>, timeout = 30000): Promise<T> {
    if (this.state === CircuitState.OPEN && Date.now() - this.openedAt >= this.config.timeout) this.transition(CircuitState.HALF_OPEN);
    if (this.state === CircuitState.OPEN) throw new CircuitBreakerError(`Circuit OPEN for ${this.name}`);
    try {
      const res = await Promise.race([fn(), new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), timeout))]);
      return this.onSuccess(res);
    } catch (e) { this.onFailure(e); throw e; }
  }

  private transition(to: CircuitState) {
    if (this.state === to) return;
    this.state = to;
    this.failures = 0; this.successes = 0;
    if (to === CircuitState.OPEN) { this.openedAt = Date.now(); logger.error(`[CIRCUIT] ${this.name}: OPEN`); }
    else if (to === CircuitState.HALF_OPEN) logger.warn(`[CIRCUIT] ${this.name}: HALF_OPEN`);
    else logger.warn(`[CIRCUIT] ${this.name}: CLOSED`);
  }

  private onSuccess<T>(res: T): T {
    if (this.state === CircuitState.HALF_OPEN && ++this.successes >= this.config.successThreshold) this.transition(CircuitState.CLOSED);
    return res;
  }

  private onFailure(e: any) {
    if ([401, 403, 404, 429].includes(e?.response?.status)) return; // Don't count non-circuit errors
    if (this.state === CircuitState.HALF_OPEN || ++this.failures >= this.config.failureThreshold) this.transition(CircuitState.OPEN);
  }

  isOpen() { return this.state === CircuitState.OPEN; }
  getState() { return this.state; }
  get failureCount() { return this.failures; }
  reset() { this.transition(CircuitState.CLOSED); }
}
