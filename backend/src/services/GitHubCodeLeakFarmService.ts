import { logger } from '../utils/logger';
import { githubService } from './github';
import { ILeak } from '../models/Leak';
import { ScannedRepo } from '../models/ScannedRepo';
import { rateLimitOptimizer } from './rateLimitOptimizer';
import axios from 'axios';
import { ConfigurationService } from './ConfigurationService';
import { regexRouter, PROVIDER_QUERIES } from './RegexRouter';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { dbResilienceManager } from '../utils/dbResilience';
import { FatalErrorRecoveryManager } from '../utils/fatalErrorRecovery';
import { ConcurrencyManager } from '../utils/concurrencyManager';
import { LRUCache } from '../utils/lruCache';
import { queryPrioritizer } from '../utils/queryPrioritizer';
import { FARM_CONSTANTS } from './farmConstants';
import { ingestionService, RawLeakFinding } from './IngestionService';



const DOC_PATTERNS = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];

async function waitForRateLimitIfNeeded(): Promise<void> {
  const waitTime = rateLimitOptimizer.getResetWaitTime();
  if (waitTime > 0) {
    logger.warn(`[GITHUB] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    rateLimitOptimizer.rotate();
  }
}

const RESILIENCE = {
  FAILURE_THRESHOLD: 10,
  SUCCESS_THRESHOLD: 2,
  TIMEOUT: 20000,
  RESET_TIMEOUT: 60000,
  MONITORING_PERIOD: 60000
};

const RECOVERY = {
  MAX_ATTEMPTS: 5,
  BACKOFF_BASE: 10000,
  BACKOFF_MAX: 300000
};

const REDACTION = {
  PREFIX_LEN: 6,
  SUFFIX_LEN: 6,
  TOTAL_LEN: 32
};

function getDefaultProviderStates(): { [key: string]: { queryIndex: number; page: number; queryEmptyPages: { [query: string]: number } } } {
  const states: { [key: string]: { queryIndex: number; page: number; queryEmptyPages: { [query: string]: number } } } = {};
  for (const provider of Object.keys(PROVIDER_QUERIES)) {
    states[provider] = { queryIndex: 0, page: 1, queryEmptyPages: {} };
  }
  return states;
}

const MAX_RETRIES = 2;
const MAX_PAGE = FARM_CONSTANTS.SEARCH.MAX_PAGE;

const githubApiCircuitBreaker = new CircuitBreaker('github-api', {
  failureThreshold: RESILIENCE.FAILURE_THRESHOLD,
  successThreshold: RESILIENCE.SUCCESS_THRESHOLD,
  timeout: RESILIENCE.TIMEOUT,
  resetTimeout: RESILIENCE.RESET_TIMEOUT
});
const fatalErrorRecovery = new FatalErrorRecoveryManager({
  maxAttempts: RECOVERY.MAX_ATTEMPTS,
  backoffBase: RECOVERY.BACKOFF_BASE,
  backoffMax: RECOVERY.BACKOFF_MAX,
  errorWindow: FARM_CONSTANTS.LIMITS.FATAL_ERROR_WINDOW,
  maxErrors: FARM_CONSTANTS.LIMITS.MAX_FATAL_ERRORS,
  stability: 300000
});
interface GitHubSearchItem {
  repository: {
    full_name: string;
    html_url: string;
  };
  path: string;
}
function redactKey(key: string): string {
  if (key.length <= 12) return key;
  const prefix = key.substring(0, REDACTION.PREFIX_LEN);
  const suffix = key.substring(key.length - REDACTION.SUFFIX_LEN);
  const stars = key.length - REDACTION.PREFIX_LEN - REDACTION.SUFFIX_LEN;
  return `${prefix}${'*'.repeat(Math.max(stars, 0))}${suffix}`;
}

async function fetchRawFileContent(repoFullName: string, filePath: string, ref: string): Promise<string | null> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${ref}/${filePath}`;
    const response = await axios.get(rawUrl, {
      timeout: FARM_CONSTANTS.LIMITS.REQUEST,
      transformResponse: [data => data]
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch (error) {
    return null;
  }
}

function extractApiKeys(content: string): { key: string, provider: string }[] {
  return regexRouter.scan(content);
}
const scannedCache = new LRUCache<string, boolean>(100000, 345600000);
scannedCache.startJanitor(60000);
const FILE_CONCURRENCY = 20;


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
  providerStates: getDefaultProviderStates()
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
function mergeProviderStates(savedProviderStates: any) {
  const defaultProviderStates = getDefaultProviderStates();
  const mergedProviderStates: { [key: string]: { queryIndex: number; page: number; queryEmptyPages?: { [query: string]: number } } } = { ...defaultProviderStates };

  if (savedProviderStates) {
    for (const [provider, state] of Object.entries(savedProviderStates)) {
      const stateObj = state as { queryIndex?: number; page?: number; queryEmptyPages?: { [query: string]: number } };
      mergedProviderStates[provider] = {
        queryIndex: stateObj.queryIndex ?? 0,
        page: stateObj.page ?? 1,
        queryEmptyPages: stateObj.queryEmptyPages || {}
      };
    }
  }
  return mergedProviderStates;
}

async function loadResumeState(): Promise<ScanResumeState> {
  try {
    const saved = await ConfigurationService.getScanState();

    if (saved && typeof saved.currentQueryIndex === 'number' && typeof saved.currentPage === 'number') {
      scanResumeState = {
        currentProviderIndex: saved.currentProviderIndex || 0,
        currentQueryIndex: saved.currentQueryIndex || 0,
        currentPage: saved.currentPage || 1,
        lastProcessedTime: saved.lastProcessedTime || Date.now(),
        providerStates: mergeProviderStates(saved.providerStates)
      };

      (global as any).scanResumeState = scanResumeState;
      logger.warn(`[FARM] Resuming scan from DB: provider ${scanResumeState.currentProviderIndex}, query ${scanResumeState.currentQueryIndex}, page ${scanResumeState.currentPage}`);
      return scanResumeState;
    }

    if (saved) {
      logger.warn(`[FARM] Invalid state format in database.`);
    }

    if ((global as any).scanResumeState) {
      const globalSaved = (global as any).scanResumeState as any;
      scanResumeState = {
        currentProviderIndex: globalSaved.currentProviderIndex || 0,
        currentQueryIndex: globalSaved.currentQueryIndex || 0,
        currentPage: globalSaved.currentPage || 1,
        lastProcessedTime: globalSaved.lastProcessedTime || Date.now(),
        providerStates: mergeProviderStates(globalSaved.providerStates)
      };
      // logger.warn(`[FARM] Resuming scan from Memory`);
      return scanResumeState;
    }
  } catch (error) {
    logger.warn(`[FARM] Failed to load resume state: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Default fallback
  scanResumeState = {
    currentProviderIndex: 0,
    currentQueryIndex: 0,
    currentPage: 1,
    lastProcessedTime: Date.now(),
    providerStates: getDefaultProviderStates()
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
      providerStates: getDefaultProviderStates()
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
      providerStates: getDefaultProviderStates()
    };
    delete (global as any).scanResumeState;
    logger.warn(`[FARM] Scan state cleared, will start from beginning on next restart`);
  } catch (error) {
    logger.warn(`[FARM] Failed to clear scan state: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function retry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  const waitTime = rateLimitOptimizer.getResetWaitTime();
  if (waitTime > 0) {
    logger.warn(`[GITHUB] All tokens exhausted. Sleeping for ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(r => setTimeout(r, waitTime));
    rateLimitOptimizer.rotate(); // Try to rotate to a fresh token after waking up
  }
  try {
    return await githubApiCircuitBreaker.execute(async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), FARM_CONSTANTS.LIMITS.REQUEST_ABORT);
      });
      return await Promise.race([fn(), timeoutPromise]);
    });
  } catch (err: any) {
    const status = err.response?.status;
    const headers = err.response?.headers;
    if (status === 401 || status === 403) {
      const token = rateLimitOptimizer.getCurrentToken();
      if (token) await rateLimitOptimizer.reportError(token, status, headers);
      if (githubApiCircuitBreaker.failureCount > 0) githubApiCircuitBreaker.reset();
      rateLimitOptimizer.rotate();
      if (status === 403) await handleRateLimitError(err);
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
        exp: 2,
        jitter: true,
        jitterFactor: 0.3
      },
      context || 'RETRY'
    );
  }
}

async function handleRateLimitError(err: any): Promise<void> {
  const { status } = err.response;
  const message = (err.response.data?.message || '').toLowerCase();

  if (status === 429) {
    logger.warn('[GITHUB] 429 Rate Limit Exceeded. Waiting 30s...');
    await new Promise(res => setTimeout(res, 30000));
    rateLimitOptimizer.rotate();
    return;
  }

  if (status === 403) {
    if (message.includes('abuse') || message.includes('secondary')) {
      logger.warn('[GITHUB] Secondary/abuse limit. Waiting 60s...');
      await new Promise(res => setTimeout(res, 60000));
      return;
    }

    // Standard 403 rate limit
    const waitTime = rateLimitOptimizer.getResetWaitTime();
    if (waitTime > 0) {
      logger.warn(`[GITHUB] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(res => setTimeout(res, waitTime));
      rateLimitOptimizer.rotate();
    }
  }
}
async function batchUpsertLeaks(leaks: Partial<ILeak>[]) {
  if (!leaks.length) return;
  await dbResilienceManager.execute(async () => {
    await ingestionService.processLeaks(leaks);
  }, {
    queue: true,
    timeout: FARM_CONSTANTS.LIMITS.DB_WRITE
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

export class GitHubCodeLeakFarmService {
  private running = false;
  constructor() {
    // Removed initializeRateLimitManager call
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
      await rateLimitOptimizer.initialize();
      await rateLimitOptimizer.refreshAllTokenStatuses();
    } catch (error) {
      logger.warn(`[FARM] Failed to initialize tokens on startup: ${error instanceof Error ? error.message : String(error)}`);
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

  private async scanLoop(): Promise<void> {
    fatalErrorRecovery.reset();
    try {
      await this.scanLoopInternal();
    } catch (fatalError) {
      logger.error(`[FARM] FATAL: Unhandled error in scanLoop: ${fatalError instanceof Error ? fatalError.stack : String(fatalError)}`);
      await saveResumeState();
      await fatalErrorRecovery.handleFatalError(
        fatalError instanceof Error ? fatalError : new Error(String(fatalError)),
        async () => {
          logger.warn('[FARM] Attempting to recover from fatal error...');
          await new Promise(resolve => setTimeout(resolve, FARM_CONSTANTS.LIMITS.RECOVERY_WAIT));
          this.scanLoop();
        }
      );
    }
  }

  private async scanLoopInternal(): Promise<void> {
    let lastStatusLog = Date.now();
    let lastConfigCheck = Date.now();
    let lastTokenRefresh = Date.now();
    let lastTokenStateLog = Date.now();
    let lastIdleLog = Date.now();
    let lastWeeklyMaintenance = Date.now();
    const STATUS_LOG_INTERVAL = FARM_CONSTANTS.SCAN.IDLE_LOG_INTERVAL; // Repurposed for status log
    const IDLE_LOG_INTERVAL = FARM_CONSTANTS.SCAN.IDLE_LOG_INTERVAL;
    const CONFIG_CHECK_INTERVAL = FARM_CONSTANTS.SCAN.CONFIG_CHECK_INTERVAL;
    const TOKEN_REFRESH_INTERVAL = FARM_CONSTANTS.SCAN.TOKEN_REFRESH_INTERVAL;
    const TOKEN_STATE_LOG_INTERVAL = FARM_CONSTANTS.SCAN.TOKEN_STATE_LOG_INTERVAL;
    let firstCycle = true;
    let scanCompleted = false;
    while (this.running) {
      if (Date.now() - lastWeeklyMaintenance > 604800000) { // 7 Days
        logger.init('[MAINTENANCE] Resetting Blacklist to discover new leaks in old paths...');
        queryPrioritizer.unblacklistAll();
        lastWeeklyMaintenance = Date.now();
      }
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
          lastIdleLog = Date.now();
        } else if (Date.now() - lastIdleLog > IDLE_LOG_INTERVAL) {
          logger.init('Scan cycle completed. System is idle, waiting for manual restart or configuration changes...');
          lastIdleLog = Date.now();
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
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
            logger.warn('[FARM] Max page reached for all providers. Resetting to page 1 to catch new repos...');
            await clearScanState();
            scanResumeState = await loadResumeState();
            scanCompleted = false;
          } else {
            logger.warn('[FARM] Scan state not complete, continuing scan...');
            scanCompleted = false;
          }
        }
      } catch (error) {
        logger.error('[FARM] Scan cycle error: ' + (error instanceof Error ? error.stack : String(error)));
        await clearScanState();
        scanCompleted = false;
        continue;
      }
      if (!scannedAnything) {
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
    const providerNames = Object.keys(PROVIDER_QUERIES) as Array<keyof typeof PROVIDER_QUERIES>;
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
      const providerNames = Object.keys(PROVIDER_QUERIES) as Array<keyof typeof PROVIDER_QUERIES>;
      const validProviderIndex = Math.max(0, Math.min(resumeState.currentProviderIndex, providerNames.length - 1));
      const currentProvider = providerNames[validProviderIndex];
      if (!currentProvider) {
        logger.error(`[FARM] Invalid provider index: ${resumeState.currentProviderIndex}, resetting to 0`);
        scanResumeState.currentProviderIndex = 0;
        await saveResumeState();
        return false;
      }
      const typedCurrentProvider = currentProvider as keyof typeof PROVIDER_QUERIES;
      let providerQueries = PROVIDER_QUERIES[typedCurrentProvider] || [];
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
      let query: string | undefined;
      try {
        query = providerQueries[queryIndex];
        if (!query) return false;

        if (queryPrioritizer.shouldSkipQuery(query)) {
          logger.warn(`[FARM] Bouncer: Skipping low-yield query "${query}"`);
          queryIndex++;
          if (queryIndex >= providerQueries.length) { queryIndex = 0; page++; }
          scanResumeState.providerStates[typedCurrentProvider] = { queryIndex, page, queryEmptyPages: scanResumeState.providerStates[typedCurrentProvider]?.queryEmptyPages || {} };
          scanResumeState.currentQueryIndex = queryIndex;
          scanResumeState.currentPage = page;
          await saveResumeState();
          return false;
        }
        const startTime = Date.now();
        try {
          logger.warn(`[FARM] Executing query: "${query}" (page ${page})`);
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
          if (query) queryPrioritizer.recordExecution(query, false, 0, responseTime);
          throw error;
        }

        const EMPTY_PAGE_THRESHOLD = 3;
        const updatedProviderState = scanResumeState.providerStates[typedCurrentProvider];
        const emptyPagesCount = (query && updatedProviderState?.queryEmptyPages) ? (updatedProviderState.queryEmptyPages[query] ?? 0) : 0;
        if (query && emptyPagesCount >= EMPTY_PAGE_THRESHOLD) {
          logger.warn(`[FARM] Skipping query "${query}" after ${EMPTY_PAGE_THRESHOLD} consecutive empty pages (current page: ${page})`);
          if (updatedProviderState && updatedProviderState.queryEmptyPages) {
            updatedProviderState.queryEmptyPages[query] = 0;
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
        scanResumeState.currentProviderIndex = (validProviderIndex + 1) % providerNames.length;
        await saveResumeState();
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
      const response = await retry(async () => {
        try {
          return await githubService.searchCode(query, page, FARM_CONSTANTS.SEARCH.PER_PAGE);
        } catch (err: any) {
          if (err.response?.status === 422) {
            return { data: { items: [], total_count: 0 } };
          }
          throw err;
        }
      }, 'SEARCH');
      const items: GitHubSearchItem[] = response.data?.items || [];
      const itemCount = items.length;
      const totalCount = response.data?.total_count || 0;

      if (itemCount === 0) {
        logger.warn(`[FARM] Query returned 0 results (total_count: ${totalCount}) for: "${query}" (page ${page})`);
        return { hadResults: false, itemCount: 0 };
      }

      logger.warn(`[FARM] Query returned ${itemCount} results (total_count: ${totalCount}) for: "${query}" (page ${page})`);
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
    const uniqueRepos = Array.from(new Set(items.map(i => i.repository.full_name)));
    for (const repoName of uniqueRepos) {
      ScannedRepo.updateOne({ fullName: repoName }, { $set: { lastScannedAt: new Date() } }, { upsert: true }).exec().catch(() => { });
    }
    let processedCount = 0;
    let skippedCount = 0;
    const fileConcurrencyManager = new ConcurrencyManager(FILE_CONCURRENCY);
    const results = await fileConcurrencyManager.executeAll(
      items.map(item => () => this.processSingleItem(item, query))
    );
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.processed) processedCount++;
        if (result.value.skipped) skippedCount++;
      }
    });
    queryPrioritizer.recordExecution(query, true, processedCount, 0);
    if (processedCount > 0 || skippedCount > 0) {
      logger.warn(`[FARM] Query "${query}" summary: ${processedCount} files processed, ${skippedCount} files skipped`);
    }
  }

  private async processSingleItem(item: GitHubSearchItem, query: string): Promise<{ processed: boolean; skipped: boolean }> {
    await waitForRateLimitIfNeeded();
    await rateLimitOptimizer.waitWithThrottling();
    if (!this.running) return { processed: false, skipped: false };

    const repoName = item.repository.full_name;
    const filePath = item.path;
    const fileName = filePath.split('/').pop() || '';
    if (DOC_PATTERNS.some(p => p.test(fileName)) || /[#?&]/.test(fileName)) {
      return { processed: false, skipped: true };
    }

    let commitHash = '';
    try {
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      commitHash = await retry(async () => {
        try { return await githubService.getFileLatestCommitHash(repoName, filePath); }
        catch (err: any) { if (err.response?.status === 422) return ''; throw err; }
      }, 'COMMIT-HASH');
    } catch { return { processed: false, skipped: true }; }

    if (!commitHash) return { processed: false, skipped: true };

    const cacheKey = `file:${item.repository.html_url}:${commitHash}`;
    if (scannedCache.has(cacheKey)) {
      logger.warn(`[FARM] SKIP: ${repoName}/${filePath} - Already scanned (${commitHash.substring(0, 8)}...)`);
      return { processed: false, skipped: true };
    }
    scannedCache.set(cacheKey, true);

    await waitForRateLimitIfNeeded();
    await rateLimitOptimizer.waitWithThrottling();
    logger.scan(repoName, filePath);

    let content;
    try {
      await waitForRateLimitIfNeeded();
      await rateLimitOptimizer.waitWithThrottling();
      content = await retry(() => fetchRawFileContent(repoName, filePath, 'HEAD'), 'FILE-CONTENT');
    } catch { return { processed: false, skipped: true }; }

    if (!content) return { processed: false, skipped: true };

    try {
      await this.detectAndSaveLeaks(content, repoName, item.repository.html_url, filePath, query, commitHash);
      return { processed: true, skipped: false };
    } catch (error) {
      logger.error(`[FARM] Failed to process leaks for ${repoName}/${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      return { processed: false, skipped: true };
    }
  }
  private async detectAndSaveLeaks(
    content: string,
    repoName: string,
    repoUrl: string,
    filePath: string,
    query: string,
    _commitHash: string
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
      return;
    }
    for (const { key, provider } of leaks) {
      if (provider === 'github-token') {
        rateLimitOptimizer.onboardToken(key).catch(e =>
          logger.warn(`[TOKEN] Onboard error: ${e instanceof Error ? e.message : String(e)}`)
        );
        continue;
      }
      try {
        await rateLimitOptimizer.waitWithThrottling();
        const leakIntroducedAt = await retry(() => this.getLeakIntroductionDate(repoName, filePath), 'LEAK-DATE');
        const leakData: RawLeakFinding = {
          redactedKey: redactKey(key),
          fullKey: key,
          provider,
          repoUrl,
          filePath,
          leakIntroducedAt,
          repoCreatedAt
        };
        logger.leak(
          provider,
          `${repoName} | ${filePath} | ${redactKey(key)}`
        );
        foundLeaks.push(leakData);
      } catch (error: any) {
        if (error.code === 11000) {
          logger.warn(`[FARM] Duplicate key skipped: ${redactKey(key)}`);
        } else {
          logger.error('[FARM] Failed to save leak: ' + (error instanceof Error ? error.message : String(error)));
        }
      }
    }
    if (foundLeaks.length > 0) {
      await batchUpsertLeaks(foundLeaks);
    }
    if (leakCount > 0) {
      queryPrioritizer.recordExecution(query, true, leakCount, 0);
    }
  }



  private async getRepoCreationDate(repoName: string): Promise<Date> {
    try {
      const createdAt = await githubService.getRepoCreatedAt(repoName);
      return new Date(createdAt);
    } catch (error) {
      logger.error('[FARM] Repo metadata error: ' + (error instanceof Error ? error.message : String(error)));
      return new Date();
    }
  }

  private async getLeakIntroductionDate(repoName: string, filePath: string): Promise<Date> {
    return githubService.getFileLatestCommitDate(repoName, filePath);
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