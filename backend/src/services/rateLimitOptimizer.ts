import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { FARM_CONSTANTS } from './farmConstants';
import { GithubToken } from '../models/GithubToken';
import axios from 'axios';

const TUNING = {
  HYSTERESIS_BUFFER: 10,
  ROTATION_COOLDOWN: 2000,
  FALLBACK_WAIT: 60000,
  RESET_PADDING: 1000,
  THROTTLE_LOW: 2000,
  THROTTLE_NORMAL: 1000
};

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
  private cooldowns = new Map<string, number>();
  private currentTokenIndex = 0;
  private lastRotation = Date.now();

  constructor() {
    this.tokens = config.GITHUB_TOKEN || [];
    this.rebuildStates();
    if (this.tokens.length) {
      logger.init(`[RATE-LIMIT] Initialized with ${this.tokens.length} env tokens`);
    }
  }

  private rebuildStates() {
    this.states.clear();
    this.tokens.forEach((_, index) => {
      this.states.set(index, { index, info: null, lastUpdated: 0 });
    });
    this.currentTokenIndex = 0;
  }

  async initialize(): Promise<void> {
    const dbTokens = await GithubToken.find().lean();
    const dbTokenStrings = dbTokens.map(t => t.token);
    this.tokens = [...new Set(dbTokenStrings)];
    this.rebuildStates();
    logger.init(`[RATE-LIMIT] Loaded ${dbTokenStrings.length} tokens from DB`);

    const envTokenString = process.env['GITHUB_TOKEN'] || '';
    const envTokens = envTokenString.split(',').map(t => t.trim()).filter(t => t);
    for (const token of envTokens) {
      await this.onboardToken(token);
    }
  }

  async onboardToken(token: string): Promise<void> {
    if (this.tokens.includes(token)) return;
    try {
      const res = await axios.get('https://api.github.com/rate_limit', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        timeout: 10000
      });
      if (res.status === 200) {
        await GithubToken.updateOne({ token }, { token }, { upsert: true });
        this.tokens.push(token);
        this.states.set(this.tokens.length - 1, { index: this.tokens.length - 1, info: null, lastUpdated: 0 });
        logger.init(`[TOKEN] Onboarded new token: ${token.substring(0, 10)}...`);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        const message = err.response?.data?.message?.toLowerCase() || '';
        if (message.includes('suspended') || message.includes('account')) {
          logger.warn(`[TOKEN] Discarded suspended account token: ${token.substring(0, 10)}...`);
          return;
        }
        await GithubToken.updateOne({ token }, { token }, { upsert: true });
        this.tokens.push(token);
        this.states.set(this.tokens.length - 1, { index: this.tokens.length - 1, info: null, lastUpdated: 0 });
        const expiry = this.calculateCooldownExpiry(err.response?.headers);
        this.cooldowns.set(token, expiry);
        logger.init(`[TOKEN] Onboarded tired token (benched until ${new Date(expiry).toISOString()}): ${token.substring(0, 10)}...`);
      } else if (status === 401) {
        logger.warn(`[TOKEN] Discarded invalid token: ${token.substring(0, 10)}...`);
      } else {
        logger.warn(`[TOKEN] Onboard failed (${status || 'network'}): ${token.substring(0, 10)}...`);
      }
    }
  }

  async reportError(token: string, status: number, headers?: any): Promise<void> {
    if (status === 401) {
      await GithubToken.deleteOne({ token });
      const idx = this.tokens.indexOf(token);
      if (idx !== -1) {
        this.tokens.splice(idx, 1);
        this.rebuildStates();
      }
      this.cooldowns.delete(token);
      logger.warn(`[TOKEN] Hard fail - removed dead token: ${token.substring(0, 10)}...`);
    } else if (status === 403) {
      const expiry = this.calculateCooldownExpiry(headers);
      this.cooldowns.set(token, expiry);
      logger.warn(`[TOKEN] Soft fail - benched until ${new Date(expiry).toISOString()}: ${token.substring(0, 10)}...`);
    }
  }

  private calculateCooldownExpiry(headers?: any): number {
    const now = Date.now();
    if (headers?.['retry-after']) {
      return now + Math.max(parseInt(headers['retry-after'], 10) * 1000, 600000);
    }
    if (headers?.['x-ratelimit-reset']) {
      const resetAt = parseInt(headers['x-ratelimit-reset'], 10) * 1000;
      // If reset is in the future, use it. If past/stale, bench for 1 hour.
      return resetAt > now ? resetAt : now + 3600000;
    }
    return now + 3600000; // Default 1 hour for unspecified 403s
  }

  getCurrentToken(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.tokens.length; i++) {
      const idx = (this.currentTokenIndex + i) % this.tokens.length;
      const token = this.tokens[idx];
      if (!token) continue;
      const cooldownExpiry = this.cooldowns.get(token) || 0;
      if (cooldownExpiry <= now) {
        this.currentTokenIndex = idx;
        return token;
      }
    }
    return null;
  }

  getCurrentTokenState(): TokenStatus | null {
    return this.states.get(this.currentTokenIndex) || null;
  }

  getBestToken(): number {
    const now = Date.now();
    let bestIndex = this.currentTokenIndex;
    let maxRemaining = -1;

    for (const [index, state] of this.states.entries()) {
      const token = this.tokens[index];
      if (!token) continue;
      const cooldownExpiry = this.cooldowns.get(token) || 0;
      if (cooldownExpiry > now) continue;
      if (!state.info) {
        if (maxRemaining < 0) bestIndex = index;
        continue;
      }
      if (state.info.remaining > maxRemaining) {
        maxRemaining = state.info.remaining;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  shouldRotate(): boolean {
    const now = Date.now();
    if (now - this.lastRotation < TUNING.ROTATION_COOLDOWN) return false;

    const current = this.getCurrentTokenState();
    if (!current?.info) return true;
    if (current.info.remaining === 0) return true;

    const bestIndex = this.getBestToken();
    if (bestIndex === this.currentTokenIndex) return false;

    const best = this.states.get(bestIndex);
    return (best?.info?.remaining || 0) > (current.info.remaining + TUNING.HYSTERESIS_BUFFER);
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

    if (current.info.remaining > 0) return 0;

    if (this.shouldRotate()) {
      this.rotate();
      if ((this.getCurrentTokenState()?.info?.remaining || 0) > 0) return 0;
    }

    let minReset = Number.MAX_SAFE_INTEGER;
    let foundValidReset = false;

    for (const state of this.states.values()) {
      if (state.info) {
        minReset = Math.min(minReset, state.info.resetTime);
        foundValidReset = true;
      }
    }

    if (!foundValidReset) return TUNING.FALLBACK_WAIT;

    const wait = minReset - Date.now();
    return wait > 0 ? wait + TUNING.RESET_PADDING : 0;
  }

  getDelay(): number {
    const current = this.getCurrentTokenState();
    if (!current?.info) return TUNING.THROTTLE_NORMAL;

    const ratio = current.info.remaining / current.info.limit;
    if (ratio < 0.1) return TUNING.THROTTLE_LOW;
    return TUNING.THROTTLE_NORMAL;
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
    const now = Date.now();

    await Promise.all(this.tokens.map(async (token, i) => {
      const state = this.states.get(i);

      if (state?.info &&
        state.info.remaining > 5 &&
        (now - state.lastUpdated) < FARM_CONSTANTS.SCAN.TOKEN_REFRESH_INTERVAL) {
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
