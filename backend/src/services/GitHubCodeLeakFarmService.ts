import { logger } from '../utils/logger';
import { githubService } from './github';
import { ILeak, Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { waitForRateLimitIfNeeded, setRateLimit, rateLimitActive, rateLimitPauseUntil, clearRateLimit, initializeRateLimitManager, lastRateLimitResetTime, checkActualRateLimitStatus, isRateLimitStuck } from './rateLimitManager';
import axios from 'axios';
import { ConfigurationService } from './ConfigurationService';
import { KEY_VALIDATORS } from './apiKeyValidator';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { dbResilienceManager } from '../utils/dbResilience';
import { FatalErrorRecoveryManager } from '../utils/fatalErrorRecovery';
import { rateLimitOptimizer } from './rateLimitOptimizer';
import { ConcurrencyManager } from '../utils/concurrencyManager';
import { LRUCache } from '../utils/lruCache';
import { queryPrioritizer } from '../utils/queryPrioritizer';
const SEARCH_PATTERNS = [
  {
    provider: 'anthropic',
    pattern: /\b(sk-ant-api\d{2}-[a-zA-Z0-9+/=]{30,150})\b/g,
    searchString: 'sk-ant-api'
  },
  {
    provider: 'google',
    pattern: /\b(AIza[0-9A-Za-z\-_]{30,40})\b/g,
    searchString: 'AIza'
  },
  {
    provider: 'openai',
    pattern: /\b(sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,})\b/g,
    searchString: 'sk-'
  }
];
const PROVIDER_PATTERNS: { [provider: string]: RegExp } = (() => {
  const patternMap: { [provider: string]: RegExp } = {};
  
  SEARCH_PATTERNS.forEach(({ provider, pattern }) => {
    patternMap[provider] = pattern;
  });
  
  return patternMap;
})();
const HIGH_RISK_FILE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
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
  'secret.json',
  'secret.yaml',
  'secret.yml',
  'credentials.json',
  'credentials.yaml',
  'credentials.yml',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  '.circleci/config.yml',
  'deployment.yml',
  'deployment.yaml',
  'k8s.yml',
  'k8s.yaml',
  '*.tf',
  'config.js',
  'config.ts',
  'next.config.js',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'nuxt.config.js',
  'nuxt.config.ts',
  'settings.py',
  'config.py',
  'wp-config.php'
];
const generateComprehensiveQueries = () => {
  const queries: string[] = [];
  HIGH_RISK_FILE_PATTERNS.forEach(filePattern => {
    SEARCH_PATTERNS.forEach(({ searchString }) => {
      queries.push(`filename:${filePattern} ${searchString}`);
    });
  });
  
  return queries;
};
const ALL_SEARCH_QUERIES = generateComprehensiveQueries();
const PROVIDER_QUERIES = {
  openai: ALL_SEARCH_QUERIES.filter(query => query.includes('sk-') && !query.includes('sk-ant-api')),
  google: ALL_SEARCH_QUERIES.filter(query => query.includes('AIza')),
  anthropic: ALL_SEARCH_QUERIES.filter(query => query.includes('sk-ant-api'))
};
const MAX_RETRIES = 2;
const githubApiCircuitBreaker = new CircuitBreaker('github-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 120000,
  monitoringPeriod: 60000
});
const fatalErrorRecovery = new FatalErrorRecoveryManager({
  maxRestartAttempts: 5,
  restartBackoffBase: 10000,
  restartBackoffMax: 300000,
  fatalErrorWindow: 3600000,
  maxFatalErrorsInWindow: 10,
  statePreservationEnabled: true
});
interface GitHubSearchItem {
  repository: {
    full_name: string;
    html_url: string;
  };
  path: string;
}
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
function redactKey(key: string): string {
  if (key.length <= 8) return key;
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
    const recentScan = await dbResilienceManager.execute(async () => {
      return await ScanAttempt.findOne({
        repoUrl,
        filePath,
        commitHash
      }).lean();
    }, {
      queueOnFailure: false,
      timeout: 10000
    });
    return !!recentScan;
  } catch (error) {
    logger.warn(`[FARM] Database query failed for duplicate check: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
async function repoAlreadyScannedWithCommit(repoUrl: string, currentCommitHash: string): Promise<boolean> {
  try {
    const cachedCommit = repoLastCommitCache.get(repoUrl);
    if (cachedCommit === currentCommitHash) {
      return true;
    }
    const latestScan = await dbResilienceManager.execute(async () => {
      return await ScanAttempt.findOne({
        repoUrl
      })
      .sort({ scannedAt: -1 })
      .select('commitHash')
      .lean();
    }, {
      queueOnFailure: false,
      timeout: 10000
    });
    if (latestScan && latestScan.commitHash === currentCommitHash) {
      repoLastCommitCache.set(repoUrl, currentCommitHash);
      return true;
    }
    if (currentCommitHash) {
      repoLastCommitCache.set(repoUrl, currentCommitHash);
    }
    return false;
  } catch (error) {
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
      const key = match[1] || match[0];
      const validator = KEY_VALIDATORS[provider];
      if (foundKeys.has(key) || !validator || !validator(key)) {
        continue;
      }
      
      foundKeys.add(key);
      results.push({ key, provider });
    }
  }
  return results;
}
const scannedCache = new LRUCache<string, boolean>(10000, 24 * 60 * 60 * 1000);
const repoLastCommitCache = new LRUCache<string, string>(5000, 24 * 60 * 60 * 1000);
function getFileConcurrency(): number {
  const tokenCount = rateLimitOptimizer.getTokenCount();
  return Math.max(5, Math.min(tokenCount * 3, 30));
}
function getRepoConcurrency(): number {
  const tokenCount = rateLimitOptimizer.getTokenCount();
  return Math.max(3, Math.min(tokenCount, 10));
}
interface ScanResumeState {
  currentProviderIndex: number;
  currentQueryIndex: number;
  currentPage: number;
  lastProcessedTime: number;
  providerStates: {
    [provider: string]: {
      queryIndex: number;
      page: number;
      queryEmptyPages?: {
        [query: string]: number;
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
    google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
    anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
  }
};
async function saveResumeState() {
  try {
    const state = {
      ...scanResumeState,
      savedAt: new Date()
    };
    const success = await ConfigurationService.setScanState(state);
    if (!success) {
      logger.warn('[FARM] Failed to save scan state to database');
    }
    (global as any).scanResumeState = state;
    if (!(global as any).scanResumeState) {
      logger.warn(`[FARM] Scan state saved: provider ${scanResumeState.currentProviderIndex}, query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to save resume state: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function loadResumeState(): Promise<ScanResumeState> {
  try {
    const saved = await ConfigurationService.getScanState();
      if (saved && typeof saved.currentQueryIndex === 'number' && typeof saved.currentPage === 'number') {
        const defaultProviderStates = {
          openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
          google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
          anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
        };
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
      (global as any).scanResumeState = scanResumeState;
      if (!(global as any).scanResumeState) {
        logger.warn(`[FARM] Resuming scan: provider ${scanResumeState.currentProviderIndex}, query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
      }
      return scanResumeState;
    } else {
      logger.warn(`[FARM] Invalid state format in database, resetting to beginning`);
    }
    if ((global as any).scanResumeState) {
      const saved = (global as any).scanResumeState as any;
      const defaultProviderStates = {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
          anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      };
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
  scanResumeState = {
    currentProviderIndex: 0,
    currentQueryIndex: 0,
    currentPage: 1,
    lastProcessedTime: Date.now(),
    providerStates: {
      openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
      google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
      anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
    }
  };
  return scanResumeState;
}
async function clearScanState(): Promise<void> {
  try {
    const success = await ConfigurationService.setScanState({
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      }
    });
    if (success) {
      logger.warn(`[FARM] Scan state cleared from database`);
    } else {
      logger.warn(`[FARM] Failed to clear scan state from database`);
    }
    scanResumeState = {
      currentProviderIndex: 0,
      currentQueryIndex: 0,
      currentPage: 1,
      lastProcessedTime: Date.now(),
      providerStates: {
        openai: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        google: { queryIndex: 0, page: 1, queryEmptyPages: {} },
        anthropic: { queryIndex: 0, page: 1, queryEmptyPages: {} }
      }
    };
    delete (global as any).scanResumeState;
    logger.warn(`[FARM] Scan state cleared, will start from beginning on next restart`);
  } catch (error) {
    logger.warn(`[FARM] Failed to clear scan state: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function retry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  await waitForRateLimitIfNeeded();
  try {
    return await githubApiCircuitBreaker.execute(async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const resultPromise = fn();
      return await Promise.race([resultPromise, timeoutPromise]);
    });
  } catch (err: any) {
    if (err.response && err.response.status === 401) {
      if (githubApiCircuitBreaker.getFailureCount() > 0) {
        githubApiCircuitBreaker.reset();
      }
    }
    if (err.response && err.response.status === 401) {
      logger.error(`[GITHUB] 401 Unauthorized - Token may be invalid or expired. Rotating to next token...`);
      rateLimitOptimizer.rotateToBestToken();
      throw err;
    }
    if (err.response && (err.response.status === 403 || err.response.status === 429)) {
      const statusCode = err.response.status;
      const headers = err.response.headers || {};
      const remaining = headers['x-ratelimit-remaining'];
      const reset = headers['x-ratelimit-reset'];
      const limit = headers['x-ratelimit-limit'];
      const message = err.response.data?.message || '';
      
      const shortLog = `[GITHUB] ${statusCode}: limit=${limit}, remaining=${remaining}, reset=${reset}, msg=${message.slice(0, 80)}...`;
      logger.warn(shortLog);
      if (statusCode === 429) {
        if (reset && Number(reset) * 1000 > Date.now()) {
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err;
        } else {
          logger.warn('[GITHUB] 429 rate limit error (no reset time). Waiting 30s...');
          await new Promise(res => setTimeout(res, 30000));
          throw err;
        }
      }
      if (statusCode === 403) {
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
        if (message.toLowerCase().includes('abuse') || message.toLowerCase().includes('secondary')) {
          logger.warn('[GITHUB] Secondary or abuse rate limit detected. Waiting 60s...');
          await new Promise(res => setTimeout(res, 60000));
          throw err;
        }
        if (reset && Number(reset) * 1000 > Date.now() && remaining !== '0') {
          logger.warn('[GITHUB] Secondary rate limit detected (403 with remaining > 0). Waiting for reset...');
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err;
        }
        if (remaining === '0' && reset && Number(reset) * 1000 > Date.now()) {
          logger.warn('[GITHUB] Unknown rate limit pattern detected, treating as rate limit...');
          const resetTime = parseInt(reset, 10) * 1000;
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          throw err;
        }
      }
    }
    if (err.response && err.response.status === 401) {
      logger.error(`[GITHUB] 401 Unauthorized - Token authentication failed. This is not retryable.`);
      throw err;
    }
    return await retryWithBackoff(
      async () => {
        await waitForRateLimitIfNeeded();
        return await githubApiCircuitBreaker.execute(fn);
      },
      {
        maxRetries: MAX_RETRIES,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBase: 2,
        jitter: true,
        jitterFactor: 0.3
      },
      context || 'RETRY'
    );
  }
}
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
    queueOnFailure: true,
    timeout: 30000
  }).catch((error: any) => {
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
export class GitHubCodeLeakFarmService {
  private running = false;
  constructor() {
    initializeRateLimitManager();
  }
  public async start() {
    if (this.running) {
      logger.warn('[FARM] Service is already running');
      return;
    }
    this.running = true;
    logger.init('[FARM] Starting GitHub code leak farm service...');
    this.immediateConfigCheck();
    try {
      await rateLimitOptimizer.refreshAllTokenStatuses();
    } catch (error) {
      logger.warn(`[FARM] Failed to refresh token statuses on startup: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.scanLoop();
  }

  private async immediateConfigCheck() {
    try {
      logger.init('[FARM] Performing immediate configuration check...');
      const wasReinitialized = await ConfigurationService.checkAndReinitialize();
      if (wasReinitialized) {
        logger.warn('[FARM] Configuration was missing and has been reinitialized on startup');
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
    saveResumeState();
    logger.status('farm', 'Service stopped', 'GitHubCodeLeakFarm');
  }

  public clearState() {
    clearScanState();
  }
  private async scanLoop(): Promise<void> {
    fatalErrorRecovery.resetRestartAttempts();
    try {
      await this.scanLoopInternal();
    } catch (fatalError) {
      logger.error(
        `[FARM] FATAL: Unhandled error in scanLoop: ${fatalError instanceof Error ? fatalError.stack : String(fatalError)}`
      );
      await fatalErrorRecovery.handleFatalError(
        fatalError instanceof Error ? fatalError : new Error(String(fatalError)),
        async () => {
          logger.warn('[FARM] Attempting to recover from fatal error...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          this.scanLoop();
        },
        async () => {
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
    let lastTokenStateLog = Date.now();
    const STATUS_LOG_INTERVAL = 1 * 60 * 1000;
    const RATE_LIMIT_CHECK_INTERVAL = 10 * 1000;
    const CONFIG_CHECK_INTERVAL = 30 * 1000;
    const TOKEN_REFRESH_INTERVAL = 60 * 1000;
    const TOKEN_STATE_LOG_INTERVAL = 5 * 60 * 1000;
    let firstCycle = true;
    let scanCompleted = false;
    while (this.running) {
        if (Date.now() - lastTokenRefresh > TOKEN_REFRESH_INTERVAL) {
          lastTokenRefresh = Date.now();
          try {
            await rateLimitOptimizer.refreshAllTokenStatuses();
          } catch (error) {
            logger.warn(`[FARM] Failed to refresh token statuses: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        if (Date.now() - lastTokenStateLog > TOKEN_STATE_LOG_INTERVAL) {
          lastTokenStateLog = Date.now();
          const status = rateLimitOptimizer.getStatus();
          const tokenStates = status.tokens.map(t => 
            t.codeSearchRemaining !== null && t.codeSearchLimit !== null
              ? `Token ${t.index + 1}: ${t.codeSearchRemaining}/${t.codeSearchLimit}`
              : `Token ${t.index + 1}: unknown`
          ).join(', ');
          logger.warn(`[RATE-LIMIT] Token states (current: ${status.currentToken + 1}): ${tokenStates}`);
        }
        if (Date.now() - lastConfigCheck > CONFIG_CHECK_INTERVAL) {
          lastConfigCheck = Date.now();
          try {
            const wasReinitialized = await ConfigurationService.checkAndReinitialize();
            if (wasReinitialized) {
              logger.warn('[FARM] Configuration was missing and has been reinitialized');
              scanResumeState = await loadResumeState();
              scanCompleted = false;
            }
          } catch (error) {
            logger.error(`[FARM] Configuration check failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        if (rateLimitActive && rateLimitPauseUntil) {
          if (isRateLimitStuck()) {
            logger.init('[GITHUB] Detected stuck rate limit state, force clearing...');
            clearRateLimit();
            continue;
          }
          if (Date.now() - lastRateLimitCheck > RATE_LIMIT_CHECK_INTERVAL) {
            lastRateLimitCheck = Date.now();
            const isStillRateLimited = await checkActualRateLimitStatus();
            if (!isStillRateLimited) {
              continue;
            }
          }
          if (rateLimitPauseUntil < Date.now()) {
            logger.init('[GITHUB] Detected rate limit has expired, clearing state...');
            clearRateLimit();
          } else {
            await waitForRateLimitIfNeeded();
            continue;
          }
        }
        if (lastRateLimitResetTime && (Date.now() - lastRateLimitResetTime) > 5 * 60 * 1000) {
          logger.init('[GITHUB] Clearing old rate limit state (more than 5 minutes old)...');
          clearRateLimit();
        }
        if (Date.now() - lastConfigCheck > CONFIG_CHECK_INTERVAL) {
          const cleaned = scannedCache.cleanExpired();
          if (cleaned > 0) {
            logger.warn(`[FARM] Cleaned ${cleaned} expired cache entries`);
          }
        }
        if (scanCompleted) {
          if (firstCycle) {
            logger.init('Scan cycle completed. System is idle, waiting for manual restart or configuration changes...');
            firstCycle = false;
          } else if (Date.now() - lastStatusLog > STATUS_LOG_INTERVAL) {
            logger.init('Scan cycle completed. System is idle, waiting for manual restart or configuration changes...');
            lastStatusLog = Date.now();
          }
          continue;
        }
        
        let scannedAnything = false;
        try {
          scannedAnything = await this.executeScanCycle();
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
    const providerNames: Array<keyof typeof PROVIDER_QUERIES> = ['openai', 'google', 'anthropic'];
    const MAX_PAGE = 100;
    for (const provider of providerNames) {
      const providerState = state.providerStates[provider];
      if (!providerState || providerState.page < MAX_PAGE) {
        return false;
      }
    }
    return true;
  }

  private async executeScanCycle(): Promise<boolean> {
    let scannedAnything = false;
    try {
      const resumeState = await loadResumeState();
      const providerNames: Array<keyof typeof PROVIDER_QUERIES> = ['openai', 'google', 'anthropic'];
      const validProviderIndex = Math.max(0, Math.min(resumeState.currentProviderIndex, providerNames.length - 1));
      const currentProvider = providerNames[validProviderIndex];
      if (!currentProvider) {
        logger.error(`[FARM] Invalid provider index: ${resumeState.currentProviderIndex}, resetting to 0`);
        scanResumeState.currentProviderIndex = 0;
        await saveResumeState();
        return false;
      }
      const typedCurrentProvider = currentProvider as keyof typeof PROVIDER_QUERIES;
      let providerQueries = PROVIDER_QUERIES[typedCurrentProvider];
      providerQueries = queryPrioritizer.prioritizeQueries(providerQueries);
      const defaultProviderState = { queryIndex: 0, page: 1, queryEmptyPages: {} };
      const providerState = resumeState.providerStates[typedCurrentProvider] || defaultProviderState;
      if (!providerState.queryEmptyPages) {
        providerState.queryEmptyPages = {};
      }
      let queryIndex = providerState.queryIndex;
      let page = providerState.page;
      scanResumeState.currentProviderIndex = validProviderIndex;
      scanResumeState.currentQueryIndex = queryIndex;
      scanResumeState.currentPage = page;
      try {
        const query = providerQueries[queryIndex];
        if (query) {
          const startTime = Date.now();
          try {
            const result = await this.processOnePageForQuery(query, page);
            if (result.hadResults) {
              scannedAnything = true;
              if (!scanResumeState.providerStates[typedCurrentProvider]) {
                scanResumeState.providerStates[typedCurrentProvider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
              }
              if (!scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages) {
                scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages = {};
              }
              scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] = 0;
              const responseTime = Date.now() - startTime;
              queryPrioritizer.recordExecution(query, true, result.itemCount, responseTime);
              logger.warn(`[FARM] Processed ${typedCurrentProvider} (query ${queryIndex + 1}/${providerQueries.length}, page ${page})`);
            } else {
              if (!scanResumeState.providerStates[typedCurrentProvider]) {
                scanResumeState.providerStates[typedCurrentProvider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
              }
              if (!scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages) {
                scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages = {};
              }
              const currentEmptyCount = scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] || 0;
              scanResumeState.providerStates[typedCurrentProvider].queryEmptyPages![query] = currentEmptyCount + 1;
              const responseTime = Date.now() - startTime;
              queryPrioritizer.recordExecution(query, true, 0, responseTime);
            }
          } catch (error) {
            const startTime = Date.now();
            const responseTime = Date.now() - startTime;
            queryPrioritizer.recordExecution(query, false, 0, responseTime);
            throw error;
          }
        }
        const EMPTY_PAGE_THRESHOLD = 3;
        const providerState = scanResumeState.providerStates[typedCurrentProvider];
        const emptyPagesCount = (query && providerState?.queryEmptyPages) ? (providerState.queryEmptyPages[query] ?? 0) : 0;
        if (query && emptyPagesCount >= EMPTY_PAGE_THRESHOLD) {
          logger.warn(`[FARM] Skipping query "${query}" after ${EMPTY_PAGE_THRESHOLD} consecutive empty pages (current page: ${page})`);
          if (providerState && providerState.queryEmptyPages) {
            providerState.queryEmptyPages[query] = 0;
          }
          queryIndex++;
          if (queryIndex >= providerQueries.length) {
            queryIndex = 0;
            page++;
          }
        } else {
          queryIndex++;
          if (queryIndex >= providerQueries.length) {
            queryIndex = 0;
            page++;
          }
        }
        const MAX_PAGE = 100;
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
            scanResumeState.providerStates[provider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
          }
          scanResumeState.currentPage = 1;
          scanResumeState.currentQueryIndex = 0;
          page = 1;
          queryIndex = 0;
          logger.warn(`[FARM] Max page reached (> ${MAX_PAGE}). Resetting all providers to page 1 to catch new repos.`);
        }
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
        scanResumeState.currentProviderIndex = (validProviderIndex + 1) % providerNames.length;
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
  private async processOnePageForQuery(query: string, page: number): Promise<{ hadResults: boolean; itemCount: number }> {
    try {
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      if (!this.running) return { hadResults: false, itemCount: 0 };
      const response = await retry(() => githubService.searchCode(query, page, 10), 'SEARCH');
      const items: GitHubSearchItem[] = response.data?.items || [];
      const itemCount = items.length;
      
      if (itemCount === 0) {
        return { hadResults: false, itemCount: 0 };
      }
      
      await this.processSearchResults(items, query);
      return { hadResults: true, itemCount };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 429) {
          logger.warn(`[FARM] Rate limit error (${error.response.status}) for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 };
        } else if (error.response?.status === 422) {
          const errorMessage = error.response.data?.message || '';
          if (page > 100 || errorMessage.includes('page') || errorMessage.includes('limit') || errorMessage.includes('422')) {
            logger.warn(`[FARM] No more results available for query "${query}" (page ${page}): Reached end of results`);
            return { hadResults: false, itemCount: 0 };
          } else {
            logger.warn(`[FARM] Invalid search query "${query}" (page ${page}): ${error.message}`);
            return { hadResults: false, itemCount: 0 };
          }
        } else if (error.response?.status && error.response.status >= 500) {
          logger.warn(`[FARM] Server error (${error.response.status}) for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 };
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          logger.warn(`[FARM] Timeout error for query "${query}" (page ${page}): ${error.message}`);
          return { hadResults: false, itemCount: 0 };
        }
      }
      logger.error(`[FARM] Unexpected error in processOnePageForQuery for "${query}" (page ${page}): ${error instanceof Error ? error.message : String(error)}`);
      return { hadResults: false, itemCount: 0 };
    }
  }
  private async processSearchResults(items: GitHubSearchItem[], query: string): Promise<void> {
    let processedCount = 0;
    let skippedCount = 0;
    const repoGroups = new Map<string, GitHubSearchItem[]>();
    for (const item of items) {
      const repoUrl = item.repository.html_url;
      if (!repoGroups.has(repoUrl)) {
        repoGroups.set(repoUrl, []);
      }
      repoGroups.get(repoUrl)!.push(item);
    }
    const reposToProcess: { repoUrl: string; items: GitHubSearchItem[]; repoName: string }[] = [];
    const repoEntries = Array.from(repoGroups.entries());
    const repoConcurrency = getRepoConcurrency();
    const repoCheckManager = new ConcurrencyManager(repoConcurrency);
    const repoCheckPromises = repoEntries.map(([repoUrl, repoItems]) => 
      repoCheckManager.execute(async () => {
        const repoName = repoItems[0]!.repository.full_name;
        let repoLatestCommit = '';
        try {
          await waitForRateLimitIfNeeded();
          await rateLimitOptimizer.waitWithThrottling();
          repoLatestCommit = await retry(() => githubService.getRepoLatestCommitHash(repoName), 'REPO-COMMIT');
        } catch (error) {
          logger.warn(`[FARM] Failed to get repo commit for ${repoName}, processing files individually: ${error instanceof Error ? error.message : String(error)}`);
          return { repoUrl, items: repoItems, repoName, skip: false };
        }
        if (!repoLatestCommit) {
          return { repoUrl, items: repoItems, repoName, skip: false };
        }
        if (await repoAlreadyScannedWithCommit(repoUrl, repoLatestCommit)) {
          logger.warn(`[FARM] SKIP REPO: ${repoName} - Already scanned with commit ${repoLatestCommit.substring(0, 8)}... (${repoItems.length} files skipped)`);
          return { repoUrl, items: repoItems, repoName, skip: true };
        }
        return { repoUrl, items: repoItems, repoName, skip: false };
      }).catch(() => ({ repoUrl, items: repoItems, repoName: repoItems[0]!.repository.full_name, skip: false }))
    );
    const repoCheckResults = await Promise.all(repoCheckPromises);
    for (const result of repoCheckResults) {
      if (result.skip) {
        skippedCount += result.items.length;
      } else {
        reposToProcess.push({ repoUrl: result.repoUrl, items: result.items, repoName: result.repoName });
      }
    }
    const processItem = async (item: GitHubSearchItem): Promise<{ processed: boolean; skipped: boolean }> => {
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      if (!this.running) return { processed: false, skipped: false };
      
      const repoName: string = item.repository.full_name;
      const filePath: string = item.path;
      const docFilePatterns = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^code\_of\_conduct(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];
      const fileName = filePath.split('/').pop() || '';
      if (docFilePatterns.some(pattern => pattern.test(fileName))) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Documentation file (${fileName})`);
        return { processed: false, skipped: true };
      }
      if (fileName.includes('#') || fileName.includes('?') || fileName.includes('&')) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Problematic characters in filename (${fileName})`);
        return { processed: false, skipped: true };
      }
      const cacheKey = `${item.repository.html_url}|${filePath}|${query}`;
      if (scannedCache.has(cacheKey)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in cache (query: ${query})`);
        return { processed: false, skipped: true };
      }
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
      const cacheKeyWithCommit = `${item.repository.html_url}|${filePath}|${query}|${commitHash}`;
      if (scannedCache.has(cacheKeyWithCommit)) {
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already scanned with this commit (${commitHash.substring(0, 8)}...)`);
        return { processed: false, skipped: true };
      }
      if (await alreadyScanned(item.repository.html_url, filePath, commitHash)) {
        scannedCache.set(cacheKeyWithCommit, true);
        logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already in database (commit: ${commitHash.substring(0, 8)}...)`);
        return { processed: false, skipped: true };
      }
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
    const itemsToProcess: GitHubSearchItem[] = [];
    for (const { items } of reposToProcess) {
      itemsToProcess.push(...items);
    }
    const fileConcurrencyManager = new ConcurrencyManager(getFileConcurrency());
    const results = await fileConcurrencyManager.executeAll(
      itemsToProcess.map(item => () => processItem(item))
    );
    results.forEach(result => {
      if (result?.processed) processedCount++;
      if (result?.skipped) skippedCount++;
    });
    const leakCount = processedCount;
    queryPrioritizer.recordExecution(query, true, leakCount, 0);
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
    const leaks = extractApiKeys(content);
    const foundLeaks: Partial<ILeak>[] = [];
    const leakCount = leaks.length;
    let repoCreatedAt: Date;
    try {
      await rateLimitOptimizer.waitWithThrottling();
      repoCreatedAt = await retry(() => this.getRepoCreationDate(repoName), 'REPO-METADATA');
    } catch (error) {
      logger.error('[FARM] Failed to get repo creation date: ' + (error instanceof Error ? error.message : String(error)));
      await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, false, []);
      return;
    }
    for (const { key, provider } of leaks) {
      try {
        await rateLimitOptimizer.waitWithThrottling();
        const leakIntroducedAt = await retry(() => this.getLeakIntroductionDate(repoName, filePath), 'LEAK-DATE');
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
        logger.leak(
          provider,
          `${repoName} | ${filePath} | ${redactKey(key)}`
        );
        foundLeaks.push(leakData);
      } catch (error) {
        logger.error('[FARM] Failed to save leak: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    if (foundLeaks.length > 0) {
      await batchUpsertLeaks(foundLeaks);
    }
    await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, foundLeaks.length > 0, foundLeaks.map(l => l.provider as string));
    if (leakCount > 0) {
      queryPrioritizer.recordExecution(query, true, leakCount, 0);
    }
  }

  private async getRepoCreationDate(repoName: string): Promise<Date> {
    try {
      const repoMeta: GitHubRepoMetadata = await githubService.getRepoMetadata(repoName);
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