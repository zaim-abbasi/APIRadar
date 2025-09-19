import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { githubService } from './github';
import { ILeak, Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { waitForRateLimitIfNeeded, setRateLimit, rateLimitActive, rateLimitPauseUntil, clearRateLimit, initializeRateLimitManager, lastRateLimitResetTime, checkActualRateLimitStatus, isRateLimitStuck } from './rateLimitManager';
import axios from 'axios';
import { ConfigurationService } from './ConfigurationService';

// Search patterns with provider names
const SEARCH_PATTERNS = [
  {
    provider: 'anthropic',
    pattern: /\b(sk-ant-api\d{2}-[a-zA-Z0-9]{32,})\b/g,
    searchString: 'sk-ant-api'  // Explicit, optimized search string
  },
  {
    provider: 'google_gemini',
    pattern: /\bAIza[0-9A-Za-z]{35,36}\b/g,
    searchString: 'AIza'
  },
  {
    provider: 'openai',
    pattern: /\b(sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,})\b/g,
    searchString: 'sk-'
  }
];

// Enhanced regex patterns with boundary checks and documentation
const PROVIDER_PATTERNS: { [provider: string]: RegExp } = (() => {
  const patternMap: { [provider: string]: RegExp } = {};
  
  SEARCH_PATTERNS.forEach(({ provider, pattern }) => {
    patternMap[provider] = pattern;
  });
  
  return patternMap;
})();

// File types to search in
const ENV_VARIATIONS = [
  '.env',  // This will catch all .env* files
  'config.json', 
  'secrets.yaml', 
  'docker-compose.yml', 
  'docker-compose.yaml'
];

// Generate comprehensive search queries using patterns and file types
const generateComprehensiveQueries = () => {
  const queries: string[] = [];
  
  // Generate queries for ALL file types × ALL patterns
  ENV_VARIATIONS.forEach(fileType => {
    SEARCH_PATTERNS.forEach(({ searchString }) => {
      queries.push(`filename:${fileType} ${searchString}`);
    });
  });
  
  return queries;
};

// Combine all search queries - comprehensive coverage
const ALL_SEARCH_QUERIES = generateComprehensiveQueries();

// Group queries by provider for rotation
const PROVIDER_QUERIES = {
  openai: ALL_SEARCH_QUERIES.filter(query => query.includes('sk-') && !query.includes('sk-ant-api')),
  google_gemini: ALL_SEARCH_QUERIES.filter(query => query.includes('AIza')),
  anthropic: ALL_SEARCH_QUERIES.filter(query => query.includes('sk-ant-api'))
};

// Configuration constants with fallback defaults
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 100;

// Type definitions for better type safety
interface GitHubSearchItem {
  repository: {
    full_name: string;
    html_url: string;
  };
  path: string;
}

// Update: Make all fields optional and allow both snake_case and camelCase for compatibility
interface GitHubRepoMetadata {
  created_at?: string;
  createdAt?: string;
  name?: string;
  full_name?: string;
  riskyFiles?: string[];
  contributors?: number;
  hasReadme?: boolean;
  commitCount?: number;
  [key: string]: any;
}

// Filter out placeholder/demo keys that contain common placeholder words
function isPlaceholderKey(key: string): boolean {
  const placeholderWords = [
    'your', 'key', 'demo', 'example', 'placeholder', 'template', 
    'sample', 'test', 'fake', 'dummy', 'mock', 'production', 'development',
    'staging', 'local', 'config', 'secret', 'password', 'token'
  ];
  const lowerKey = key.toLowerCase();
  // Ignore keys that are just sk-xxxx... or sk-xxxxxxxx... (all x or X)
  if (/^sk-([x]{4,}|[x]{20,})$/i.test(key)) return true;
  return placeholderWords.some(word => lowerKey.includes(word));
}

// Key validation functions with stricter validation for generic patterns
function isValidOpenAIKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
  // Ignore keys that are just sk-xxxx... or sk-xxxxxxxx... (all x or X)
  if (/^sk-([x]{4,}|[x]{20,})$/i.test(key)) return false;
  // Use the same pattern as in SEARCH_PATTERNS
  return /^sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,}$/.test(key);
}

function isValidGeminiKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
  // Ignore keys that are just sk-xxxx... or sk-xxxxxxxx... (all x or X)
  if (/^sk-([x]{4,}|[x]{20,})$/i.test(key)) return false;
  // Use the same pattern as in SEARCH_PATTERNS
  return /^AIza[0-9A-Za-z]{35,36}$/.test(key);
}

function isValidAnthropicKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
  // Ignore keys that are just sk-xxxx... or sk-xxxxxxxx... (all x or X)
  if (/^sk-([x]{4,}|[x]{20,})$/i.test(key)) return false;
  // Use the same pattern as in SEARCH_PATTERNS
  return /^sk-ant-api\d{2}-[a-zA-Z0-9]{32,}$/.test(key);
}

// Provider validation mapping
const KEY_VALIDATORS: Record<string, (key: string) => boolean> = {
  openai: isValidOpenAIKey,
  google_gemini: isValidGeminiKey,
  anthropic: isValidAnthropicKey
};

function redactKey(key: string): string {
  if (key.length <= 8) return key;
  // Use a fixed number of asterisks (12) to ensure consistent length
  const fixedAsterisks = 12;
  return `${key.substring(0, 4)}${'*'.repeat(fixedAsterisks)}${key.substring(key.length - 4)}`;
}

async function fetchRawFileContent(repoFullName: string, filePath: string, ref: string): Promise<string | null> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${ref}/${filePath}`;
    const response = await axios.get(rawUrl, {
      timeout: 15000,
      transformResponse: [data => data]
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch (error) {
    return null;
  }
}

async function alreadyScanned(repoUrl: string, filePath: string, commitHash: string): Promise<boolean> {
  try {
    const recentScan = await ScanAttempt.findOne({
      repoUrl,
      filePath,
      commitHash
    }).lean();
    return !!recentScan;
  } catch (error) {
    logger.warn(`[FARM] Database query failed for duplicate check: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function extractApiKeys(content: string): { key: string, provider: string }[] {
  const results: { key: string, provider: string }[] = [];
  const foundKeys = new Set<string>();

  for (const [provider, regex] of Object.entries(PROVIDER_PATTERNS)) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      // Use capture group 1 if available, otherwise use the full match
      const key = match[1] || match[0];
      
      // Skip exact duplicates and invalid keys
      const validator = KEY_VALIDATORS[provider];
      if (foundKeys.has(key) || !validator || !validator(key)) {
        continue;
      }
      
      foundKeys.add(key);
      results.push({ key, provider });
    }
  }
  
  // Only log if keys were found
  if (results.length > 0) {
    const keyCounts = results.reduce((acc, { provider }) => {
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.warn(`[FARM] Found ${results.length} API keys: ${Object.entries(keyCounts).map(([p, c]) => `${p}:${c}`).join(', ')}`);
  }
  
  return results;
}

// --- In-memory cache for already scanned (repo, file, commit) ---
const scannedCache = new Set<string>();

// --- Resume tracking with provider rotation ---
interface ScanResumeState {
  currentProviderIndex: number;
  currentQueryIndex: number;
  currentPage: number;
  lastProcessedTime: number;
  providerStates: {
    openai: { queryIndex: number; page: number };
    google_gemini: { queryIndex: number; page: number };
    anthropic: { queryIndex: number; page: number };
  };
}

let scanResumeState: ScanResumeState = {
  currentProviderIndex: 0,
  currentQueryIndex: 0,
  currentPage: 1,
  lastProcessedTime: Date.now(),
  providerStates: {
    openai: { queryIndex: 0, page: 1 },
    google_gemini: { queryIndex: 0, page: 1 },
    anthropic: { queryIndex: 0, page: 1 }
  }
};

// Save resume state to persist across restarts
async function saveResumeState() {
  try {
    const state = {
      ...scanResumeState,
      savedAt: new Date()
    };
    
    // Save to database for persistence across restarts
    const success = await ConfigurationService.setScanState(state);
    if (!success) {
      logger.warn('[FARM] Failed to save scan state to database');
    }
    
    // Also keep in memory for current session
    (global as any).scanResumeState = state;
    
    // Only log state saves during startup or errors, not during normal operation
    if (!(global as any).scanResumeState) {
      logger.warn(`[FARM] Scan state saved: provider ${scanResumeState.currentProviderIndex}, query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to save resume state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Load resume state
async function loadResumeState(): Promise<ScanResumeState> {
  try {
    // Try to load from database first
    const saved = await ConfigurationService.getScanState();
    
    // Validate the saved state
    if (saved && typeof saved.currentQueryIndex === 'number' && typeof saved.currentPage === 'number') {
      scanResumeState = {
        currentProviderIndex: saved.currentProviderIndex || 0,
        currentQueryIndex: saved.currentQueryIndex || 0,
        currentPage: saved.currentPage || 1,
        lastProcessedTime: saved.lastProcessedTime || Date.now(),
        providerStates: saved.providerStates || {
          openai: { queryIndex: 0, page: 1 },
          google_gemini: { queryIndex: 0, page: 1 },
          anthropic: { queryIndex: 0, page: 1 }
        }
      };
      
      // Also set in memory
      (global as any).scanResumeState = scanResumeState;
      
      // Only log on first load
      if (!(global as any).scanResumeState) {
        logger.warn(`[FARM] Resuming scan: provider ${scanResumeState.currentProviderIndex}, query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
      }
      return scanResumeState;
    } else {
      logger.warn(`[FARM] Invalid state format in database, resetting to beginning`);
    }
    
    // Fallback to memory state if database doesn't have valid state
    if ((global as any).scanResumeState) {
      const saved = (global as any).scanResumeState as any;
      scanResumeState = {
        currentProviderIndex: saved.currentProviderIndex || 0,
        currentQueryIndex: saved.currentQueryIndex || 0,
        currentPage: saved.currentPage || 1,
        lastProcessedTime: saved.lastProcessedTime || Date.now(),
        providerStates: saved.providerStates || {
          openai: { queryIndex: 0, page: 1 },
          google_gemini: { queryIndex: 0, page: 1 },
          anthropic: { queryIndex: 0, page: 1 }
        }
      };
      return scanResumeState;
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to load resume state: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Reset to beginning only if no saved state exists
  scanResumeState = {
    currentProviderIndex: 0,
    currentQueryIndex: 0,
    currentPage: 1,
    lastProcessedTime: Date.now(),
    providerStates: {
      openai: { queryIndex: 0, page: 1 },
      google_gemini: { queryIndex: 0, page: 1 },
      anthropic: { queryIndex: 0, page: 1 }
    }
  };
  return scanResumeState;
}

// Utility function to clear scan state and reset to beginning
async function clearScanState(): Promise<void> {
  try {
    // Clear the state from database
    const success = await ConfigurationService.setScanState({
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1 },
        google_gemini: { queryIndex: 0, page: 1 },
        anthropic: { queryIndex: 0, page: 1 }
      }
    });
    
    if (success) {
      logger.warn(`[FARM] Scan state cleared from database`);
    } else {
      logger.warn(`[FARM] Failed to clear scan state from database`);
    }
    
    // Reset in-memory state
    scanResumeState = {
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1 },
        google_gemini: { queryIndex: 0, page: 1 },
        anthropic: { queryIndex: 0, page: 1 }
      }
    };
    
    // Clear global state
    delete (global as any).scanResumeState;
    
    logger.warn(`[FARM] Scan state cleared, will start from beginning on next restart`);
  } catch (error) {
    logger.warn(`[FARM] Failed to clear scan state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Patch retry wrapper to call waitForRateLimitIfNeeded before each attempt
async function retry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastErr: any;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });
      
      const resultPromise = fn();
      return await Promise.race([resultPromise, timeoutPromise]);
    } catch (err: any) {
      // Always set lastErr to ensure we have a valid error to throw
      lastErr = err;
      
      // Detect GitHub rate limit error with better validation
      if (err.response && err.response.status === 403 && err.response.headers) {
        const remaining = err.response.headers['x-ratelimit-remaining'];
        const reset = err.response.headers['x-ratelimit-reset'];
        const limit = err.response.headers['x-ratelimit-limit'];
        const message = err.response.data?.message || '';
        
        const shortLog = `[GITHUB] 403: limit=${limit}, remaining=${remaining}, reset=${reset}, msg=${message.slice(0, 80)}...`;
        logger.warn(shortLog);

        // Handle code search rate limit (10 requests per minute)
        if (
          remaining === '0' &&
          (limit === '10' || limit === 10) &&
          reset &&
          Number(reset) * 1000 > Date.now()
        ) {
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          attempt++;
          continue;
        }

        // Handle core API rate limit (5000 requests per hour)
        if (
          remaining === '0' &&
          (limit === '5000' || limit === 5000) &&
          reset &&
          Number(reset) * 1000 > Date.now()
        ) {
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          attempt++;
          continue;
        }

        // Handle secondary/abuse rate limits (message contains 'abuse' or 'secondary')
        if (message.toLowerCase().includes('abuse') || message.toLowerCase().includes('secondary')) {
          logger.warn('[GITHUB] Secondary or abuse rate limit detected. Retrying after backoff...');
          await new Promise(res => setTimeout(res, 60000)); // Wait 1 minute before retry
          attempt++;
          continue;
        }

        // If we have rate limit headers but they don't match known patterns, still treat as rate limit
        if (remaining === '0' && reset && Number(reset) * 1000 > Date.now()) {
          logger.warn('[GITHUB] Unknown rate limit pattern detected, treating as rate limit...');
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          attempt++;
          continue;
        }

        // If not a real rate limit, treat as a generic 403 and retry after a short delay
        logger.warn('[GITHUB] 403 received but not a real rate limit. Retrying after short delay...');
        await new Promise(res => setTimeout(res, 5000));
        attempt++;
        continue;
      }
      
      // For non-403 errors, wait before retry
      await new Promise(res => setTimeout(res, RETRY_BASE_DELAY));
      attempt++;
    }
  }
  
  // Ensure we always throw a valid error
  if (!lastErr) {
    lastErr = new Error('Retry failed after maximum attempts');
  }
  throw lastErr;
}

// --- Batched upsert for leaks and scan attempts ---
async function batchUpsertLeaks(leaks: Partial<ILeak>[]) {
  if (!leaks.length) return;
  
  try {
    const ops = leaks.map(leak => ({
      updateOne: {
        filter: { repoUrl: leak.repoUrl, redactedKey: leak.redactedKey, provider: leak.provider, filePath: leak.filePath },
        update: leak,
        upsert: true
      }
    }));
    
    const result = await Leak.bulkWrite(ops, { ordered: false });
    
    // Check which leaks were actually inserted (new) vs updated
    const newLeaks: Partial<ILeak>[] = [];
    if (result.upsertedIds && Object.keys(result.upsertedIds).length > 0) {
      // Some leaks were inserted (new)
      for (let i = 0; i < leaks.length; i++) {
        const leak = leaks[i];
        if (result.upsertedIds[i] && leak) {
          newLeaks.push(leak);
        }
      }
    }
    // Removed: GitHub issue creation for new leaks
  } catch (error: any) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      // Check if it's a fullKey duplicate (which we want to prevent)
      if (error.message && error.message.includes('fullKey')) {
        logger.warn(`[FARM] Duplicate API key detected (fullKey): ${error.message}`);
        // For fullKey duplicates, we should not save the duplicate
        return;
      }
      // This is a duplicate key error for the compound index, which is expected when the same leak is found multiple times
      // We can safely ignore this as the upsert should have handled it
      logger.warn(`[FARM] Duplicate leak detected (expected): ${error.message}`);
    } else {
      // Log other errors
      logger.error(`[FARM] Failed to save leaks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function batchInsertScanAttempts(attempts: any[]) {
  if (!attempts.length) return;
  
  try {
    await ScanAttempt.insertMany(attempts, { ordered: false });
  } catch (error: any) {
    // Handle duplicate key errors gracefully for scan attempts too
    if (error.code === 11000) {
      logger.warn(`[FARM] Duplicate scan attempt detected (expected): ${error.message}`);
    } else {
      logger.error(`[FARM] Failed to save scan attempts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// --- Main Service ---
export class GitHubCodeLeakFarmService {
  private running = false;
  constructor() {
    // Initialize rate limit manager to clear any old state
    initializeRateLimitManager();
  }

  public start() {
    if (this.running) {
      logger.warn('[FARM] Service is already running');
      return;
    }

    this.running = true;
    logger.init('[FARM] Starting GitHub code leak farm service...');
    
    // Immediately check and reinitialize configurations if needed
    this.immediateConfigCheck();
    
    // Start the main scan loop
    this.scanLoop();
  }

  private async immediateConfigCheck() {
    try {
      logger.init('[FARM] Performing immediate configuration check...');
      const wasReinitialized = await ConfigurationService.checkAndReinitialize();
      if (wasReinitialized) {
        logger.warn('[FARM] Configuration was missing and has been reinitialized on startup');
        // Reload scan state after reinitialization
        scanResumeState = await loadResumeState();
      } else {
        logger.init('[FARM] All configurations are present, proceeding with scan');
      }
    } catch (error) {
      logger.error(`[FARM] Immediate configuration check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public stop() {
    this.running = false;
    
    // Save current state before stopping
    saveResumeState();
    
    logger.status('farm', 'Service stopped', 'GitHubCodeLeakFarm');
  }

  public clearState() {
    clearScanState();
  }

  private async scanLoop(): Promise<void> {
    try {
      let lastStatusLog = Date.now();
      let lastRateLimitCheck = Date.now();
      let lastConfigCheck = Date.now();
      const STATUS_LOG_INTERVAL = 1 * 60 * 1000; // 1 minute
      const RATE_LIMIT_CHECK_INTERVAL = 10 * 1000; // 10 seconds
      const CONFIG_CHECK_INTERVAL = 30 * 1000; // 30 seconds
      let firstCycle = true;
      let scanCompleted = false;
      while (this.running) {
        // Check configurations every 30 seconds
        if (Date.now() - lastConfigCheck > CONFIG_CHECK_INTERVAL) {
          lastConfigCheck = Date.now();
          try {
            const wasReinitialized = await ConfigurationService.checkAndReinitialize();
            if (wasReinitialized) {
              logger.warn('[FARM] Configuration was missing and has been reinitialized');
              // Reload scan state after reinitialization
              scanResumeState = await loadResumeState();
              scanCompleted = false; // Reset completion flag if config was reinitialized
            }
          } catch (error) {
            logger.error(`[FARM] Configuration check failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Check if we're currently rate limited
        if (rateLimitActive && rateLimitPauseUntil) {
          // Check if rate limit state is stuck
          if (isRateLimitStuck()) {
            logger.init('[GITHUB] Detected stuck rate limit state, force clearing...');
            clearRateLimit();
            continue;
          }
          
          // Check actual token status every 30 seconds
          if (Date.now() - lastRateLimitCheck > RATE_LIMIT_CHECK_INTERVAL) {
            lastRateLimitCheck = Date.now();
            const isStillRateLimited = await checkActualRateLimitStatus();
            if (!isStillRateLimited) {
              // Token is no longer rate limited, continue with scanning
              continue;
            }
          }
          
          // If the rate limit time is in the past, force clear it
          if (rateLimitPauseUntil < Date.now()) {
            logger.init('[GITHUB] Detected rate limit has expired, clearing state...');
            clearRateLimit();
          } else {
            await waitForRateLimitIfNeeded();
            continue; // Skip the rest of the loop while rate limited
          }
        }
        
        // Additional check: if we have old rate limit state that's more than 5 minutes old, clear it
        if (lastRateLimitResetTime && (Date.now() - lastRateLimitResetTime) > 5 * 60 * 1000) {
          logger.init('[GITHUB] Clearing old rate limit state (more than 5 minutes old)...');
          clearRateLimit();
        }
        
        // If scan is completed, don't continue scanning
        if (scanCompleted) {
          if (firstCycle) {
            logger.init('Scan cycle completed. System is idle, waiting for manual restart or configuration changes...');
            firstCycle = false;
          } else if (Date.now() - lastStatusLog > STATUS_LOG_INTERVAL) {
            logger.init('Scan cycle completed. System is idle, waiting for manual restart or configuration changes...');
            lastStatusLog = Date.now();
          }
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        let scannedAnything = false;
        try {
          scannedAnything = await this.executeScanCycle();
          // Check if scan cycle is complete
          if (!scannedAnything) {
            let state: ScanResumeState | null = null;
            try {
              state = await loadResumeState();
            } catch (stateErr) {
              logger.error('[FARM] Failed to load scan state, resetting: ' + (stateErr instanceof Error ? stateErr.stack : String(stateErr)));
              await clearScanState();
              scanCompleted = false;
              continue;
            }
            if (!state || typeof state !== 'object' || !state.providerStates) {
              logger.error('[FARM] Scan state is invalid or corrupted, resetting.');
              await clearScanState();
              scanCompleted = false;
              continue;
            }
            const allDone = this.isScanStateComplete(state);
            if (allDone) {
              scanCompleted = true;
              logger.warn('[FARM] Scan cycle completed - no more files to process');
            } else {
              logger.warn('[FARM] Scan state not complete, continuing scan...');
              scanCompleted = false;
            }
          }
          scanResumeState = await loadResumeState();
        } catch (error) {
          logger.error('[FARM] Scan cycle error: ' + (error instanceof Error ? error.stack : String(error)));
          await clearScanState();
          scanCompleted = false;
          continue;
        }
        
        // Only show idle message if not rate limited and no scanning occurred
        if (!rateLimitActive && !scannedAnything) {
          if (firstCycle) {
            logger.init('No new files to scan. System is idle, waiting for new changes...');
            firstCycle = false;
          } else if (Date.now() - lastStatusLog > STATUS_LOG_INTERVAL) {
            logger.init('No new files to scan. System is idle, waiting for new changes...');
            lastStatusLog = Date.now();
          }
        }
      }
    } catch (fatalError) {
      logger.error('[FARM] FATAL: Unhandled error in scanLoop: ' + (fatalError instanceof Error ? fatalError.stack : String(fatalError)));
      setTimeout(() => this.scanLoop(), 10000);
    }
  }

  private isScanStateComplete(state: ScanResumeState): boolean {
    const providerNames: Array<keyof typeof PROVIDER_QUERIES> = ['openai', 'google_gemini', 'anthropic'];
    const MAX_PAGE = 100; // GitHub search API limit is 1000 results (100 pages × 10 results)
    for (const provider of providerNames) {
      const providerState = state.providerStates[provider];
      if (!providerState || providerState.page <= MAX_PAGE) {
        return false;
      }
    }
    return true;
  }

  private async executeScanCycle(): Promise<boolean> {
    let scannedAnything = false;
    try {
      // Load resume state at the start of each cycle
      const resumeState = await loadResumeState();
      
      // Get provider names for rotation
      const providerNames: Array<keyof typeof PROVIDER_QUERIES> = ['openai', 'google_gemini', 'anthropic'];
      
      // Ensure currentProviderIndex is within bounds
      const validProviderIndex = Math.max(0, Math.min(resumeState.currentProviderIndex, providerNames.length - 1));
      const currentProvider = providerNames[validProviderIndex];
      
      // Ensure currentProvider is defined
      if (!currentProvider) {
        logger.error(`[FARM] Invalid provider index: ${resumeState.currentProviderIndex}, resetting to 0`);
        scanResumeState.currentProviderIndex = 0;
        await saveResumeState();
        return false;
      }
      
      // Type assertion since we've verified currentProvider exists
      const typedCurrentProvider = currentProvider as keyof typeof PROVIDER_QUERIES;
      const providerQueries = PROVIDER_QUERIES[typedCurrentProvider];
      
      // Get current provider state and ensure it exists
      const providerState = resumeState.providerStates[typedCurrentProvider] || { queryIndex: 0, page: 1 };
      let queryIndex = providerState.queryIndex;
      let page = providerState.page;
      
      // Update resume state to current position
      scanResumeState.currentProviderIndex = validProviderIndex;
      scanResumeState.currentQueryIndex = queryIndex;
      scanResumeState.currentPage = page;
      
      try {
        // Process current provider's current query (one page only)
        const query = providerQueries[queryIndex];
        if (query) {
          await this.processOnePageForQuery(query, page);
          scannedAnything = true;
          
          // Only log when there's actual scanning activity
          logger.warn(`[FARM] Processed ${typedCurrentProvider} (query ${queryIndex + 1}/${providerQueries.length}, page ${page})`);
        }
        
        // Move to next query/page for this provider
        queryIndex++;
        if (queryIndex >= providerQueries.length) {
          queryIndex = 0;
          page++;
        }
        
        // If any provider's page exceeds 120, reset all to page 1 and log
        const MAX_PAGE = 100; // GitHub search API limit is 1000 results (100 pages × 10 results)
        let shouldResetPages = false;
        for (const provider of providerNames) {
          const state = scanResumeState.providerStates[provider] || { queryIndex: 0, page: 1 };
          if (state.page > MAX_PAGE) {
            shouldResetPages = true;
            break;
          }
        }
        if (shouldResetPages) {
          for (const provider of providerNames) {
            scanResumeState.providerStates[provider] = { queryIndex: 0, page: 1 };
          }
          scanResumeState.currentPage = 1;
          scanResumeState.currentQueryIndex = 0;
          // Reset the current provider's page and query index too
          page = 1;
          queryIndex = 0;
          logger.warn(`[FARM] Max page reached (> ${MAX_PAGE}). Resetting all providers to page 1 to catch new repos.`);
        }
        
        // Update provider state
        scanResumeState.providerStates[typedCurrentProvider] = { queryIndex, page };
        scanResumeState.currentQueryIndex = queryIndex;
        scanResumeState.currentPage = page;
        scanResumeState.lastProcessedTime = Date.now();
        await saveResumeState();
        
        // Move to next provider after processing one page
        scanResumeState.currentProviderIndex = (validProviderIndex + 1) % providerNames.length;
        
        // Only log when moving to the first provider (indicating a complete cycle)
        if (scanResumeState.currentProviderIndex === 0) {
          logger.warn(`[FARM] Completed scan cycle - all providers processed for current page`);
        }
      } catch (error) {
        this.handleSearchError(error, providerQueries[queryIndex] || 'unknown', page);
      }
      
      return scannedAnything;
    } catch (error) {
      logger.error(`[FARM] Unhandled error in executeScanCycle: ${error instanceof Error ? error.stack : String(error)}`);
      throw error;
    }
  }

  // Process only ONE page for a single query
  private async processOnePageForQuery(query: string, page: number): Promise<void> {
    try {
      await waitForRateLimitIfNeeded();
      if (!this.running) return;
      
      const response = await retry(() => axios.get('https://api.github.com/search/code', {
        params: { q: query, per_page: 10, page },
        headers: {
          'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'API-Radar-Scanner/1.0',
        },
        timeout: 30000,
      }));
      
      const items: GitHubSearchItem[] = response.data?.items || [];
      
      if (items.length === 0) {
        return;
      }
      
      await this.processSearchResults(items, query);
      
    } catch (error: any) {
      // Handle expected errors gracefully instead of treating them as unhandled
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          // Rate limit or permission error - this is expected and handled by retry logic
          logger.warn(`[FARM] Rate limit or permission error for query "${query}" (page ${page}): ${error.message}`);
          return; // Don't re-throw, just return gracefully
        } else if (error.response?.status === 422) {
          // Unprocessable Entity - could be invalid search query or no more results
          const errorMessage = error.response.data?.message || '';
          if (page > 100 || errorMessage.includes('page') || errorMessage.includes('limit') || errorMessage.includes('422')) {
            // No more results available (beyond GitHub's search limit for this query)
            logger.warn(`[FARM] No more results available for query "${query}" (page ${page}): Reached end of results`);
            return; // Don't re-throw, just return gracefully
          } else {
            // Invalid search query syntax
            logger.warn(`[FARM] Invalid search query "${query}" (page ${page}): ${error.message}`);
            return; // Don't re-throw, just return gracefully
          }
        } else if (error.response?.status && error.response.status >= 500) {
          // Server error - this is expected and handled by retry logic
          logger.warn(`[FARM] Server error (${error.response.status}) for query "${query}" (page ${page}): ${error.message}`);
          return; // Don't re-throw, just return gracefully
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          // Timeout error - this is expected and handled by retry logic
          logger.warn(`[FARM] Timeout error for query "${query}" (page ${page}): ${error.message}`);
          return; // Don't re-throw, just return gracefully
        }
      }
      
      // For truly unexpected errors, log them but don't crash the scan loop
      logger.error(`[FARM] Unexpected error in processOnePageForQuery for "${query}" (page ${page}): ${error instanceof Error ? error.message : String(error)}`);
      // Don't re-throw - let the scan continue with the next query/page
    }
  }

  private async processSearchResults(items: GitHubSearchItem[], query: string): Promise<void> {
    let processedCount = 0;
    let skippedCount = 0;
    
    // Process files sequentially
    for (const item of items) {
      await waitForRateLimitIfNeeded();
      if (!this.running) return;
      
      const repoName: string = item.repository.full_name;
      const filePath: string = item.path;
      
      // Exclude documentation files from scan targets
      const docFilePatterns = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^code\_of\_conduct(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];
      const fileName = filePath.split('/').pop() || '';
      if (docFilePatterns.some(pattern => pattern.test(fileName))) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Documentation file (${fileName})`);
        skippedCount++;
        continue;
      }
      
      // Skip files with problematic characters that might cause issues
      if (fileName.includes('#') || fileName.includes('?') || fileName.includes('&')) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Problematic characters in filename (${fileName})`);
        skippedCount++;
        continue;
      }
      
      // Check cache first to avoid any API calls for already processed files
      const cacheKey = `${item.repository.html_url}|${filePath}|${query}`;
      if (scannedCache.has(cacheKey)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in cache (query: ${query})`);
        skippedCount++;
        continue;
      }
      
      // Get commit hash first (this is the most recent state of the file)
      let commitHash = '';
      try {
        await waitForRateLimitIfNeeded();
        commitHash = await retry(() => githubService.getFileLatestCommitHash(repoName, filePath));
      } catch (error) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Failed to get commit hash: ${error instanceof Error ? error.message : String(error)}`);
        skippedCount++;
        continue;
      }
      if (!commitHash) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - No commit hash returned`);
        skippedCount++;
        continue;
      }
      
      // Now check if this specific commit+query combination was already scanned
      const cacheKeyWithCommit = `${item.repository.html_url}|${filePath}|${query}|${commitHash}`;
      if (scannedCache.has(cacheKeyWithCommit)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already scanned with this commit (${commitHash.substring(0, 8)}...)`);
        skippedCount++;
        continue;
      }
      
      // Check database for this specific commit+query combination
      if (await alreadyScanned(item.repository.html_url, filePath, commitHash)) {
        scannedCache.add(cacheKeyWithCommit);
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in database (commit: ${commitHash.substring(0, 8)}...)`);
        skippedCount++;
        continue;
      }
      
      // If we get here, we need to scan the file - make the content API call
      await waitForRateLimitIfNeeded();
      logger.scan(repoName, filePath);
      let content;
      try {
        await waitForRateLimitIfNeeded();
        content = await retry(() => fetchRawFileContent(repoName, filePath, 'HEAD'));
      } catch (error) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Failed to fetch content: ${error instanceof Error ? error.message : String(error)}`);
        skippedCount++;
        continue;
      }
      if (!content) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - No content returned`);
        skippedCount++;
        continue;
      }
      
      try {
        await this.detectAndSaveLeaks(content, repoName, item.repository.html_url, filePath, query, commitHash);
        scannedCache.add(cacheKeyWithCommit);
        processedCount++;
      } catch (error) {
        logger.error(`[FARM] Failed to process leaks for ${repoName}/${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        skippedCount++;
      }
    }
    
    // Only log summary if there was activity
    if (processedCount > 0 || skippedCount > 0) {
      logger.warn(`[FARM] Query "${query}" summary: ${processedCount} files processed, ${skippedCount} files skipped`);
    }
  }

  private async detectAndSaveLeaks(
    content: string,
    repoName: string,
    repoUrl: string,
    filePath: string,
    query: string,
    commitHash: string
  ): Promise<void> {
    // Scan for leaks in all repositories
    const leaks = extractApiKeys(content);
    const foundLeaks: Partial<ILeak>[] = [];
    
    // Check repository creation date for leak filtering
    let repoCreatedAt: Date;
    try {
      repoCreatedAt = await retry(() => this.getRepoCreationDate(repoName));
    } catch (error) {
      logger.error('[FARM] Failed to get repo creation date: ' + (error instanceof Error ? error.message : String(error)));
      // If we can't get creation date, don't save any leaks but still save scan attempt
      await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, false, []);
      return;
    }

    // Get repository age cutoff from database
    /*
    let repositoryAgeCutoff: Date;
    try {
      const cutoff = await ConfigurationService.getRepositoryAgeCutoff();
      if (!cutoff) {
        logger.error('[FARM] Repository age cutoff not found in database. Please set it via the configuration API or restart the service to auto-initialize.');
        logger.error('[FARM] You can also manually reinitialize configurations using: curl -X POST http://localhost:3001/api/config/reinitialize');
        // Don't save any leaks if cutoff is not configured
        await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, false, []);
        return;
      }
      repositoryAgeCutoff = cutoff;
    } catch (error) {
      logger.error('[FARM] Failed to get repository age cutoff from database: ' + (error instanceof Error ? error.message : String(error)));
      logger.error('[FARM] This may indicate a database connectivity issue. Check MongoDB connection and try restarting the service.');
      // Don't save any leaks if we can't get the cutoff
      await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, false, []);
      return;
    }
    */
    // Commented out repository cutoff logic. Always process all repos regardless of age.
    for (const { key, provider } of leaks) {
      try {
        const leakIntroducedAt = await retry(() => this.getLeakIntroductionDate(repoName, filePath));
        // Upsert leak: update if exists for this repoUrl+filePath+provider, else create
        const leakData: Partial<ILeak> = {
          redactedKey: redactKey(key),
          fullKey: key,
          provider,
          repoUrl,
          filePath,
          leakIntroducedAt,
          leakDetectedAt: new Date(),
          repoCreatedAt
        };
        // Blue log for new leak found
        logger.leak(
          provider,
          `${repoName} | ${filePath} | ${redactKey(key)}`
        );
        foundLeaks.push(leakData);
      } catch (error) {
        logger.error('[FARM] Failed to save leak: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    // Save leaks for all repositories (no cutoff)
    if (foundLeaks.length > 0) {
      await batchUpsertLeaks(foundLeaks);
    }
    
    // Always save scan attempt for all repositories (since we scan everything)
    await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, foundLeaks.length > 0, foundLeaks.map(l => l.provider as string));
  }

  private async getRepoCreationDate(repoName: string): Promise<Date> {
    try {
      const repoMeta: GitHubRepoMetadata = await githubService.getRepoMetadata(repoName);
      // Check both snake_case and camelCase for compatibility
      const created = repoMeta.created_at || repoMeta.createdAt;
      return created ? new Date(created) : new Date();
    } catch (error) {
      logger.error('[FARM] Repo metadata error: ' + (error instanceof Error ? error.message : String(error)));
      return new Date();
    }
  }

  private async getLeakIntroductionDate(repoName: string, filePath: string): Promise<Date> {
    return githubService.getFileLatestCommitDate(repoName, filePath);
  }

  private async saveScanAttempt(
    repoUrl: string,
    repoName: string,
    filePath: string,
    commitHash: string,
    query: string,
    leakFound: boolean,
    leakTypes: string[]
  ): Promise<void> {
    try {
      await batchInsertScanAttempts([
        {
          repoUrl,
          fullName: repoName,
          filePath,
          commitHash,
          scannedAt: new Date(),
          leakFound,
          leakTypes,
          queryUsed: query
        }
      ]);
    } catch (error) {
      logger.error('[FARM] ScanAttempt save failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private handleSearchError(error: any, query: string, page: number): void {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        logger.warn(`[FARM] Rate limit hit for query: ${query} (page ${page})`);
      } else if (error.response?.status === 422) {
        logger.warn(`[FARM] Invalid search query "${query}" (page ${page}): ${error.message}`);
      } else if (error.response?.status && error.response.status >= 500) {
        logger.warn(`[FARM] Server error (${error.response.status}) for query: ${query} (page ${page})`);
      } else {
        logger.error(`[FARM] Search error for "${query}" (page ${page}): ${error.message}`);
      }
    } else {
      logger.error(`[FARM] Unexpected error for "${query}" (page ${page}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const gitHubCodeLeakFarmService = new GitHubCodeLeakFarmService();