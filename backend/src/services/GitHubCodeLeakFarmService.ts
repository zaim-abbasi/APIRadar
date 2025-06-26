import { githubService } from './github';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import type { ILeak } from '../models/Leak';
import axios from 'axios';

// Enhanced regex patterns with boundary checks and documentation
const PROVIDER_PATTERNS: { [provider: string]: RegExp } = {
  openai: /\b(sk-(?:proj-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}|[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}))\b/g,
  google_gemini: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  anthropic: /\b(sk-ant-api\d{2}-[a-zA-Z0-9]{32})\b/g,
  cohere: /\b([a-zA-Z0-9]{40})\b/g, // Consider refining if possible
  mistral_ai: /\b([a-zA-Z0-9]{32})\b/g, // Consider refining if possible
  huggingface: /\b(hf_[a-zA-Z0-9]{34})\b/g,
};

// Contextual search queries for broader coverage
const ENV_VARIATIONS = ['.env', '.env.local', '.env.development', '.env.production'];
const PROVIDERS = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CO_API_KEY',
  'MISTRAL_API_KEY',
  'HUGGINGFACE_API_KEY',
];

const SEARCH_QUERIES = ENV_VARIATIONS.flatMap(envFile =>
  PROVIDERS.map(providerKey => `filename:${envFile} "${providerKey}"`)
);

// Configuration constants with fallback defaults
const SCAN_ENTROPY_THRESHOLD = Number(process.env['SCAN_ENTROPY_THRESHOLD']) || 4.0;
const MAX_SEARCH_PAGES = Number(process.env['MAX_SEARCH_PAGES']) || 10; // Prevent infinite loops
const SEARCH_RETRY_ATTEMPTS = Number(process.env['SEARCH_RETRY_ATTEMPTS']) || 3;

// Repository age filtering: Only save data for repositories created within the last 12 months
// This reduces noise from stale repositories with expired API keys
// Cutoff date: July 1, 2024 (12 months before July 2025)
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

function isValidCohereKey(key: string): boolean {
  // Stricter validation for Cohere keys - they should have high entropy and specific character patterns
  if (!/^[a-zA-Z0-9]{40}$/.test(key)) return false;
  const entropy = calculateEntropy(key);
  return entropy >= 4.5; // Higher entropy threshold for generic patterns
}

function isValidMistralKey(key: string): boolean {
  // Stricter validation for Mistral keys - they should have high entropy and specific character patterns
  if (!/^[a-zA-Z0-9]{32}$/.test(key)) return false;
  const entropy = calculateEntropy(key);
  return entropy >= 4.2; // Higher entropy threshold for generic patterns
}

function isValidHuggingFaceKey(key: string): boolean {
  return /^hf_[a-zA-Z0-9]{34}$/.test(key);
}

// Provider validation mapping
const KEY_VALIDATORS: Record<string, (key: string) => boolean> = {
  openai: isValidOpenAIKey,
  google_gemini: isValidGeminiKey,
  anthropic: isValidAnthropicKey,
  cohere: isValidCohereKey,
  mistral_ai: isValidMistralKey,
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
  const recentScan = await ScanAttempt.findOne({
    repoUrl,
    filePath,
    queryUsed: query,
    commitHash
  }).lean();
  return !!recentScan;
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

// --- Concurrency Pool Utility ---
function concurrencyPool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  return new Promise((resolve) => {
    const results: T[] = [];
    let i = 0;
    let active = 0;
    let done = 0;
    function next() {
      if (done === tasks.length) return resolve(results);
      while (active < limit && i < tasks.length) {
        const cur = i++;
        active++;
        const task = tasks[cur];
        if (typeof task === 'function') {
          task()
            .then((res) => { results[cur] = res; })
            .catch((err) => { results[cur] = err; })
            .finally(() => { active--; done++; next(); });
        } else {
          results[cur] = undefined as any;
          active--; done++; next();
        }
      }
    }
    next();
  });
}

// --- Configurable Concurrency ---
function getEnvInt(name: string): number {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  const num = Number(val);
  if (isNaN(num)) throw new Error(`Invalid number for environment variable: ${name}`);
  return num;
}
const MAX_CONCURRENT_QUERIES = getEnvInt('MAX_CONCURRENT_QUERIES');
const MAX_CONCURRENT_FILE_SCANS = getEnvInt('MAX_CONCURRENT_FILE_SCANS');
const MAX_RETRIES = getEnvInt('MAX_RETRIES');
const RETRY_BASE_DELAY = getEnvInt('RETRY_BASE_DELAY');

// --- In-memory cache for already scanned (repo, file, commit) ---
const scannedCache = new Set<string>();

// --- Global Rate Limit State ---
let rateLimitPauseUntil: number | null = null;
let rateLimitActive = false;
let rateLimitWarned = false;

async function waitForRateLimitIfNeeded() {
  while (rateLimitPauseUntil && Date.now() < rateLimitPauseUntil) {
    if (!rateLimitWarned) {
      const waitSec = Math.ceil((rateLimitPauseUntil - Date.now()) / 1000);
      logger.warn(`[GITHUB] Rate limit hit. Pausing all scans for ${waitSec}s.`);
      rateLimitWarned = true;
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  if (rateLimitActive && rateLimitPauseUntil && Date.now() >= rateLimitPauseUntil) {
    logger.init('[GITHUB] Rate limit reset, resuming scans...');
    rateLimitActive = false;
    rateLimitPauseUntil = null;
    rateLimitWarned = false;
  }
}

// Patch retry wrapper to call waitForRateLimitIfNeeded before each attempt
async function retry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let attempt = 0;
  let lastErr;
  while (attempt < maxRetries) {
    await waitForRateLimitIfNeeded();
    try {
      return await fn();
    } catch (err: any) {
      // Detect GitHub rate limit error
      if (err.response && err.response.status === 403 && err.response.headers && err.response.headers['x-ratelimit-remaining'] === '0') {
        const reset = err.response.headers['x-ratelimit-reset'];
        if (reset) {
          const resetTime = parseInt(reset, 10) * 1000;
          if (!rateLimitPauseUntil || resetTime > rateLimitPauseUntil) {
            rateLimitPauseUntil = resetTime;
            rateLimitActive = true;
            rateLimitWarned = false;
          }
        }
        // Wait for the pause, then retry
        await waitForRateLimitIfNeeded();
        attempt++;
        continue;
      }
      lastErr = err;
      await new Promise(res => setTimeout(res, RETRY_BASE_DELAY * Math.pow(2, attempt)));
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
  }

  public start() {
    if (this.running) return;
    this.running = true;
    logger.status('farm', 'Service started', 'GitHubCodeLeakFarm');
    this.scanLoop();
  }

  public stop() {
    this.running = false;
    logger.status('farm', 'Service stopped', 'GitHubCodeLeakFarm');
  }

  private async scanLoop(): Promise<void> {
    let lastStatusLog = Date.now();
    const STATUS_LOG_INTERVAL = 1 * 60 * 1000; // 1 minute
    let firstCycle = true;
    while (this.running) {
      let scannedAnything = false;
      try {
        scannedAnything = await this.executeScanCycle();
      } catch (error) {
        logger.error('[FARM] Scan cycle error: ' + (error instanceof Error ? error.message : String(error)));
      }
      if (firstCycle && !scannedAnything) {
        logger.init('No new files to scan. System is idle, waiting for new changes...');
        firstCycle = false;
      }
      if (Date.now() - lastStatusLog > STATUS_LOG_INTERVAL) {
        logger.init('No new files to scan. System is idle, waiting for new changes...');
        lastStatusLog = Date.now();
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async executeScanCycle(): Promise<boolean> {
    let scannedAnything = false;
    // Parallelize queries with concurrency pool
    const queryTasks = SEARCH_QUERIES.map(query => async () => {
      if (!this.running) return false;
      await this.processSearchQuery(query);
      return true;
    });
    const results = await concurrencyPool(queryTasks, MAX_CONCURRENT_QUERIES);
    scannedAnything = results.some(Boolean);
    return scannedAnything;
  }

  private async processSearchQuery(query: string): Promise<void> {
    let page = 1;
    let hasMoreResults = true;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = SEARCH_RETRY_ATTEMPTS;

    while (this.running && hasMoreResults && page <= MAX_SEARCH_PAGES) {
      await waitForRateLimitIfNeeded();
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
        consecutiveErrors = 0; // Reset error counter on success
      } catch (error) {
        consecutiveErrors++;
        this.handleSearchError(error, query, page);
        
        // Break on too many consecutive errors or specific error types
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          logger.error(`[FARM] Too many consecutive errors (${consecutiveErrors}) for query: ${query}, stopping pagination`);
          break;
        }
        
        // Continue to next page on transient errors
        page++;
        continue;
      }

      const items: GitHubSearchItem[] = response.data?.items || [];
      if (items.length === 0) {
        hasMoreResults = false;
        break;
      }

      await this.processSearchResults(items, query);
      
      // Pagination control - only increment if we got a full page
      if (items.length === 10) {
        page++;
      } else {
        hasMoreResults = false;
      }
    }

    if (page > MAX_SEARCH_PAGES) {
      // Do not log anything when max page limit is reached
    }
  }

  private async processSearchResults(items: GitHubSearchItem[], query: string): Promise<void> {
    // Parallelize file scans with concurrency pool
    const scanTasks = items.map(item => async () => {
      await waitForRateLimitIfNeeded();
      if (!this.running) return;
      const repoName: string = item.repository.full_name;
      const filePath: string = item.path;
      
      // Exclude documentation files from scan targets
      const docFilePatterns = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^code\_of\_conduct(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];
      const fileName = filePath.split('/').pop() || '';
      if (docFilePatterns.some(pattern => pattern.test(fileName))) return;
      let commitHash = '';
      try {
        await waitForRateLimitIfNeeded();
        commitHash = await retry(() => githubService.getFileLatestCommitHash(repoName, filePath));
      } catch {
        return;
      }
      if (!commitHash) return;
      const cacheKey = `${item.repository.html_url}|${filePath}|${query}|${commitHash}`;
      if (scannedCache.has(cacheKey)) return;
      if (await alreadyScanned(item.repository.html_url, filePath, query, commitHash)) {
        scannedCache.add(cacheKey);
        return;
      }
      await waitForRateLimitIfNeeded();
      logger.scan(repoName, filePath);
      let content;
      try {
        await waitForRateLimitIfNeeded();
        content = await retry(() => fetchRawFileContent(repoName, filePath, 'HEAD'));
      } catch {
        return;
      }
      if (!content) return;
      await this.detectAndSaveLeaks(content, repoName, item.repository.html_url, filePath, query, commitHash);
      scannedCache.add(cacheKey);
    });
    await concurrencyPool(scanTasks, MAX_CONCURRENT_FILE_SCANS);
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