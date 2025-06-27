import { logger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/environment';

// --- Global Rate Limit State ---
export let rateLimitPauseUntil: number | null = null;
export let rateLimitActive = false;
export let rateLimitWarned = false;
export let lastRateLimitResetTime: number | null = null;
let lastRateLimitSetTime = 0;
let lastActualCheckTime = 0;

// Check actual GitHub token rate limit status
export async function checkActualRateLimitStatus(): Promise<boolean> {
  try {
    // Throttle checks to avoid too many API calls
    const now = Date.now();
    if (now - lastActualCheckTime < 5000) { // Only check every 5 seconds
      return rateLimitActive;
    }
    lastActualCheckTime = now;
    
    const response = await axios.get('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'API-Radar-Scanner/1.0',
      },
      timeout: 10000,
    });
    
    const coreLimit = response.data.resources.core;
    const codeSearchLimit = response.data.resources.code_search; // This is the correct API we're using
    const isCoreRateLimited = coreLimit.remaining === 0;
    const isCodeSearchRateLimited = codeSearchLimit.remaining === 0;
    
    // Check if either core or code search is rate limited
    const isRateLimited = isCoreRateLimited || isCodeSearchRateLimited;
    
    // Clear rate limit if we have tokens available in both APIs
    // For code search API, we need at least 1 token available (more lenient)
    if (!isRateLimited && rateLimitActive && coreLimit.remaining > 100 && codeSearchLimit.remaining >= 1) {
      logger.init('[GITHUB] Token is no longer rate limited, clearing state and resuming...');
      clearRateLimit();
      return false;
    }
    
    return isRateLimited;
  } catch (error) {
    logger.error('[GITHUB] Failed to check rate limit status: ' + (error instanceof Error ? error.message : String(error)));
    return rateLimitActive; // Return current state if we can't check
  }
}

// Force clear rate limit state on startup
export function initializeRateLimitManager() {
  logger.init('[GITHUB] Initializing rate limit manager...');
  clearRateLimit();
}

export async function waitForRateLimitIfNeeded() {
  // Always check actual token status first
  const isStillRateLimited = await checkActualRateLimitStatus();
  if (!isStillRateLimited) {
    return; // Token is available, exit immediately
  }
  
  // Check if we're past the rate limit reset time
  if (rateLimitPauseUntil && Date.now() >= rateLimitPauseUntil) {
    logger.init('[GITHUB] Rate limit reset, resuming scans...');
    clearRateLimit();
    return;
  }
  
  // If we have an old rate limit state that's way in the past, clear it
  if (rateLimitPauseUntil && rateLimitPauseUntil < Date.now() - 30000) { // 30 seconds ago
    logger.init('[GITHUB] Clearing old rate limit state, resuming scans...');
    clearRateLimit();
    return;
  }
  
  // Force clear if we've been in rate limit state for more than 2 minutes
  if (lastRateLimitSetTime && (Date.now() - lastRateLimitSetTime) > 2 * 60 * 1000) {
    logger.init('[GITHUB] Force clearing rate limit state after 2 minutes...');
    clearRateLimit();
    return;
  }
  
  // For search API rate limits, enforce a minimum wait time of 60 seconds
  // since the search API resets every minute
  if (lastRateLimitSetTime && (Date.now() - lastRateLimitSetTime) < 60000) {
    await new Promise(res => setTimeout(res, 60000 - (Date.now() - lastRateLimitSetTime)));
  }
  
  while (rateLimitPauseUntil && Date.now() < rateLimitPauseUntil) {
    // Check actual token status every 10 seconds while waiting (less frequent)
    if (Date.now() % 10000 < 1000) { // Every ~10 seconds
      const currentStatus = await checkActualRateLimitStatus();
      if (!currentStatus) {
        return; // Token is available, exit immediately
      }
    }
    
    if (!rateLimitWarned) {
      const waitSec = Math.ceil((rateLimitPauseUntil - Date.now()) / 1000);
      const waitMin = Math.floor(waitSec / 60);
      const waitSecRemaining = waitSec % 60;
      logger.warn(`[GITHUB] Rate limit reached. Waiting ${waitMin}m ${waitSecRemaining}s for reset. Scanner will resume automatically.`);
      rateLimitWarned = true;
    }
    await new Promise(res => setTimeout(res, 1000));
  }
}

export function setRateLimit(resetTime: number) {
  const now = Date.now();
  
  // If the reset time is in the past, don't set rate limit
  if (resetTime <= now) {
    return;
  }
  
  // Prevent rapid-fire rate limit settings (within 30 seconds)
  if (now - lastRateLimitSetTime < 30000) {
    return;
  }
  
  // Only set rate limit if it's not already set or if the new reset time is later
  if (!rateLimitPauseUntil || resetTime > rateLimitPauseUntil) {
    rateLimitPauseUntil = resetTime;
    rateLimitActive = true;
    lastRateLimitSetTime = now;
    
    // Only show warning if we haven't already warned for this rate limit period
    if (!rateLimitWarned) {
      logger.warn(`[GITHUB] 5000 tokens used, code will be resumed after it resets.`);
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

// Add function to check if rate limit state is stuck
export function isRateLimitStuck(): boolean {
  if (!rateLimitActive || !rateLimitPauseUntil) {
    return false;
  }
  
  const now = Date.now();
  const timeInRateLimit = now - lastRateLimitSetTime;
  
  // Consider stuck if we've been in rate limit for more than 10 minutes
  if (timeInRateLimit > 10 * 60 * 1000) {
    return true;
  }
  
  // Consider stuck if reset time is in the past
  if (rateLimitPauseUntil < now) {
    return true;
  }
  
  return false;
}

// Add function to validate search API rate limit headers
export function validateSearchRateLimitHeaders(remaining: string, limit: string): boolean {
  const remainingNum = parseInt(remaining, 10);
  const limitNum = parseInt(limit, 10);
  
  // Check if this looks like a code search API rate limit
  if (limitNum === 10 && remainingNum === 0) {
    return true;
  }
  
  return false;
}

// Add function to get rate limit status for debugging
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