import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { githubService } from './github';
import { ILeak, Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { waitForRateLimitIfNeeded, setRateLimit, rateLimitActive, rateLimitPauseUntil, clearRateLimit, initializeRateLimitManager, lastRateLimitResetTime, checkActualRateLimitStatus, isRateLimitStuck, validateSearchRateLimitHeaders } from './rateLimitManager';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
      queries.push(`filename:${fileType} "${searchString}"`);
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
const REPOSITORY_AGE_CUTOFF = new Date('2025-06-01T00:00:00Z');

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
  return placeholderWords.some(word => lowerKey.includes(word));
}

// Key validation functions with stricter validation for generic patterns
function isValidOpenAIKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
  // Use the same pattern as in SEARCH_PATTERNS
  return /^sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,}$/.test(key);
}

function isValidGeminiKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
  // Use the same pattern as in SEARCH_PATTERNS
  return /^AIza[0-9A-Za-z]{35,36}$/.test(key);
}

function isValidAnthropicKey(key: string): boolean {
  // Skip placeholder keys
  if (isPlaceholderKey(key)) return false;
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
  return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
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

async function alreadyScanned(repoUrl: string, filePath: string, query: string, commitHash: string): Promise<boolean> {
  try {
    const recentScan = await ScanAttempt.findOne({
      repoUrl,
      filePath,
      queryUsed: query,
      commitHash
    }).lean();
    return !!recentScan;
  } catch (error) {
    // If database query fails, assume not scanned to be safe
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
function saveResumeState() {
  try {
    const state = {
      ...scanResumeState,
      savedAt: new Date()
    };
    
    // Save to file for persistence across restarts
    const stateFilePath = path.join(__dirname, '..', '..', 'scan-state.json');
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
    
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
function loadResumeState(): ScanResumeState {
  try {
    const stateFilePath = path.join(__dirname, '..', '..', 'scan-state.json');
    
    // Try to load from file first
    if (fs.existsSync(stateFilePath)) {
      const fileContent = fs.readFileSync(stateFilePath, 'utf8');
      const saved = JSON.parse(fileContent);
      
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
        logger.warn(`[FARM] Invalid state file format, resetting to beginning`);
      }
    }
    
    // Fallback to memory state if file doesn't exist or is invalid
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
function clearScanState(): void {
  try {
    const stateFilePath = path.join(__dirname, '..', '..', 'scan-state.json');
    
    // Delete the state file if it exists
    if (fs.existsSync(stateFilePath)) {
      fs.unlinkSync(stateFilePath);
      logger.warn(`[FARM] Scan state file deleted`);
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
      // Detect GitHub rate limit error with better validation
      if (err.response && err.response.status === 403 && err.response.headers) {
        const remaining = err.response.headers['x-ratelimit-remaining'];
        const reset = err.response.headers['x-ratelimit-reset'];
        const limit = err.response.headers['x-ratelimit-limit'];
        
        // Validate if this is a search API rate limit
        if (validateSearchRateLimitHeaders(remaining, limit)) {
          const resetTime = parseInt(reset, 10) * 1000;
          const now = Date.now();
          
          // Validate reset time is reasonable (not in the past, not too far in the future)
          if (resetTime > now && resetTime < now + 3600000) { // Within 1 hour
            setRateLimit(resetTime);
            // Wait for the pause, then retry
            await waitForRateLimitIfNeeded();
            attempt++;
            continue;
          }
        } else {
          // Only treat as rate limit if remaining is actually 0 and we have a valid reset time
          if (remaining === '0' && reset) {
            const resetTime = parseInt(reset, 10) * 1000;
            const now = Date.now();
            
            // Validate reset time is reasonable (not in the past, not too far in the future)
            if (resetTime > now && resetTime < now + 3600000) { // Within 1 hour
              setRateLimit(resetTime);
              // Wait for the pause, then retry
              await waitForRateLimitIfNeeded();
              attempt++;
              continue;
            }
          }
        }
      }
      lastErr = err;
      await new Promise(res => setTimeout(res, RETRY_BASE_DELAY));
      attempt++;
    }
  }
  throw lastErr;
}

// --- Batched upsert for leaks and scan attempts ---
async function batchUpsertLeaks(leaks: Partial<ILeak>[]) {
  if (!leaks.length) return;
  
  try {
    const ops = leaks.map(leak => ({
      updateOne: {
        filter: { repoUrl: leak.repoUrl, redactedKey: leak.redactedKey, provider: leak.provider },
        update: leak,
        upsert: true
      }
    }));
    
    await Leak.bulkWrite(ops, { ordered: false });
  } catch (error: any) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      // This is a duplicate key error, which is expected when the same leak is found multiple times
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
    if (this.running) return;
    this.running = true;
    
    logger.status('farm', 'Service started', 'GitHubCodeLeakFarm');
    
    this.scanLoop();
  }

  public stop() {
    this.running = false;
    
    // Save current state before stopping
    saveResumeState();
    
    logger.status('farm', 'Service stopped', 'GitHubCodeLeakFarm');
  }

  public clearState() {
    clearScanState();
    logger.status('farm', 'Scan state cleared', 'GitHubCodeLeakFarm');
  }

  private async scanLoop(): Promise<void> {
    let lastStatusLog = Date.now();
    let lastRateLimitCheck = Date.now();
    const STATUS_LOG_INTERVAL = 1 * 60 * 1000; // 1 minute
    const RATE_LIMIT_CHECK_INTERVAL = 10 * 1000; // 10 seconds
    let firstCycle = true;
    let consecutiveIdleCycles = 0;
    const MAX_IDLE_CYCLES = 5; // After 5 idle cycles, force a scan
    
    while (this.running) {
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
      
      let scannedAnything = false;
      try {
        scannedAnything = await this.executeScanCycle();
        // Reload scan state after each cycle to ensure proper provider rotation
        scanResumeState = loadResumeState();
      } catch (error) {
        logger.error('[FARM] Scan cycle error: ' + (error instanceof Error ? error.message : String(error)));
      }
      
      // Track consecutive idle cycles
      if (!scannedAnything) {
        consecutiveIdleCycles++;
      } else {
        consecutiveIdleCycles = 0; // Reset counter when we find something
      }
      
      // Force scan after MAX_IDLE_CYCLES to ensure we're not missing anything
      if (consecutiveIdleCycles >= MAX_IDLE_CYCLES) {
        logger.init('[FARM] Force scanning after consecutive idle cycles...');
        consecutiveIdleCycles = 0;
        // Continue to next cycle which will scan again
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

  private async executeScanCycle(): Promise<boolean> {
    let scannedAnything = false;
    
    // Load resume state at the start of each cycle
    const resumeState = loadResumeState();
    
    // Get provider names for rotation
    const providerNames: Array<keyof typeof PROVIDER_QUERIES> = ['openai', 'google_gemini', 'anthropic'];
    
    // Ensure currentProviderIndex is within bounds
    const validProviderIndex = Math.max(0, Math.min(resumeState.currentProviderIndex, providerNames.length - 1));
    const currentProvider = providerNames[validProviderIndex];
    
    // Ensure currentProvider is defined
    if (!currentProvider) {
      logger.error(`[FARM] Invalid provider index: ${resumeState.currentProviderIndex}, resetting to 0`);
      scanResumeState.currentProviderIndex = 0;
      saveResumeState();
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
    
    logger.warn(`[FARM] Processing provider ${validProviderIndex + 1}/${providerNames.length}: ${typedCurrentProvider} (query ${queryIndex + 1}/${providerQueries.length}, page ${page})`);
    
    try {
      // Process current provider's current query (one page only)
      const query = providerQueries[queryIndex];
      if (query) {
        await this.processOnePageForQuery(query, page);
        scannedAnything = true;
      }
      
      // Move to next query/page for this provider
      queryIndex++;
      if (queryIndex >= providerQueries.length) {
        queryIndex = 0;
        page++;
      }
      
      // Update provider state
      scanResumeState.providerStates[typedCurrentProvider] = { queryIndex, page };
      scanResumeState.currentQueryIndex = queryIndex;
      scanResumeState.currentPage = page;
      scanResumeState.lastProcessedTime = Date.now();
      saveResumeState();
      
      // Move to next provider after processing one page
      scanResumeState.currentProviderIndex = (validProviderIndex + 1) % providerNames.length;
      saveResumeState();
      
      logger.warn(`[FARM] Completed ${typedCurrentProvider} page, moving to next provider: ${providerNames[(validProviderIndex + 1) % providerNames.length]}`);
    } catch (error) {
      this.handleSearchError(error, providerQueries[queryIndex] || 'unknown', page);
    }
    
    return scannedAnything;
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
      // Improved rate limit handling with better validation
      if (error.response && error.response.status === 403 && error.response.headers) {
        const remaining = error.response.headers['x-ratelimit-remaining'];
        const reset = error.response.headers['x-ratelimit-reset'];
        const limit = error.response.headers['x-ratelimit-limit'];
        
        // Validate if this is a search API rate limit
        if (validateSearchRateLimitHeaders(remaining, limit)) {
          const resetTime = parseInt(reset, 10) * 1000;
          const now = Date.now();
          
          // Validate reset time is reasonable (not in the past, not too far in the future)
          if (resetTime > now && resetTime < now + 3600000) { // Within 1 hour
            setRateLimit(resetTime);
            // Save current state before waiting for rate limit
            saveResumeState();
            await waitForRateLimitIfNeeded();
            // Retry this page after rate limit reset
            await this.processOnePageForQuery(query, page);
            return;
          }
        } else {
          // Only treat as rate limit if remaining is actually 0 and we have a valid reset time
          if (remaining === '0' && reset) {
            const resetTime = parseInt(reset, 10) * 1000;
            const now = Date.now();
            
            // Validate reset time is reasonable (not in the past, not too far in the future)
            if (resetTime > now && resetTime < now + 3600000) { // Within 1 hour
              setRateLimit(resetTime);
              // Save current state before waiting for rate limit
              saveResumeState();
              await waitForRateLimitIfNeeded();
              // Retry this page after rate limit reset
              await this.processOnePageForQuery(query, page);
              return;
            }
          }
        }
      }
      
      this.handleSearchError(error, query, page);
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
        skippedCount++;
        continue;
      }
      
      // Skip files with problematic characters that might cause issues
      if (fileName.includes('#') || fileName.includes('?') || fileName.includes('&')) {
        skippedCount++;
        continue;
      }
      
      // Check cache first to avoid any API calls for already processed files
      const cacheKey = `${item.repository.html_url}|${filePath}|${query}`;
      if (scannedCache.has(cacheKey)) {
        skippedCount++;
        continue;
      }
      
      // Get commit hash first (this is the most recent state of the file)
      let commitHash = '';
      try {
        await waitForRateLimitIfNeeded();
        commitHash = await retry(() => githubService.getFileLatestCommitHash(repoName, filePath));
      } catch (error) {
        skippedCount++;
        continue;
      }
      if (!commitHash) {
        skippedCount++;
        continue;
      }
      
      // Now check if this specific commit+query combination was already scanned
      const cacheKeyWithCommit = `${item.repository.html_url}|${filePath}|${query}|${commitHash}`;
      if (scannedCache.has(cacheKeyWithCommit)) {
        skippedCount++;
        continue;
      }
      
      // Check database for this specific commit+query combination
      if (await alreadyScanned(item.repository.html_url, filePath, query, commitHash)) {
        scannedCache.add(cacheKeyWithCommit);
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
        skippedCount++;
        continue;
      }
      if (!content) {
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
  
    if (repoCreatedAt >= REPOSITORY_AGE_CUTOFF) {
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
          foundLeaks.push(leakData);
          logger.leak(provider, repoName);
        } catch (error) {
          logger.error('[FARM] Failed to save leak: ' + (error instanceof Error ? error.message : String(error)));
        }
      }
      
      // Save leaks for repositories less than 12 months old
      if (foundLeaks.length > 0) {
        await batchUpsertLeaks(foundLeaks);
      }
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