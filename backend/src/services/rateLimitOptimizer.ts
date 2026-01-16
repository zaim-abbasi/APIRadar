import { logger } from '../utils/logger';
import { config } from '../config/environment';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetTime: number;
}

interface TokenStatus {
  index: number;
  info: RateLimitInfo | null;
  lastUpdated: number;
}

export class RateLimitOptimizer {
  private states = new Map<number, TokenStatus>();
  private tokens: string[] = [];
  private currentTokenIndex = 0;
  private lastRotation = Date.now(); // Initialize to avoid immediate rotation issues

  constructor() {
    this.tokens = config.GITHUB_TOKEN.split(',').map(t => t.trim()).filter(Boolean);
    if (!this.tokens.length) throw new Error('No valid GitHub tokens provided');

    this.tokens.forEach((_, index) => {
      this.states.set(index, { index, info: null, lastUpdated: 0 });
    });
    logger.init(`[RATE-LIMIT] Initialized with ${this.tokens.length} tokens`);
  }

  getCurrentTokenState(): TokenStatus | null {
    return this.states.get(this.currentTokenIndex) || null;
  }

  getBestToken(): number {
    let bestIndex = this.currentTokenIndex;
    let maxRemaining = -1;

    const current = this.getCurrentTokenState();
    if (current?.info) {
      maxRemaining = current.info.remaining;
    }

    for (const [index, state] of this.states.entries()) {
      if (!state.info) continue;
      if (state.info.remaining > maxRemaining) {
        maxRemaining = state.info.remaining;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  shouldRotate(): boolean {
    const now = Date.now();
    if (now - this.lastRotation < 2000) return false;

    const current = this.getCurrentTokenState();
    if (!current?.info) return true;
    if (current.info.remaining === 0) return true;

    const bestIndex = this.getBestToken();
    if (bestIndex === this.currentTokenIndex) return false;

    const best = this.states.get(bestIndex);
    return (best?.info?.remaining || 0) > (current.info.remaining + 10); // Hysteresis buffer
  }

  rotate() {
    const best = this.getBestToken();
    if (best !== this.currentTokenIndex) {
      this.currentTokenIndex = best;
      this.lastRotation = Date.now();
      const info = this.states.get(best)?.info;
      logger.init(`[RATE-LIMIT] Rotated to token ${best + 1} (${info?.remaining ?? '?'} remaining)`);
    }
  }

  getResetWaitTime(): number {
    const current = this.getCurrentTokenState();
    if (!current?.info) return 0;

    // Budget available? No wait.
    if (current.info.remaining > 0) return 0;

    // Others available? No wait (rotation will happen).
    if (this.shouldRotate()) {
      this.rotate();
      if ((this.getCurrentTokenState()?.info?.remaining || 0) > 0) return 0;
    }

    // All exhausted: Find global minimum reset time
    let minReset = Number.MAX_SAFE_INTEGER;
    let foundValidReset = false;

    for (const state of this.states.values()) {
      if (state.info) {
        minReset = Math.min(minReset, state.info.resetTime);
        foundValidReset = true;
      }
    }

    if (!foundValidReset) return 60000; // Fallback if no data

    const wait = minReset - Date.now();
    return wait > 0 ? wait + 1000 : 0;
  }

  getDelay(): number {
    const current = this.getCurrentTokenState();
    if (!current?.info) return 1000;

    const ratio = current.info.remaining / current.info.limit;
    if (ratio < 0.1) return 2000; // Throttling logic simplified
    return 1000;
  }

  async waitWithThrottling(): Promise<void> {
    if (this.shouldRotate()) this.rotate();
    await new Promise(r => setTimeout(r, this.getDelay()));
  }

  getCurrentTokenIndex(): number {
    return this.currentTokenIndex;
  }

  getTokenCount(): number {
    return this.tokens.length;
  }

  getStatus() {
    return {
      currentToken: this.currentTokenIndex,
      tokenCount: this.tokens.length,
      tokens: Array.from(this.states.values()).map(s => ({
        index: s.index,
        codeSearchRemaining: s.info?.remaining ?? null,
        codeSearchLimit: s.info?.limit ?? null,
        codeSearchReset: s.info?.resetTime ?? null,
        lastUpdated: s.lastUpdated
      })),
      adaptiveDelay: this.getDelay(),
      predictedReset: null
    };
  }

  updateStateFromResponse(index: number, headers: any) {
    if (!headers) return;

    const resource = headers['x-ratelimit-resource'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    const limit = headers['x-ratelimit-limit'];

    if (resource && resource !== 'search' && resource !== 'code_search') {
      return;
    }

    if (remaining !== undefined && reset !== undefined) {
      const state = this.states.get(index);
      if (state) {
        const parsedLimit = parseInt(limit, 10);
        if (parsedLimit > 100) {
          return;
        }

        state.info = {
          limit: parsedLimit || 10,
          remaining: parseInt(remaining, 10),
          reset: parseInt(reset, 10),
          resetTime: parseInt(reset, 10) * 1000
        };
        state.lastUpdated = Date.now();
      }
    }
  }

  async refreshAllTokenStatuses(): Promise<void> {
    // Smart Refresh: Only refresh tokens that are expired or have unknown status
    // or every 5 minutes regardless to detect drift.
    const now = Date.now();

    await Promise.all(this.tokens.map(async (token, i) => {
      const state = this.states.get(i);

      // Optimization: Don't refresh if we have recent data (>5m old) and plenty of budget
      if (state?.info &&
        state.info.remaining > 5 &&
        (now - state.lastUpdated) < 300000) {
        return;
      }

      try {
        const res = await fetch('https://api.github.com/rate_limit', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data: any = await res.json();
        const cs = data.resources?.code_search;

        if (cs && state) {
          state.info = {
            limit: cs.limit,
            remaining: cs.remaining,
            reset: cs.reset,
            resetTime: cs.reset * 1000
          };
          state.lastUpdated = now;
        }
      } catch (e) {
        logger.warn(`[RATE-LIMIT] Refresh failed for token ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }));
  }
}

export const rateLimitOptimizer = new RateLimitOptimizer();
