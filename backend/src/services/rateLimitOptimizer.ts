import { logger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/environment';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetTime: number;
}

interface TokenRateLimitState {
  tokenIndex: number;
  codeSearch: RateLimitInfo | null;
  core: RateLimitInfo | null;
  lastUpdated: number;
  requestCount: number;
  lastRequestTime: number;
}

export class RateLimitOptimizer {
  private tokenStates: Map<number, TokenRateLimitState> = new Map();
  private tokens: string[] = [];
  private currentTokenIndex: number = 0;
  private readonly LOW_THRESHOLD = 0.5;
  private readonly CRITICAL_THRESHOLD = 0.1;
  private readonly MIN_DELAY = 100;
  private readonly MAX_DELAY = 10000;
  private readonly BASE_DELAY = 1000;
  private usageHistory: Array<{ timestamp: number; remaining: number; limit: number }> = [];
  private readonly HISTORY_WINDOW = 3600000;
  private lastFullRefresh = 0;
  private readonly REFRESH_INTERVAL = 30000;

  constructor() {
    this.tokens = config.GITHUB_TOKEN.split(',').map(t => t.trim()).filter(Boolean);
    if (this.tokens.length === 0) {
      throw new Error('No valid GitHub tokens provided');
    }
    this.tokens.forEach((_, index) => {
      this.tokenStates.set(index, {
        tokenIndex: index,
        codeSearch: null,
        core: null,
        lastUpdated: 0,
        requestCount: 0,
        lastRequestTime: 0
      });
    });
    logger.warn(`[RATE-LIMIT] Initialized optimizer with ${this.tokens.length} token(s)`);
  }

  updateFromHeaders(headers: any, tokenIndex?: number): void {
    const tokenIdx = tokenIndex ?? this.currentTokenIndex;
    const state = this.tokenStates.get(tokenIdx);
    if (!state) return;
    const codeSearchLimit = headers['x-ratelimit-limit'];
    const codeSearchRemaining = headers['x-ratelimit-remaining'];
    const codeSearchReset = headers['x-ratelimit-reset'];
    if (codeSearchLimit && codeSearchRemaining !== undefined && codeSearchReset) {
      state.codeSearch = {
        limit: parseInt(codeSearchLimit, 10),
        remaining: parseInt(codeSearchRemaining, 10),
        reset: parseInt(codeSearchReset, 10),
        resetTime: parseInt(codeSearchReset, 10) * 1000
      };
      this.usageHistory.push({
        timestamp: Date.now(),
        remaining: state.codeSearch.remaining,
        limit: state.codeSearch.limit
      });
      this.cleanHistory();
      state.lastUpdated = Date.now();
    }
  }

  getCurrentTokenState(): TokenRateLimitState | null {
    return this.tokenStates.get(this.currentTokenIndex) || null;
  }

  getBestToken(): number {
    let bestIndex = this.currentTokenIndex;
    let bestScore = -1;
    const now = Date.now();
    for (const [index, state] of this.tokenStates.entries()) {
      if (!state.codeSearch) continue;
      const remaining = state.codeSearch.remaining;
      const timeUntilReset = Math.max(0, state.codeSearch.resetTime - now);
      const score = remaining + (3600000 - Math.min(timeUntilReset, 3600000)) / 1000;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  shouldRotateToken(): boolean {
    const currentState = this.getCurrentTokenState();
    if (!currentState || !currentState.codeSearch) return false;
    const currentRemaining = currentState.codeSearch.remaining;
    const bestTokenIndex = this.getBestToken();
    const bestState = this.tokenStates.get(bestTokenIndex);
    if (bestState?.codeSearch && bestState.codeSearch.remaining > currentRemaining * 1.2) {
      return true;
    }
    if (currentRemaining < currentState.codeSearch.limit * this.LOW_THRESHOLD && 
        bestState?.codeSearch && bestState.codeSearch.remaining > currentRemaining) {
      return true;
    }
    return false;
  }

  rotateToBestToken(): void {
    const bestIndex = this.getBestToken();
    if (bestIndex !== this.currentTokenIndex) {
      const oldIndex = this.currentTokenIndex;
      this.currentTokenIndex = bestIndex;
      logger.warn(
        `[RATE-LIMIT] Rotated from token ${oldIndex + 1} to token ${this.currentTokenIndex + 1} ` +
        `(remaining: ${this.getCurrentTokenState()?.codeSearch?.remaining ?? 'unknown'})`
      );
    }
  }

  calculateAdaptiveDelay(): number {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) {
      return this.BASE_DELAY;
    }
    const { remaining, limit } = state.codeSearch;
    const remainingRatio = remaining / limit;
    let delay = this.BASE_DELAY;
    if (remainingRatio <= this.CRITICAL_THRESHOLD) {
      delay = this.MAX_DELAY;
    } else if (remainingRatio <= this.LOW_THRESHOLD) {
      delay = this.BASE_DELAY * 5;
    } else if (remainingRatio <= 0.5) {
      delay = this.BASE_DELAY * 2;
    } else {
      delay = this.BASE_DELAY;
    }
    return Math.max(this.MIN_DELAY, Math.min(delay, this.MAX_DELAY));
  }

  shouldSlowDown(): boolean {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) return false;
    const remainingRatio = state.codeSearch.remaining / state.codeSearch.limit;
    return remainingRatio <= this.LOW_THRESHOLD;
  }

  predictResetTime(): number | null {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) return null;
    if (state.codeSearch.resetTime > Date.now()) {
      return state.codeSearch.resetTime;
    }
    if (this.usageHistory.length < 2) return null;
    const recentHistory = this.usageHistory.slice(-10);
    if (recentHistory.length < 2) return null;
    const lastEntry = recentHistory[recentHistory.length - 1];
    const firstEntry = recentHistory[0];
    if (!lastEntry || !firstEntry) return null;
    const avgTimeBetweenRequests = 
      (lastEntry.timestamp - firstEntry.timestamp) / 
      (recentHistory.length - 1);
    const currentRemaining = state.codeSearch.remaining;
    const estimatedTimeToExhaustion = avgTimeBetweenRequests * currentRemaining;
    return Date.now() + estimatedTimeToExhaustion;
  }

  async waitWithThrottling(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFullRefresh > this.REFRESH_INTERVAL) {
      await this.refreshAllTokenStatuses();
      this.lastFullRefresh = now;
    }
    if (this.shouldRotateToken()) {
      this.rotateToBestToken();
    }
    const delay = this.calculateAdaptiveDelay();
    const state = this.getCurrentTokenState();
    if (state?.codeSearch && this.shouldSlowDown()) {
      const remainingRatio = (state.codeSearch.remaining / state.codeSearch.limit * 100).toFixed(1);
      logger.warn(
        `[RATE-LIMIT] Proactive slowdown: ${state.codeSearch.remaining}/${state.codeSearch.limit} ` +
        `(${remainingRatio}%) remaining. Delay: ${delay}ms`
      );
    }
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    const currentState = this.getCurrentTokenState();
    if (currentState) {
      currentState.lastRequestTime = Date.now();
      currentState.requestCount++;
    }
  }

  getCurrentTokenIndex(): number {
    const currentState = this.tokenStates.get(this.currentTokenIndex);
    if (currentState?.codeSearch && currentState.codeSearch.remaining > 0) {
      return this.currentTokenIndex;
    }
    const bestIndex = this.getBestToken();
    if (bestIndex !== this.currentTokenIndex) {
      this.currentTokenIndex = bestIndex;
    }
    return this.currentTokenIndex;
  }

  getTokenCount(): number {
    return this.tokens.length;
  }

  getStatus(): {
    currentToken: number;
    tokenCount: number;
    tokens: Array<{
      index: number;
      codeSearchRemaining: number | null;
      codeSearchLimit: number | null;
      codeSearchReset: number | null;
      lastUpdated: number;
    }>;
    shouldSlowDown: boolean;
    adaptiveDelay: number;
    predictedReset: number | null;
  } {
    const tokens = Array.from(this.tokenStates.entries()).map(([index, state]) => ({
      index,
      codeSearchRemaining: state.codeSearch?.remaining ?? null,
      codeSearchLimit: state.codeSearch?.limit ?? null,
      codeSearchReset: state.codeSearch?.resetTime ?? null,
      lastUpdated: state.lastUpdated
    }));
    return {
      currentToken: this.currentTokenIndex,
      tokenCount: this.tokens.length,
      tokens,
      shouldSlowDown: this.shouldSlowDown(),
      adaptiveDelay: this.calculateAdaptiveDelay(),
      predictedReset: this.predictResetTime()
    };
  }

  private cleanHistory(): void {
    const cutoff = Date.now() - this.HISTORY_WINDOW;
    this.usageHistory = this.usageHistory.filter(entry => entry.timestamp > cutoff);
  }

  async refreshTokenStatus(tokenIndex: number): Promise<void> {
    if (tokenIndex >= this.tokens.length) return;
    try {
      const response = await axios.get('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `Bearer ${this.tokens[tokenIndex]}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'API-Radar-Scanner/1.0',
        },
        timeout: 5000,
      });
      const state = this.tokenStates.get(tokenIndex);
      if (!state) return;
      const codeSearchLimit = response.data.resources.code_search;
      if (codeSearchLimit) {
        state.codeSearch = {
          limit: codeSearchLimit.limit,
          remaining: codeSearchLimit.remaining,
          reset: codeSearchLimit.reset,
          resetTime: codeSearchLimit.reset * 1000
        };
        state.lastUpdated = Date.now();
      }
    } catch (error) {
      logger.warn(`[RATE-LIMIT] Failed to refresh token ${tokenIndex + 1} status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async refreshAllTokenStatuses(): Promise<void> {
    const promises = this.tokens.map((_, index) => this.refreshTokenStatus(index));
    await Promise.all(promises);
  }
}

export const rateLimitOptimizer = new RateLimitOptimizer();
