import { logger } from '../utils/logger';
import { githubService } from './github';
import { ILeak, Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { waitForRateLimitIfNeeded, setRateLimit, rateLimitActive, rateLimitPauseUntil, clearRateLimit, initializeRateLimitManager, lastRateLimitResetTime, checkActualRateLimitStatus, isRateLimitStuck } from './rateLimitManager';
import axios from 'axios';
import { ConfigurationService } from './ConfigurationService';
// Priority 1: Critical Error Handling & Recovery
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { dbResilienceManager } from '../utils/dbResilience';
import { FatalErrorRecoveryManager } from '../utils/fatalErrorRecovery';
// Priority 2: Rate Limit Optimization
import { rateLimitOptimizer } from './rateLimitOptimizer';
// Priority 3: Performance & Efficiency
import { ConcurrencyManager } from '../utils/concurrencyManager';
import { LRUCache } from '../utils/lruCache';
import { queryPrioritizer } from '../utils/queryPrioritizer';

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

// High-risk file names and patterns where API keys are commonly stored or leaked
const HIGH_RISK_FILE_PATTERNS = [
  // Env files
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  // Generic secrets/config
  'config.json',
  'config.yaml',
  'config.yml',
  'secrets.json',
  'secrets.yaml',
  'secrets.yml',
  'appsettings.json',
  'application.yml',
  'application.yaml',
  'database.yml',
  // Names containing "secret"/"credential" in common extensions
  'secret.json',
  'secret.yaml',
  'secret.yml',
  'credentials.json',
  'credentials.yaml',
  'credentials.yml',
  // Docker & containers
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  // CI/CD
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.circleci/config.yml',
  // Kubernetes / Helm / IaC
  'deployment.yml',
  'deployment.yaml',
  'k8s.yml',
  'k8s.yaml',
  '*.tf',
  // Language/framework configs
  // Node/JS
  'config.js',
  'config.ts',
  'next.config.js',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'nuxt.config.js',
  'nuxt.config.ts',
  // Python
  'settings.py',
  'config.py',
  // PHP/WordPress
  'wp-config.php'
];

// Generate comprehensive search queries using patterns and file types
const generateComprehensiveQueries = () => {
  const queries: string[] = [];
  
  // Generate queries for ALL file types × ALL patterns
  HIGH_RISK_FILE_PATTERNS.forEach(filePattern => {
    SEARCH_PATTERNS.forEach(({ searchString }) => {
      queries.push(`filename:${filePattern} ${searchString}`);
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

// Priority 1: Circuit Breakers for critical services
const githubApiCircuitBreaker = new CircuitBreaker('github-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 120000,
  monitoringPeriod: 60000
});

// Priority 1: Fatal Error Recovery Manager
const fatalErrorRecovery = new FatalErrorRecoveryManager({
  maxRestartAttempts: 5,
  restartBackoffBase: 10000,
  restartBackoffMax: 300000,
  fatalErrorWindow: 3600000,
  maxFatalErrorsInWindow: 10,
  statePreservationEnabled: true
});

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

/**
 * Priority 1: Root Fix - Database query with resilience
 */
async function alreadyScanned(repoUrl: string, filePath: string, commitHash: string): Promise<boolean> {
  try {
    const recentScan = await dbResilienceManager.execute(async () => {
      return await ScanAttempt.findOne({
        repoUrl,
        filePath,
        commitHash
      }).lean();
    }, {
      queueOnFailure: false, // Don't queue read operations
      timeout: 10000
    });
    return !!recentScan;
  } catch (error) {
    // On DB failure, assume not scanned (conservative approach - may re-scan)
    logger.warn(`[FARM] Database query failed for duplicate check: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Priority 4: Check if repo was already scanned with current commit hash
 * Uses LRU cache for fast lookups, falls back to database query
 */
async function repoAlreadyScannedWithCommit(repoUrl: string, currentCommitHash: string): Promise<boolean> {
  try {
    // Check cache first (fast path)
    const cachedCommit = repoLastCommitCache.get(repoUrl);
    if (cachedCommit === currentCommitHash) {
      return true; // Repo unchanged, skip it
    }
    
    // If not in cache or different commit, check database
    // Find the latest commit hash we scanned for this repo
    const latestScan = await dbResilienceManager.execute(async () => {
      return await ScanAttempt.findOne({
        repoUrl
      })
      .sort({ scannedAt: -1 }) // Most recent first
      .select('commitHash')
      .lean();
    }, {
      queueOnFailure: false,
      timeout: 10000
    });
    
    if (latestScan && latestScan.commitHash === currentCommitHash) {
      // Update cache and return true (repo unchanged)
      repoLastCommitCache.set(repoUrl, currentCommitHash);
      return true;
    }
    
    // Repo has changes or never scanned - update cache with current commit
    if (currentCommitHash) {
      repoLastCommitCache.set(repoUrl, currentCommitHash);
    }
    
    return false; // Repo needs scanning
  } catch (error) {
    // On DB failure, assume not scanned (conservative approach)
    logger.warn(`[FARM] Database query failed for repo-level check: ${error instanceof Error ? error.message : String(error)}`);
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

// Priority 3: LRU Cache for already scanned (repo, file, commit)
// Replaces unbounded Set with size-limited LRU cache
const scannedCache = new LRUCache<string, boolean>(10000, 24 * 60 * 60 * 1000); // 10K entries, 24h TTL

// Priority 4: LRU Cache for repo-level incremental scanning
// Tracks latest commit hash per repo to skip unchanged repos
const repoLastCommitCache = new LRUCache<string, string>(5000, 24 * 60 * 60 * 1000); // 5K repos, 24h TTL

// Priority 3: Concurrency Manager for parallel processing
const concurrencyManager = new ConcurrencyManager(5); // Process 5 files concurrently

// --- Resume tracking with provider rotation ---
interface ScanResumeState {
  currentProviderIndex: number;
  currentQueryIndex: number;
  currentPage: number;
  lastProcessedTime: number;
  providerStates: {
    [provider: string]: {
      queryIndex: number;
      page: number;
      // Priority 4: Track consecutive empty pages per query for smart skipping
      queryEmptyPages?: {
        [query: string]: number; // query -> consecutive empty pages count
      };
    };
  };
}

let scanResumeState: ScanResumeState = {
  currentProviderIndex: 0,
  currentQueryIndex: 0,
  currentPage: 1,
  lastProcessedTime: Date.now(),
  providerStates: {
    openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
    google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
    anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
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
        // Priority 4: Initialize provider states with queryEmptyPages tracking
        const defaultProviderStates = {
          openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
          google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
          anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
        };
        
        // Merge saved states with defaults, ensuring queryEmptyPages exists
        const mergedProviderStates: { [key: string]: { queryIndex: number; page: number; queryEmptyPages?: { [query: string]: number } } } = { ...defaultProviderStates };
        if (saved.providerStates) {
          for (const [provider, state] of Object.entries(saved.providerStates)) {
            const stateObj = state as { queryIndex?: number; page?: number; queryEmptyPages?: { [query: string]: number } };
            mergedProviderStates[provider] = {
              queryIndex: stateObj.queryIndex ?? 0,
              page: stateObj.page ?? 1,
              queryEmptyPages: stateObj.queryEmptyPages || {}
            };
          }
        }
        
        scanResumeState = {
          currentProviderIndex: saved.currentProviderIndex || 0,
          currentQueryIndex: saved.currentQueryIndex || 0,
          currentPage: saved.currentPage || 1,
          lastProcessedTime: saved.lastProcessedTime || Date.now(),
          providerStates: mergedProviderStates
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
      // Priority 4: Initialize provider states with queryEmptyPages tracking
      const defaultProviderStates = {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      };
      
      // Merge saved states with defaults, ensuring queryEmptyPages exists
      const mergedProviderStates: { [key: string]: { queryIndex: number; page: number; queryEmptyPages?: { [query: string]: number } } } = { ...defaultProviderStates };
      if (saved.providerStates) {
        for (const [provider, state] of Object.entries(saved.providerStates)) {
          const stateObj = state as { queryIndex?: number; page?: number; queryEmptyPages?: { [query: string]: number } };
          mergedProviderStates[provider] = {
            queryIndex: stateObj.queryIndex ?? 0,
            page: stateObj.page ?? 1,
            queryEmptyPages: stateObj.queryEmptyPages || {}
          };
        }
      }
      
      scanResumeState = {
        currentProviderIndex: saved.currentProviderIndex || 0,
        currentQueryIndex: saved.currentQueryIndex || 0,
        currentPage: saved.currentPage || 1,
        lastProcessedTime: saved.lastProcessedTime || Date.now(),
        providerStates: mergedProviderStates
      };
      return scanResumeState;
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to load resume state: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Reset to beginning only if no saved state exists
  // Priority 4: Initialize with queryEmptyPages tracking
  scanResumeState = {
    currentProviderIndex: 0,
    currentQueryIndex: 0,
    currentPage: 1,
    lastProcessedTime: Date.now(),
    providerStates: {
      openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
      google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
      anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
    }
  };
  return scanResumeState;
}

// Utility function to clear scan state and reset to beginning
async function clearScanState(): Promise<void> {
  try {
    // Clear the state from database
    // Priority 4: Initialize with queryEmptyPages tracking
    const success = await ConfigurationService.setScanState({
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      }
    });
    
    if (success) {
      logger.warn(`[FARM] Scan state cleared from database`);
    } else {
      logger.warn(`[FARM] Failed to clear scan state from database`);
    }
    
    // Reset in-memory state
    // Priority 4: Initialize with queryEmptyPages tracking
    scanResumeState = {
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google_gemini: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      }
    };
    
    // Clear global state
    delete (global as any).scanResumeState;
    
    logger.warn(`[FARM] Scan state cleared, will start from beginning on next restart`);
  } catch (error) {
    logger.warn(`[FARM] Failed to clear scan state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Priority 1: Root Fix - Retry wrapper with exponential backoff, jitter, and rate limit handling
 * 
 * Replaces old retry() function with:
 * - Exponential backoff with jitter (prevents thundering herd)
 * - Circuit breaker integration (prevents cascading failures)
 * - Proper rate limit handling (429/403)
 * - Timeout protection
 */
async function retry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  // Wait for rate limit before attempting
  await waitForRateLimitIfNeeded();

  try {
    // Use circuit breaker for GitHub API calls
    return await githubApiCircuitBreaker.execute(async () => {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const resultPromise = fn();
      return await Promise.race([resultPromise, timeoutPromise]);
    });
  } catch (err: any) {
    // Priority 1: Don't count 401 errors as circuit breaker failures
    // They should trigger token rotation, not open the circuit
    if (err.response && err.response.status === 401) {
      // Reset circuit breaker failure count for 401 errors
      // (They're handled by token rotation, not circuit breaker)
      if (githubApiCircuitBreaker.getFailureCount() > 0) {
        githubApiCircuitBreaker.reset();
      }
    }
    // Priority 2: Handle 401 errors (invalid/expired token) - trigger token rotation
    if (err.response && err.response.status === 401) {
      logger.error(`[GITHUB] 401 Unauthorized - Token may be invalid or expired. Rotating to next token...`);
      // Rotate to next token
      rateLimitOptimizer.rotateToBestToken();
      // Don't retry immediately - let the next request use the new token
      throw err;
    }

    // Handle rate limit errors (don't use retryWithBackoff for these)
    if (err.response && (err.response.status === 403 || err.response.status === 429)) {
      const statusCode = err.response.status;
      const headers = err.response.headers || {};
      const remaining = headers['x-ratelimit-remaining'];
      const reset = headers['x-ratelimit-reset'];
      const limit = headers['x-ratelimit-limit'];
      const message = err.response.data?.message || '';
      
      const shortLog = `[GITHUB] ${statusCode}: limit=${limit}, remaining=${remaining}, reset=${reset}, msg=${message.slice(0, 80)}...`;
      logger.warn(shortLog);

      // Handle 429 errors FIRST - they are ALWAYS rate limits
      if (statusCode === 429) {
        if (reset && Number(reset) * 1000 > Date.now()) {
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err; // Re-throw to be handled by caller
        } else {
          logger.warn('[GITHUB] 429 rate limit error (no reset time). Waiting 60s...');
          await new Promise(res => setTimeout(res, 60000));
          throw err;
        }
      }

      // Handle 403 errors - treat as rate limit if remaining === '0' OR if it's a secondary rate limit
      if (statusCode === 403) {
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
          throw err;
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
          throw err;
        }

        // Handle secondary/abuse rate limits
        if (message.toLowerCase().includes('abuse') || message.toLowerCase().includes('secondary')) {
          logger.warn('[GITHUB] Secondary or abuse rate limit detected. Waiting 60s...');
          await new Promise(res => setTimeout(res, 60000));
          throw err;
        }

        // Handle secondary rate limits that come as 403 with remaining > 0
        if (reset && Number(reset) * 1000 > Date.now() && remaining !== '0') {
          logger.warn('[GITHUB] Secondary rate limit detected (403 with remaining > 0). Waiting for reset...');
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err;
        }

        // Unknown rate limit pattern
        if (remaining === '0' && reset && Number(reset) * 1000 > Date.now()) {
          logger.warn('[GITHUB] Unknown rate limit pattern detected, treating as rate limit...');
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err;
        }
      }
    }

    // Priority 1: Don't retry 401 errors (invalid token) - they're not retryable
    if (err.response && err.response.status === 401) {
      logger.error(`[GITHUB] 401 Unauthorized - Token authentication failed. This is not retryable.`);
      throw err;
    }

    // For non-rate-limit, non-401 errors, use retryWithBackoff with exponential backoff and jitter
    return await retryWithBackoff(
      async () => {
        await waitForRateLimitIfNeeded();
        return await githubApiCircuitBreaker.execute(fn);
      },
      {
        maxRetries: MAX_RETRIES,
        baseDelay: 1000, // Start with 1 second
        maxDelay: 30000, // Max 30 seconds
        exponentialBase: 2,
        jitter: true,
        jitterFactor: 0.3
      },
      context || 'RETRY'
    );
  }
}

/**
 * Priority 1: Root Fix - Batched upsert with database resilience
 * 
 * Uses dbResilienceManager for:
 * - Automatic retry on transient failures
 * - Queue operations when DB unavailable
 * - Circuit breaker protection
 * - Graceful degradation
 */
async function batchUpsertLeaks(leaks: Partial<ILeak>[]) {
  if (!leaks.length) return;
  
  await dbResilienceManager.execute(async () => {
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
      for (let i = 0; i < leaks.length; i++) {
        const leak = leaks[i];
        if (result.upsertedIds[i] && leak) {
          newLeaks.push(leak);
        }
      }
    }
  }, {
    queueOnFailure: true, // Queue if DB unavailable
    timeout: 30000
  }).catch((error: any) => {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      if (error.message && error.message.includes('fullKey')) {
        logger.warn(`[FARM] Duplicate API key detected (fullKey): ${error.message}`);
        return;
      }
      logger.warn(`[FARM] Duplicate leak detected (expected): ${error.message}`);
    } else {
      logger.error(`[FARM] Failed to save leaks: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/**
 * Priority 1: Root Fix - Batch insert with database resilience
 */
async function batchInsertScanAttempts(attempts: any[]) {
  if (!attempts.length) return;
  
  await dbResilienceManager.execute(async () => {
    await ScanAttempt.insertMany(attempts, { ordered: false });
  }, {
    queueOnFailure: true,
    timeout: 30000
  }).catch((error: any) => {
    if (error.code === 11000) {
      logger.warn(`[FARM] Duplicate scan attempt detected (expected): ${error.message}`);
    } else {
      logger.error(`[FARM] Failed to save scan attempts: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
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

  /**
   * Priority 1: Root Fix - Scan loop with fatal error recovery
   * 
   * Wraps entire scan loop in fatal error recovery:
   * - Max restart attempts with exponential backoff
   * - State preservation on fatal errors
   * - Prevents infinite restart loops
   */
  private async scanLoop(): Promise<void> {
    // Reset restart attempts on successful start
    fatalErrorRecovery.resetRestartAttempts();

    try {
      await this.scanLoopInternal();
    } catch (fatalError) {
      logger.error(
        `[FARM] FATAL: Unhandled error in scanLoop: ${fatalError instanceof Error ? fatalError.stack : String(fatalError)}`
      );

      // Handle fatal error with recovery
      await fatalErrorRecovery.handleFatalError(
        fatalError instanceof Error ? fatalError : new Error(String(fatalError)),
        async () => {
          // Recovery function: restart scan loop
          logger.warn('[FARM] Attempting to recover from fatal error...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          this.scanLoop();
        },
        async () => {
          // State preservation function
          await saveResumeState();
          logger.warn('[FARM] State preserved before recovery attempt');
        }
      );
    }
  }

  private async scanLoopInternal(): Promise<void> {
    let lastStatusLog = Date.now();
    let lastRateLimitCheck = Date.now();
    let lastConfigCheck = Date.now();
    let lastTokenRefresh = Date.now();
    const STATUS_LOG_INTERVAL = 1 * 60 * 1000; // 1 minute
    const RATE_LIMIT_CHECK_INTERVAL = 10 * 1000; // 10 seconds
    const CONFIG_CHECK_INTERVAL = 30 * 1000; // 30 seconds
    const TOKEN_REFRESH_INTERVAL = 60 * 1000; // 1 minute - Priority 2: Refresh token statuses
    let firstCycle = true;
    let scanCompleted = false;
    
    while (this.running) {
        // Priority 2: Refresh token statuses periodically
        if (Date.now() - lastTokenRefresh > TOKEN_REFRESH_INTERVAL) {
          lastTokenRefresh = Date.now();
          try {
            await rateLimitOptimizer.refreshAllTokenStatuses();
          } catch (error) {
            logger.warn(`[FARM] Failed to refresh token statuses: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
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
        
        // Priority 3: Clean expired cache entries periodically
        if (Date.now() - lastConfigCheck > CONFIG_CHECK_INTERVAL) {
          const cleaned = scannedCache.cleanExpired();
          if (cleaned > 0) {
            logger.warn(`[FARM] Cleaned ${cleaned} expired cache entries`);
          }
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
      let providerQueries = PROVIDER_QUERIES[typedCurrentProvider];
      
      // Priority 3: Prioritize queries based on performance
      const rateLimitLow = rateLimitOptimizer.shouldSlowDown();
      providerQueries = queryPrioritizer.prioritizeQueries(providerQueries);
      
      // Filter out low-value queries if rate limits are low
      if (rateLimitLow) {
        const originalLength = providerQueries.length;
        providerQueries = providerQueries.filter(query => 
          !queryPrioritizer.shouldSkipQuery(query, true)
        );
        if (providerQueries.length < originalLength) {
          logger.warn(`[FARM] Skipped ${originalLength - providerQueries.length} low-value queries due to low rate limits`);
        }
      }
      
      // Get current provider state and ensure it exists
      // Priority 4: Initialize with queryEmptyPages if missing
      const defaultProviderState = { queryIndex: 0, page: 1, queryEmptyPages: {} };
      const providerState = resumeState.providerStates[typedCurrentProvider] || defaultProviderState;
      // Ensure queryEmptyPages exists
      if (!providerState.queryEmptyPages) {
        providerState.queryEmptyPages = {};
      }
      let queryIndex = providerState.queryIndex;
      let page = providerState.page;
      
      // Update resume state to current position
      scanResumeState.currentProviderIndex = validProviderIndex;
      scanResumeState.currentQueryIndex = queryIndex;
      scanResumeState.currentPage = page;
      
      try {
        // Priority 3: Process current provider's current query (one page only)
        const query = providerQueries[queryIndex];
        if (query) {
          const startTime = Date.now();
          try {
            // Priority 4: Get result status for smart page skipping
            const result = await this.processOnePageForQuery(query, page);
            
            if (result.hadResults) {
              scannedAnything = true;
              
              // Priority 4: Reset consecutive empty pages counter when we find results
              if (!scanResumeState.providerStates[typedCurrentProvider]) {
                scanResumeState.providerStates[typedCurrentProvider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
              }
              if (!scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages) {
                scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages = {};
              }
              scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] = 0;
              
              // Priority 3: Record successful query execution
              const responseTime = Date.now() - startTime;
              queryPrioritizer.recordExecution(query, true, result.itemCount, responseTime);
              
              // Only log when there's actual scanning activity
              logger.warn(`[FARM] Processed ${typedCurrentProvider} (query ${queryIndex + 1}/${providerQueries.length}, page ${page})`);
            } else {
              // Priority 4: Track consecutive empty pages for this query
              if (!scanResumeState.providerStates[typedCurrentProvider]) {
                scanResumeState.providerStates[typedCurrentProvider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
              }
              if (!scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages) {
                scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages = {};
              }
              const currentEmptyCount = scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] || 0;
              scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] = currentEmptyCount + 1;
              
              // Priority 3: Record query execution (even if empty)
              const responseTime = Date.now() - startTime;
              queryPrioritizer.recordExecution(query, true, 0, responseTime);
            }
          } catch (error) {
            // Priority 3: Record failed query execution
            const startTime = Date.now();
            const responseTime = Date.now() - startTime;
            queryPrioritizer.recordExecution(query, false, 0, responseTime);
            throw error;
          }
        }
        
        // Priority 4: Smart page skipping - check if we should skip ahead
        const EMPTY_PAGE_THRESHOLD = 3; // Skip to next query after 3 consecutive empty pages
        const providerState = scanResumeState.providerStates[typedCurrentProvider];
        const emptyPagesCount = (query && providerState?.queryEmptyPages) ? (providerState.queryEmptyPages[query] ?? 0) : 0;
        if (query && emptyPagesCount >= EMPTY_PAGE_THRESHOLD) {
          logger.warn(`[FARM] Skipping query "${query}" after ${EMPTY_PAGE_THRESHOLD} consecutive empty pages (current page: ${page})`);
          // Reset empty pages counter for this query
          if (providerState && providerState.queryEmptyPages) {
            providerState.queryEmptyPages[query] = 0;
          }
          // Move to next query
          queryIndex++;
          // If we've gone through all queries, move to next page and reset query index
          if (queryIndex >= providerQueries.length) {
            queryIndex = 0;
            page++;
          }
        } else {
          // Normal progression: move to next query/page
          queryIndex++;
          if (queryIndex >= providerQueries.length) {
            queryIndex = 0;
            page++;
          }
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
          // Priority 4: Reset with queryEmptyPages tracking
          for (const provider of providerNames) {
            scanResumeState.providerStates[provider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
          }
          scanResumeState.currentPage = 1;
          scanResumeState.currentQueryIndex = 0;
          // Reset the current provider's page and query index too
          page = 1;
          queryIndex = 0;
          logger.warn(`[FARM] Max page reached (> ${MAX_PAGE}). Resetting all providers to page 1 to catch new repos.`);
        }
        
        // Update provider state
        // Priority 4: Preserve queryEmptyPages when updating state
        const currentProviderState = scanResumeState.providerStates[typedCurrentProvider] || { queryIndex: 0, page: 1, queryEmptyPages: {} };
        scanResumeState.providerStates[typedCurrentProvider] = {
          queryIndex,
          page,
          queryEmptyPages: currentProviderState.queryEmptyPages || {}
        };
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
  // Priority 4: Returns whether the page had results (for smart page skipping)
  private async processOnePageForQuery(query: string, page: number): Promise<{ hadResults: boolean; itemCount: number }> {
    try {
      // Priority 2: Use adaptive throttling instead of simple wait
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      if (!this.running) return { hadResults: false, itemCount: 0 };
      
      // Priority 2: Use GitHubService for search (handles token rotation automatically)
      const response = await retry(() => githubService.searchCode(query, page, 10), 'SEARCH');
      
      // Priority 2: Update rate limit info from response headers
      if (response.headers) {
        rateLimitOptimizer.updateFromHeaders(response.headers);
      }
      
      const items: GitHubSearchItem[] = response.data?.items || [];
      const itemCount = items.length;
      
      if (itemCount === 0) {
        return { hadResults: false, itemCount: 0 };
      }
      
      await this.processSearchResults(items, query);
      return { hadResults: true, itemCount };
      
    } catch (error: any) {
      // Handle expected errors gracefully instead of treating them as unhandled
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 429) {
          // Rate limit error - this is expected and handled by retry logic
          logger.warn(`[FARM] Rate limit error (${error.response.status}) for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 }; // Don't re-throw, just return gracefully
        } else if (error.response?.status === 422) {
          // Unprocessable Entity - could be invalid search query or no more results
          const errorMessage = error.response.data?.message || '';
          if (page > 100 || errorMessage.includes('page') || errorMessage.includes('limit') || errorMessage.includes('422')) {
            // No more results available (beyond GitHub's search limit for this query)
            logger.warn(`[FARM] No more results available for query "${query}" (page ${page}): Reached end of results`);
            return { hadResults: false, itemCount: 0 }; // Don't re-throw, just return gracefully
          } else {
            // Invalid search query syntax
            logger.warn(`[FARM] Invalid search query "${query}" (page ${page}): ${error.message}`);
            return { hadResults: false, itemCount: 0 }; // Don't re-throw, just return gracefully
          }
        } else if (error.response?.status && error.response.status >= 500) {
          // Server error - this is expected and handled by retry logic
          logger.warn(`[FARM] Server error (${error.response.status}) for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 }; // Don't re-throw, just return gracefully
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          // Timeout error - this is expected and handled by retry logic
          logger.warn(`[FARM] Timeout error for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 }; // Don't re-throw, just return gracefully
        }
      }
      
      // For truly unexpected errors, log them but don't crash the scan loop
      logger.error(`[FARM] Unexpected error in processOnePageForQuery for "${query}" (page ${page}): ${error instanceof Error ? error.message : String(error)}`);
      // Don't re-throw - let the scan continue with the next query/page
      return { hadResults: false, itemCount: 0 };
    }
  }

  /**
   * Priority 3: Root Fix - Process search results with parallel processing
   * 
   * Uses concurrency manager to process multiple files in parallel
   * while respecting rate limits and maintaining order
   */
  private async processSearchResults(items: GitHubSearchItem[], query: string): Promise<void> {
    let processedCount = 0;
    let skippedCount = 0;
    
    // Priority 4: Group items by repo for repo-level incremental scanning
    const repoGroups = new Map<string, GitHubSearchItem[]>();
    for (const item of items) {
      const repoUrl = item.repository.html_url;
      if (!repoGroups.has(repoUrl)) {
        repoGroups.set(repoUrl, []);
      }
      repoGroups.get(repoUrl)!.push(item);
    }
    
    // Priority 4: Check each repo before processing its files
    const reposToProcess: { repoUrl: string; items: GitHubSearchItem[]; repoName: string }[] = [];
    for (const [repoUrl, repoItems] of repoGroups.entries()) {
      const repoName = repoItems[0]!.repository.full_name;
      
      // Get repo's latest commit hash
      let repoLatestCommit = '';
      try {
        await waitForRateLimitIfNeeded();
        await rateLimitOptimizer.waitWithThrottling();
        repoLatestCommit = await retry(() => githubService.getRepoLatestCommitHash(repoName), 'REPO-COMMIT');
      } catch (error) {
        // If we can't get repo commit, process files anyway (fallback to file-level checking)
        logger.warn(`[FARM] Failed to get repo commit for ${repoName}, processing files individually: ${error instanceof Error ? error.message : String(error)}`);
        reposToProcess.push({ repoUrl, items: repoItems, repoName });
        continue;
      }
      
      if (!repoLatestCommit) {
        // No commit hash, process files individually
        reposToProcess.push({ repoUrl, items: repoItems, repoName });
        continue;
      }
      
      // Priority 4: Check if repo was already scanned with this commit
      if (await repoAlreadyScannedWithCommit(repoUrl, repoLatestCommit)) {
        logger.warn(`[FARM] SKIP REPO: ${repoName} - Already scanned with commit ${repoLatestCommit.substring(0, 8)}... (${repoItems.length} files skipped)`);
        skippedCount += repoItems.length;
        continue; // Skip entire repo
      }
      
      // Repo has changes or never scanned - process its files
      reposToProcess.push({ repoUrl, items: repoItems, repoName });
    }
    
    // Priority 3: Process files in parallel (up to max concurrency)
    const processItem = async (item: GitHubSearchItem): Promise<{ processed: boolean; skipped: boolean }> => {
      // Priority 2: Use adaptive throttling
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      if (!this.running) return { processed: false, skipped: false };
      
      const repoName: string = item.repository.full_name;
      const filePath: string = item.path;
      
      // Exclude documentation files from scan targets
      const docFilePatterns = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^code\_of\_conduct(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];
      const fileName = filePath.split('/').pop() || '';
      if (docFilePatterns.some(pattern => pattern.test(fileName))) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Documentation file (${fileName})`);
        return { processed: false, skipped: true };
      }
      
      // Skip files with problematic characters that might cause issues
      if (fileName.includes('#') || fileName.includes('?') || fileName.includes('&')) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Problematic characters in filename (${fileName})`);
        return { processed: false, skipped: true };
      }
      
      // Priority 3: Check LRU cache first
      const cacheKey = `${item.repository.html_url}|${filePath}|${query}`;
      if (scannedCache.has(cacheKey)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in cache (query: ${query})`);
        return { processed: false, skipped: true };
      }
      
      // Get commit hash first (this is the most recent state of the file)
      let commitHash = '';
      try {
        await waitForRateLimitIfNeeded();
        await rateLimitOptimizer.waitWithThrottling();
        commitHash = await retry(() => githubService.getFileLatestCommitHash(repoName, filePath), 'COMMIT-HASH');
      } catch (error) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Failed to get commit hash: ${error instanceof Error ? error.message : String(error)}`);
        return { processed: false, skipped: true };
      }
      if (!commitHash) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - No commit hash returned`);
        return { processed: false, skipped: true };
      }
      
      // Priority 3: Check LRU cache for commit-specific key
      const cacheKeyWithCommit = `${item.repository.html_url}|${filePath}|${query}|${commitHash}`;
      if (scannedCache.has(cacheKeyWithCommit)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already scanned with this commit (${commitHash.substring(0, 8)}...)`);
        return { processed: false, skipped: true };
      }
      
      // Check database for this specific commit+query combination
      if (await alreadyScanned(item.repository.html_url, filePath, commitHash)) {
        scannedCache.set(cacheKeyWithCommit, true);
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in database (commit: ${commitHash.substring(0, 8)}...)`);
        return { processed: false, skipped: true };
      }
      
      // If we get here, we need to scan the file - make the content API call
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      logger.scan(repoName, filePath);
      let content;
      try {
        await waitForRateLimitIfNeeded();
        await rateLimitOptimizer.waitWithThrottling();
        content = await retry(() => fetchRawFileContent(repoName, filePath, 'HEAD'), 'FILE-CONTENT');
      } catch (error) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Failed to fetch content: ${error instanceof Error ? error.message : String(error)}`);
        return { processed: false, skipped: true };
      }
      if (!content) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - No content returned`);
        return { processed: false, skipped: true };
      }
      
      try {
        if (!query) {
          logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - No query provided`);
          return { processed: false, skipped: true };
        }
        await this.detectAndSaveLeaks(content, repoName, item.repository.html_url, filePath, query, commitHash);
        scannedCache.set(cacheKeyWithCommit, true);
        return { processed: true, skipped: false };
      } catch (error) {
        logger.error(`[FARM] Failed to process leaks for ${repoName}/${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        return { processed: false, skipped: true };
      }
    };

    // Priority 3: Flatten repos to process into individual items
    const itemsToProcess: GitHubSearchItem[] = [];
    for (const { items } of reposToProcess) {
      itemsToProcess.push(...items);
    }
    
    // Priority 3: Execute all items with concurrency control
    const results = await concurrencyManager.executeAll(
      itemsToProcess.map(item => () => processItem(item))
    );

    // Count results
    results.forEach(result => {
      if (result?.processed) processedCount++;
      if (result?.skipped) skippedCount++;
    });
    
    // Priority 3: Record query performance for prioritization
    const leakCount = processedCount; // Approximate (actual count is in detectAndSaveLeaks)
    queryPrioritizer.recordExecution(query, true, leakCount, 0);
    
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
    
    // Priority 3: Record leak count for query prioritization (will be updated after save)
    const leakCount = leaks.length;
    
    // Check repository creation date for leak filtering
    let repoCreatedAt: Date;
    try {
      await rateLimitOptimizer.waitWithThrottling();
      repoCreatedAt = await retry(() => this.getRepoCreationDate(repoName), 'REPO-METADATA');
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
        await rateLimitOptimizer.waitWithThrottling();
        const leakIntroducedAt = await retry(() => this.getLeakIntroductionDate(repoName, filePath), 'LEAK-DATE');
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
    
    // Priority 3: Update query metrics with actual leak count
    if (leakCount > 0) {
      queryPrioritizer.recordExecution(query, true, leakCount, 0);
    }
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
      if (error.response?.status === 403 || error.response?.status === 429) {
        logger.warn(`[FARM] Rate limit hit (${error.response.status}) for query: ${query} (page ${page})`);
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