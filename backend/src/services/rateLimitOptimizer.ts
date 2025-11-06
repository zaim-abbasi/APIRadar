import { logger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/environment';

/**
 * Rate Limit Information from GitHub API Headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  resetTime: number; // Unix timestamp in milliseconds
}

/**
 * Token Rate Limit State
 */
interface TokenRateLimitState {
  tokenIndex: number;
  codeSearch: RateLimitInfo | null;
  core: RateLimitInfo | null;
  lastUpdated: number;
  requestCount: number;
  lastRequestTime: number;
}

/**
 * Rate Limit Optimizer
 * 
 * Priority 2: Root Implementation
 * - Proactive rate limit management (track remaining, slow down when < 20%)
 * - Adaptive request throttling (dynamic delays based on remaining tokens)
 * - Multi-token load balancing (round-robin, per-token tracking, auto-rotate)
 * - Rate limit prediction (track patterns, predict resets, schedule work)
 */
export class RateLimitOptimizer {
  private tokenStates: Map<number, TokenRateLimitState> = new Map();
  private tokens: string[] = [];
  private currentTokenIndex: number = 0;
  private readonly LOW_THRESHOLD = 0.2; // 20% remaining = slow down
  private readonly CRITICAL_THRESHOLD = 0.1; // 10% remaining = very slow
  private readonly MIN_DELAY = 100; // Minimum delay between requests (ms)
  private readonly MAX_DELAY = 10000; // Maximum delay between requests (ms)
  private readonly BASE_DELAY = 1000; // Base delay for code search API (1 request per 6 seconds = 10 per minute)
  private usageHistory: Array<{ timestamp: number; remaining: number; limit: number }> = [];
  private readonly HISTORY_WINDOW = 3600000; // 1 hour

  constructor() {
    // Initialize tokens
    this.tokens = config.GITHUB_TOKEN.split(',').map(t => t.trim()).filter(Boolean);
    if (this.tokens.length === 0) {
      throw new Error('No valid GitHub tokens provided');
    }

    // Initialize token states
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

  /**
   * Update rate limit info from API response headers
   */
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

      // Track usage history
      this.usageHistory.push({
        timestamp: Date.now(),
        remaining: state.codeSearch.remaining,
        limit: state.codeSearch.limit
      });

      // Clean old history
      this.cleanHistory();

      state.lastUpdated = Date.now();
    }
  }

  /**
   * Get current token's rate limit state
   */
  getCurrentTokenState(): TokenRateLimitState | null {
    return this.tokenStates.get(this.currentTokenIndex) || null;
  }

  /**
   * Get best available token (most remaining tokens)
   */
  getBestToken(): number {
    let bestIndex = this.currentTokenIndex;
    let bestRemaining = 0;

    for (const [index, state] of this.tokenStates.entries()) {
      const remaining = state.codeSearch?.remaining ?? 0;
      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  /**
   * Check if we should rotate to a better token
   */
  shouldRotateToken(): boolean {
    const currentState = this.getCurrentTokenState();
    if (!currentState || !currentState.codeSearch) return false;

    const currentRemaining = currentState.codeSearch.remaining;
    const bestTokenIndex = this.getBestToken();
    const bestState = this.tokenStates.get(bestTokenIndex);

    // Rotate if best token has significantly more remaining (> 50% more)
    if (bestState?.codeSearch && bestState.codeSearch.remaining > currentRemaining * 1.5) {
      return true;
    }

    // Rotate if current token is low (< 20% remaining) and best has more
    if (currentRemaining < currentState.codeSearch.limit * this.LOW_THRESHOLD && 
        bestState?.codeSearch && bestState.codeSearch.remaining > currentRemaining) {
      return true;
    }

    return false;
  }

  /**
   * Rotate to best available token
   */
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

  /**
   * Calculate adaptive delay based on remaining tokens
   */
  calculateAdaptiveDelay(): number {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) {
      return this.BASE_DELAY;
    }

    const { remaining, limit } = state.codeSearch;
    const remainingRatio = remaining / limit;

    // Calculate delay based on remaining tokens
    let delay = this.BASE_DELAY;

    if (remainingRatio <= this.CRITICAL_THRESHOLD) {
      // Critical: < 10% remaining - very slow (max delay)
      delay = this.MAX_DELAY;
    } else if (remainingRatio <= this.LOW_THRESHOLD) {
      // Low: < 20% remaining - slow down significantly
      delay = this.BASE_DELAY * 5;
    } else if (remainingRatio <= 0.5) {
      // Medium: < 50% remaining - moderate slowdown
      delay = this.BASE_DELAY * 2;
    } else {
      // High: > 50% remaining - normal speed
      delay = this.BASE_DELAY;
    }

    // Ensure delay is within bounds
    return Math.max(this.MIN_DELAY, Math.min(delay, this.MAX_DELAY));
  }

  /**
   * Check if we should slow down (proactive management)
   */
  shouldSlowDown(): boolean {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) return false;

    const remainingRatio = state.codeSearch.remaining / state.codeSearch.limit;
    return remainingRatio <= this.LOW_THRESHOLD;
  }

  /**
   * Get predicted reset time based on usage patterns
   */
  predictResetTime(): number | null {
    const state = this.getCurrentTokenState();
    if (!state || !state.codeSearch) return null;

    // Use actual reset time from headers if available
    if (state.codeSearch.resetTime > Date.now()) {
      return state.codeSearch.resetTime;
    }

    // Predict based on usage history
    if (this.usageHistory.length < 2) return null;

    // Calculate average time between requests
    const recentHistory = this.usageHistory.slice(-10);
    if (recentHistory.length < 2) return null;

    const lastEntry = recentHistory[recentHistory.length - 1];
    const firstEntry = recentHistory[0];
    if (!lastEntry || !firstEntry) return null;

    const avgTimeBetweenRequests = 
      (lastEntry.timestamp - firstEntry.timestamp) / 
      (recentHistory.length - 1);

    // Estimate when we'll hit the limit
    const currentRemaining = state.codeSearch.remaining;
    const estimatedTimeToExhaustion = avgTimeBetweenRequests * currentRemaining;

    return Date.now() + estimatedTimeToExhaustion;
  }

  /**
   * Wait with adaptive throttling
   */
  async waitWithThrottling(): Promise<void> {
    // Check if we should rotate tokens
    if (this.shouldRotateToken()) {
      this.rotateToBestToken();
    }

    // Calculate adaptive delay
    const delay = this.calculateAdaptiveDelay();

    // Log if we're slowing down
    const state = this.getCurrentTokenState();
    if (state?.codeSearch && this.shouldSlowDown()) {
      const remainingRatio = (state.codeSearch.remaining / state.codeSearch.limit * 100).toFixed(1);
      logger.warn(
        `[RATE-LIMIT] Proactive slowdown: ${state.codeSearch.remaining}/${state.codeSearch.limit} ` +
        `(${remainingRatio}%) remaining. Delay: ${delay}ms`
      );
    }

    // Wait with calculated delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Update last request time
    const currentState = this.getCurrentTokenState();
    if (currentState) {
      currentState.lastRequestTime = Date.now();
      currentState.requestCount++;
    }
  }

  /**
   * Get current token index
   */
  getCurrentTokenIndex(): number {
    return this.currentTokenIndex;
  }

  /**
   * Get token count
   */
  getTokenCount(): number {
    return this.tokens.length;
  }

  /**
   * Get rate limit status for all tokens
   */
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

  /**
   * Clean old usage history
   */
  private cleanHistory(): void {
    const cutoff = Date.now() - this.HISTORY_WINDOW;
    this.usageHistory = this.usageHistory.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Refresh rate limit status for a token
   */
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

  /**
   * Refresh all token statuses
   */
  async refreshAllTokenStatuses(): Promise<void> {
    const promises = this.tokens.map((_, index) => this.refreshTokenStatus(index));
    await Promise.all(promises);
  }
}

// Singleton instance
export const rateLimitOptimizer = new RateLimitOptimizer();

