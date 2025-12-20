import { logger } from '../utils/logger';
import { rateLimitOptimizer } from './rateLimitOptimizer';

export let rateLimitPauseUntil: number | null = null;
export let rateLimitActive = false;
export let rateLimitWarned = false;
export let lastRateLimitResetTime: number | null = null;
let lastRateLimitSetTime = 0;
let lastActualCheckTime = 0;

export async function checkActualRateLimitStatus(): Promise<boolean> {
  try {
    const now = Date.now();
    if (now - lastActualCheckTime < 30000) {
      return rateLimitActive;
    }
    lastActualCheckTime = now;
    await rateLimitOptimizer.refreshAllTokenStatuses();
    const status = rateLimitOptimizer.getStatus();
    let allTokensExhausted = true;
    let earliestReset = 0;
    for (const token of status.tokens) {
      if (token.codeSearchRemaining !== null && token.codeSearchRemaining > 0) {
        allTokensExhausted = false;
        break;
      }
      if (token.codeSearchReset !== null && (earliestReset === 0 || token.codeSearchReset < earliestReset)) {
        earliestReset = token.codeSearchReset;
      }
    }
    if (!allTokensExhausted && rateLimitActive) {
      logger.init('[GITHUB] Token rotation available, clearing rate limit state and resuming...');
      clearRateLimit();
      return false;
    }
    if (allTokensExhausted) {
      if (earliestReset > 0) {
        if (!rateLimitActive || !rateLimitPauseUntil || earliestReset > rateLimitPauseUntil) {
          setRateLimit(earliestReset);
        }
      } else {
        const defaultWaitTime = Date.now() + 3600000;
        if (!rateLimitActive || !rateLimitPauseUntil || defaultWaitTime > rateLimitPauseUntil) {
          setRateLimit(defaultWaitTime);
        }
      }
      return true;
    }
    return false;
  } catch (error) {
    if (error instanceof Error && !error.message?.includes('timeout')) {
      logger.error('[GITHUB] Failed to check rate limit status: ' + error.message);
    }
    return rateLimitActive;
  }
}

export function initializeRateLimitManager() {
  logger.init('[GITHUB] Initializing rate limit manager...');
  clearRateLimit();
}

export async function waitForRateLimitIfNeeded() {
  if (rateLimitPauseUntil && Date.now() < rateLimitPauseUntil) {
    const waitTime = rateLimitPauseUntil - Date.now();
    const waitSec = Math.ceil(waitTime / 1000);
    const waitMin = Math.floor(waitSec / 60);
    const waitSecRemaining = waitSec % 60;
    if (!rateLimitWarned) {
      logger.warn(`[GITHUB] Rate limit reached. Waiting ${waitMin}m ${waitSecRemaining}s for reset. Scanner will resume automatically.`);
      rateLimitWarned = true;
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
    logger.init('[GITHUB] Rate limit reset, resuming scans...');
    clearRateLimit();
    return;
  }
  if (rateLimitPauseUntil && rateLimitPauseUntil < Date.now() - 30000) {
    logger.init('[GITHUB] Clearing old rate limit state, resuming scans...');
    clearRateLimit();
    return;
  }
  if (lastRateLimitSetTime && (Date.now() - lastRateLimitSetTime) > 2 * 60 * 1000) {
    logger.init('[GITHUB] Force clearing rate limit state after 2 minutes...');
    clearRateLimit();
    return;
  }
}

export function setRateLimit(resetTime: number) {
  const status = rateLimitOptimizer.getStatus();
  let hasAvailableToken = false;
  for (const token of status.tokens) {
    if (token.codeSearchRemaining !== null && token.codeSearchRemaining > 0) {
      hasAvailableToken = true;
      break;
    }
  }
  if (hasAvailableToken) {
    return;
  }
  const now = Date.now();
  if (resetTime <= now) {
    return;
  }
  if (now - lastRateLimitSetTime < 30000) {
    return;
  }
  if (!rateLimitPauseUntil || resetTime > rateLimitPauseUntil) {
    rateLimitPauseUntil = resetTime;
    rateLimitActive = true;
    lastRateLimitSetTime = now;
    if (!rateLimitWarned) {
      logger.warn(`[GITHUB] All tokens exhausted (${status.tokenCount} tokens), code will be resumed after reset.`);
      rateLimitWarned = true;
    }
  }
}

export function clearRateLimit() {
  rateLimitActive = false;
  rateLimitPauseUntil = null;
  rateLimitWarned = false;
  lastRateLimitSetTime = 0;
  lastRateLimitResetTime = Date.now();
}

export function forceClearRateLimit() {
  logger.init('[GITHUB] Force clearing rate limit state...');
  clearRateLimit();
}

export function isRateLimitStuck(): boolean {
  if (!rateLimitActive || !rateLimitPauseUntil) {
    return false;
  }
  const now = Date.now();
  const timeInRateLimit = now - lastRateLimitSetTime;
  if (timeInRateLimit > 10 * 60 * 1000) {
    return true;
  }
  if (rateLimitPauseUntil < now) {
    return true;
  }
  return false;
}

export function validateSearchRateLimitHeaders(remaining: string, limit: string): boolean {
  const remainingNum = parseInt(remaining, 10);
  const limitNum = parseInt(limit, 10);
  if (limitNum === 10 && remainingNum === 0) {
    return true;
  }
  return false;
}

export function getRateLimitStatus(): {
  active: boolean;
  pauseUntil: number | null;
  warned: boolean;
  timeInRateLimit: number;
  stuck: boolean;
} {
  const now = Date.now();
  const timeInRateLimit = lastRateLimitSetTime ? now - lastRateLimitSetTime : 0;
  return {
    active: rateLimitActive,
    pauseUntil: rateLimitPauseUntil,
    warned: rateLimitWarned,
    timeInRateLimit,
    stuck: isRateLimitStuck()
  };
}
