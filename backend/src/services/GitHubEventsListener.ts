import axios from 'axios';
import { logger } from '../utils/logger';
import { rateLimitOptimizer } from './rateLimitOptimizer';
import { regexRouter } from './RegexRouter';
import { isValidKey } from './apiKeyValidator';
import { ConcurrencyManager } from '../utils/concurrencyManager';
import { LRUCache } from '../utils/lruCache';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { dbResilienceManager } from '../utils/dbResilience';
import { ILeak, Leak } from '../models/Leak';
import { FARM_CONSTANTS } from './farmConstants';

const EVENTS_URL = 'https://api.github.com/events';
const POLL_INTERVAL = 60000;
const MAX_QUEUE = 1000;
const CONCURRENCY = 10;
const COMMIT_TIMEOUT = 15000;
const RAW_TIMEOUT = 10000;
const CORE_FLOOR = 500;
const CORE_RESUME = 1000;
const REDACTION = { PREFIX: 6, SUFFIX: 6, TOTAL: 32 };

const DOC_SKIP = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i];
const HIGH_RISK = new Set(FARM_CONSTANTS.PATTERNS.HIGH_RISK_FILES.map(f => f.toLowerCase()));

function redactKey(key: string): string {
  if (key.length <= 12) return key;
  const p = key.substring(0, REDACTION.PREFIX);
  const s = key.substring(key.length - REDACTION.SUFFIX);
  return `${p}${'*'.repeat(Math.max(REDACTION.TOTAL - p.length - s.length, 0))}${s}`;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  payload: { head?: string; before?: string; ref?: string; size?: number };
}

interface CommitFile {
  filename: string;
  status: string;
}

class CoreBudgetGuard {
  private remaining: number | null = null;
  private resetTime = 0;
  private paused = false;

  update(headers: Record<string, any>): void {
    const resource = headers['x-ratelimit-resource'];
    if (resource && resource !== 'core') return;
    const r = headers['x-ratelimit-remaining'];
    if (r === undefined) return;
    this.remaining = parseInt(r, 10);
    if (headers['x-ratelimit-reset']) this.resetTime = parseInt(headers['x-ratelimit-reset'], 10) * 1000;
    if (this.remaining < CORE_FLOOR && !this.paused) {
      this.paused = true;
      logger.events(`Core budget low (${this.remaining}). Pausing workers.`);
    } else if (this.remaining >= CORE_RESUME && this.paused) {
      this.paused = false;
      logger.events(`Core budget recovered (${this.remaining}). Resuming.`);
    }
  }

  async waitIfNeeded(): Promise<void> {
    if (!this.paused) return;
    const tokenAtPause = rateLimitOptimizer.getCurrentTokenIndex();
    const wait = this.resetTime - Date.now();
    if (wait > 0 && wait < 3700000) {
      logger.events(`Sleeping ${Math.ceil(wait / 1000)}s for core reset...`);
      await new Promise(r => setTimeout(r, Math.min(wait + 1000, 30000)));
      if (rateLimitOptimizer.getCurrentTokenIndex() !== tokenAtPause) {
        this.paused = false;
        logger.events('Token rotated during pause — fresh core budget available.');
        return;
      }
    } else {
      await new Promise(r => setTimeout(r, 60000));
    }
    this.paused = false;
  }

  getStatus() { return { remaining: this.remaining, resetTime: this.resetTime, paused: this.paused }; }
}

export class GitHubEventsListener {
  private running = false;
  private etag: string | null = null;
  private pollInterval = POLL_INTERVAL;
  private lastEventId: string | null = null;
  private queue: Array<{ sha: string; repo: string; url: string }> = [];
  private workers = new ConcurrencyManager(CONCURRENCY);
  private cache = new LRUCache<string, boolean>(50000, 3600000);
  private cb = new CircuitBreaker('events-api', { failureThreshold: 5, successThreshold: 2, timeout: 30000, resetTimeout: 120000 });
  private coreGuard = new CoreBudgetGuard();

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.cache.startJanitor(60000);
    logger.events('Starting GitHub Events Listener...');
    this.pollLoop();
    this.drainLoop();
  }

  stop(): void {
    this.running = false;
    this.cache.stopJanitor();
    logger.events('Stopped');
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try { await this.pollOnce(); }
      catch (e) { logger.events(`Poll error: ${e instanceof Error ? e.message : String(e)}`); }
      await new Promise(r => setTimeout(r, this.pollInterval));
    }
  }

  private async pollOnce(): Promise<void> {
    const token = rateLimitOptimizer.getCurrentToken();
    if (!token) return;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'API-Radar-Scanner/1.0',
    };
    if (this.etag) headers['If-None-Match'] = this.etag;

    const res = await this.cb.execute(() => axios.get(EVENTS_URL, {
      headers, params: { per_page: 100 }, timeout: COMMIT_TIMEOUT,
      validateStatus: s => s === 200 || s === 304,
    }));

    this.coreGuard.update(res.headers);
    if (res.headers['x-poll-interval']) this.pollInterval = parseInt(res.headers['x-poll-interval'], 10) * 1000;
    if (res.headers['etag']) this.etag = res.headers['etag'];

    if (res.status === 304) {
      logger.events('Poll: 304 (No changes)');
      return;
    }

    const events: GitHubEvent[] = res.data || [];
    const pushEvents = events.filter(e => e.type === 'PushEvent');

    let enqueued = 0;
    for (const event of pushEvents) {
      if (!event.payload.head) continue;
      if (this.lastEventId && BigInt(event.id) <= BigInt(this.lastEventId)) continue;

      const sha = event.payload.head;
      const ck = `evt:${sha}`;
      if (this.cache.has(ck)) continue;

      this.cache.set(ck, true);
      if (this.queue.length >= MAX_QUEUE) {
        logger.events(`Queue full. Dropping ${sha.substring(0, 8)}`);
        continue;
      }
      const url = `https://api.github.com/repos/${event.repo.name}/commits/${sha}`;
      this.queue.push({ sha, repo: event.repo.name, url });
      enqueued++;
    }

    if (events.length > 0) this.lastEventId = events[0]!.id;
    logger.events(`Poll: ${pushEvents.length} PushEvents, Enqueued: ${enqueued}, Queue: ${this.queue.length}`);
  }

  private async drainLoop(): Promise<void> {
    while (this.running) {
      await this.coreGuard.waitIfNeeded();
      if (this.queue.length === 0) { await new Promise(r => setTimeout(r, 1000)); continue; }
      const batch = this.queue.splice(0, CONCURRENCY);
      await this.workers.executeAll(batch.map(item => () => this.processCommit(item.repo, item.url, item.sha)));
    }
  }

  private async processCommit(repo: string, commitUrl: string, sha: string): Promise<void> {
    try {
      const token = rateLimitOptimizer.getCurrentToken();
      if (!token) return;

      const commitRes = await retryWithBackoff(
        () => axios.get(commitUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
          timeout: COMMIT_TIMEOUT,
        }),
        { maxRetries: 2, baseDelay: 1000, maxDelay: 10000 },
        'EVENTS-COMMIT'
      );

      this.coreGuard.update(commitRes.headers);

      const files: CommitFile[] = commitRes.data?.files || [];
      const targets = files.filter(f => {
        if (f.status === 'removed') return false;
        const name = f.filename.split('/').pop()?.toLowerCase() || '';
        return !DOC_SKIP.some(p => p.test(name)) && HIGH_RISK.has(name);
      });

      if (!targets.length) {
        logger.events(`No high-risk files in ${repo}@${sha.substring(0, 8)} (${files.length} total files)`);
        return;
      }
      logger.events(`Processing ${targets.length} files from ${repo}@${sha.substring(0, 8)}`);

      for (const file of targets) {
        const ck = `ef:${sha}:${file.filename}`;
        if (this.cache.has(ck)) continue;
        this.cache.set(ck, true);

        try {
          const raw = await axios.get(`https://raw.githubusercontent.com/${repo}/${sha}/${file.filename}`, {
            timeout: RAW_TIMEOUT, transformResponse: [d => d], maxContentLength: FARM_CONSTANTS.LIMITS.MAX_FILE_SIZE_BYTES,
          });

          const content = typeof raw.data === 'string' ? raw.data : null;
          if (!content) continue;

          const matches = regexRouter.scan(content);
          if (!matches.length) continue;

          const leaks: Partial<ILeak>[] = [];
          const repoUrl = `https://github.com/${repo}`;

          for (const { key, provider } of matches) {
            if (!isValidKey(key)) continue;
            if (provider === 'github-token') { rateLimitOptimizer.onboardToken(key).catch(() => { }); continue; }
            leaks.push({
              redactedKey: redactKey(key), fullKey: key, provider, repoUrl,
              filePath: file.filename, leakIntroducedAt: new Date(), repoCreatedAt: new Date(),
            });
            logger.leak(provider, `${repo} | ${file.filename} | ${redactKey(key)}`);
          }

          if (leaks.length) await this.upsertLeaks(leaks);
        } catch { /* skip individual file failures */ }
      }
    } catch (e) {
      logger.events(`Commit ${sha.substring(0, 8)} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async upsertLeaks(leaks: Partial<ILeak>[]): Promise<void> {
    await dbResilienceManager.execute(async () => {
      const ops = leaks.map(l => ({
        updateOne: {
          filter: { repoUrl: l.repoUrl, redactedKey: l.redactedKey, provider: l.provider, filePath: l.filePath },
          update: { $setOnInsert: { ...l, leakDetectedAt: new Date() } },
          upsert: true,
        },
      }));
      await Leak.bulkWrite(ops, { ordered: false });
    }, { queue: true, timeout: FARM_CONSTANTS.LIMITS.DB_WRITE }).catch((e: any) => {
      if (e.code === 11000) logger.events(`Duplicate leak: ${e.message}`);
      else logger.events(`DB write failed: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  getStatus() {
    return {
      running: this.running, queueSize: this.queue.length, pollIntervalMs: this.pollInterval,
      cache: this.cache.getStats(), circuit: this.cb.getState(), core: this.coreGuard.getStatus(),
    };
  }
}

export const gitHubEventsListener = new GitHubEventsListener();
