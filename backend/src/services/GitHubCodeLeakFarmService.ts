import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { githubService } from './github';
import { ILeak, Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { waitForRateLimitIfNeeded, setRateLimit, rateLimitActive, rateLimitPauseUntil, clearRateLimit, initializeRateLimitManager, lastRateLimitResetTime, checkActualRateLimitStatus, isRateLimitStuck, validateSearchRateLimitHeaders } from './rateLimitManager';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Enhanced regex patterns with boundary checks and documentation
const PROVIDER_PATTERNS: { [provider: string]: RegExp } = {
  openai: /\b(sk-(?:proj-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}|[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}))\b/g,
  google_gemini: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  anthropic: /\b(sk-ant-api\d{2}-[a-zA-Z0-9]{32})\b/g,
  huggingface: /\b(hf_[a-zA-Z0-9]{34})\b/g,
};

const ENV_VARIATIONS = [
  '.env'
];

const PROVIDERS = [
  'OPENAI_API_KEY', 'OPENAI_KEY', 'OPENAI_TOKEN',
  'GEMINI_API_KEY', 'GEMINI_KEY', 'GOOGLE_AI_KEY',
  'ANTHROPIC_API_KEY', 'ANTHROPIC_KEY', 'CLAUDE_KEY',
  'HUGGINGFACE_API_KEY', 'HF_TOKEN', 'HUGGINGFACE_TOKEN'
];

// Generate comprehensive search queries using ALL ENV_VARIATIONS and ALL PROVIDERS
const generateComprehensiveQueries = () => {
  const queries: string[] = [];
  
  // Generate queries for ALL file types × ALL providers
  ENV_VARIATIONS.forEach(fileType => {
    PROVIDERS.forEach(provider => {
      queries.push(`filename:${fileType} "${provider}"`);
    });
  });
  
  return queries;
};

// Combine all search queries - comprehensive coverage
const ALL_SEARCH_QUERIES = generateComprehensiveQueries();

// Configuration constants with fallback defaults
const SCAN_ENTROPY_THRESHOLD = 2.0;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 100;
const REPOSITORY_AGE_CUTOFF = new Date('2024-07-01T00:00:00Z');

// Type definitions for better type safety
interface GitHubSearchItem {
  repository: {
    full_name: string;
    html_url: string;
  };
  path: string;
}

interface GitHubSearchResponse {
  items: GitHubSearchItem[];
  total_count: number;
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

// Calculate Shannon entropy
function calculateEntropy(str: string): number {
  const freqMap: Record<string, number> = {};
  const len = str.length;

  for (const char of str) {
    freqMap[char] = (freqMap[char] || 0) + 1;
  }

  return Object.values(freqMap).reduce((entropy, freq) => {
    const p = freq / len;
    return entropy - p * Math.log2(p);
  }, 0);
}

// Key validation functions with stricter validation for generic patterns
function isValidOpenAIKey(key: string): boolean {
  // Matches both legacy and project keys
  return /^sk-(proj-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}|[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})$/.test(key);
}

function isValidGeminiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z\-_]{35}$/.test(key);
}

function isValidAnthropicKey(key: string): boolean {
  return /^sk-ant-api\d{2}-[a-zA-Z0-9]{32}$/.test(key);
}

function isValidHuggingFaceKey(key: string): boolean {
  return /^hf_[a-zA-Z0-9]{34}$/.test(key);
}

// Provider validation mapping
const KEY_VALIDATORS: Record<string, (key: string) => boolean> = {
  openai: isValidOpenAIKey,
  google_gemini: isValidGeminiKey,
  anthropic: isValidAnthropicKey,
  huggingface: isValidHuggingFaceKey,
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
      const key = match[1] || match[0];
      // Skip duplicates and invalid keys
      if (foundKeys.has(key) || !KEY_VALIDATORS[provider] || !KEY_VALIDATORS[provider](key)) continue;
      foundKeys.add(key);
      results.push({ key, provider });
    }
  }
  return results;
}

// --- In-memory cache for already scanned (repo, file, commit) ---
const scannedCache = new Set<string>();

// --- Resume tracking ---
interface ScanResumeState {
  currentQueryIndex: number;
  currentPage: number;
  lastProcessedTime: number;
}

let scanResumeState: ScanResumeState = {
  currentQueryIndex: 0,
  currentPage: 1,
  lastProcessedTime: Date.now()
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
    
    logger.warn(`[FARM] Scan state saved to file: query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
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
          currentQueryIndex: saved.currentQueryIndex || 0,
          currentPage: saved.currentPage || 1,
          lastProcessedTime: saved.lastProcessedTime || Date.now()
        };
        
        // Also set in memory
        (global as any).scanResumeState = scanResumeState;
        
        logger.warn(`[FARM] Resuming scan from file: query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
        return scanResumeState;
      } else {
        logger.warn(`[FARM] Invalid state file format, resetting to beginning`);
      }
    }
    
    // Fallback to memory state if file doesn't exist or is invalid
    if ((global as any).scanResumeState) {
      const saved = (global as any).scanResumeState as any;
      scanResumeState = {
        currentQueryIndex: saved.currentQueryIndex || 0,
        currentPage: saved.currentPage || 1,
        lastProcessedTime: saved.lastProcessedTime || Date.now()
      };
      logger.warn(`[FARM] Resuming scan from memory: query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
      return scanResumeState;
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to load resume state: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Reset to beginning only if no saved state exists
  scanResumeState = {
    currentQueryIndex: 0,
    currentPage: 1,
    lastProcessedTime: Date.now()
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
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now()
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
  const ops = leaks.map(leak => ({
    updateOne: {
      filter: { repoUrl: leak.repoUrl, filePath: leak.filePath, provider: leak.provider },
      update: leak,
      upsert: true
    }
  }));
  await Leak.bulkWrite(ops, { ordered: false });
}
async function batchInsertScanAttempts(attempts: any[]) {
  if (!attempts.length) return;
  await ScanAttempt.insertMany(attempts, { ordered: false });
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
    
    // Start from the current query index and page
    for (let queryIndex = resumeState.currentQueryIndex; queryIndex < ALL_SEARCH_QUERIES.length; queryIndex++) {
      if (!this.running) break;
      
      const query = ALL_SEARCH_QUERIES[queryIndex];
      
      // Update resume state to current position
      scanResumeState.currentQueryIndex = queryIndex;
      scanResumeState.currentPage = queryIndex === resumeState.currentQueryIndex ? resumeState.currentPage : 1;
      saveResumeState();
      
      logger.warn(`[FARM] Processing query ${queryIndex + 1}/${ALL_SEARCH_QUERIES.length}: "${query}" (starting from page ${scanResumeState.currentPage})`);
      
      try {
        if (query) {
          await this.processAllPagesForQuery(query);
          scannedAnything = true;
        }
        
        // Move to next query, reset page
        scanResumeState.currentQueryIndex = queryIndex + 1;
        scanResumeState.currentPage = 1;
        saveResumeState();
      } catch (error) {
        logger.error(`[FARM] Error processing query "${query}": ${error instanceof Error ? error.message : String(error)}`);
        // Save current state before moving to next query
        saveResumeState();
      }
    }
    
    // If we completed all queries, reset to beginning for next cycle
    if (scanResumeState.currentQueryIndex >= ALL_SEARCH_QUERIES.length) {
      scanResumeState.currentQueryIndex = 0;
      scanResumeState.currentPage = 1;
      saveResumeState();
      logger.warn(`[FARM] Completed all queries, resetting to beginning for next cycle`);
    }
    
    return scannedAnything;
  }

  // Process all pages for a single query sequentially
  private async processAllPagesForQuery(query: string): Promise<void> {
    // Start from the resume state page for this query
    let page = scanResumeState.currentPage;
    let hasMoreResults = true;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = MAX_RETRIES;
    let totalResults = 0;
    
    while (this.running && hasMoreResults) {
      await waitForRateLimitIfNeeded();
      
      // Update resume state with current page
      scanResumeState.currentPage = page;
      saveResumeState();
      
      let response: { data: GitHubSearchResponse };
      try {
        response = await retry(() => axios.get('https://api.github.com/search/code', {
          params: { q: query, per_page: 10, page },
          headers: {
            'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'API-Radar-Scanner/1.0',
          },
          timeout: 30000,
        }));
        consecutiveErrors = 0;
        const items: GitHubSearchItem[] = response.data?.items || [];
        
        if (items.length === 0) {
          hasMoreResults = false;
          break;
        }
        
        totalResults += items.length;
        
        await this.processSearchResults(items, query);
        
        // Pagination decision logic - continue until no more results
        if (items.length === 10) {
          page++;
          hasMoreResults = true;
        } else {
          hasMoreResults = false;
        }
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
              continue; // Continue with the same query after rate limit reset
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
                continue; // Continue with the same query after rate limit reset
              }
            }
          }
        }
        consecutiveErrors++;
        this.handleSearchError(error, query, page);
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          logger.error(`[FARM] Too many consecutive errors (${consecutiveErrors}) for query: ${query}, stopping pagination`);
          break;
        }
        page++;
        continue;
      }
    }
    
    // Reset page to 1 for next query
    scanResumeState.currentPage = 1;
    saveResumeState();
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
        logger.warn(`[FARM] Skipping file with problematic characters: ${filePath}`);
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
        logger.warn(`[FARM] Failed to get commit hash for ${repoName}/${filePath}: ${error instanceof Error ? error.message : String(error)}`);
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
        logger.warn(`[FARM] Skipping already scanned file: ${repoName}/${filePath} (commit: ${commitHash.substring(0, 8)})`);
        skippedCount++;
        continue;
      }
      
      // Check database for this specific commit+query combination
      if (await alreadyScanned(item.repository.html_url, filePath, query, commitHash)) {
        scannedCache.add(cacheKeyWithCommit);
        logger.warn(`[FARM] Skipping already scanned file: ${repoName}/${filePath} (commit: ${commitHash.substring(0, 8)})`);
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
        logger.warn(`[FARM] Failed to fetch content for ${repoName}/${filePath}: ${error instanceof Error ? error.message : String(error)}`);
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
    
    // Log summary for this batch
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
    
    // Process leaks only for repositories less than 12 months old
    if (repoCreatedAt >= REPOSITORY_AGE_CUTOFF) {
      for (const { key, provider } of leaks) {
        if (calculateEntropy(key) < SCAN_ENTROPY_THRESHOLD) continue;
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