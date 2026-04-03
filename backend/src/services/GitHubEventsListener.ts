import axios from 'axios';
import { logger } from '../utils/logger';
import { rateLimitOptimizer } from './rateLimitOptimizer';
import { regexRouter } from './RegexRouter';
import { isValidKey } from './apiKeyValidator';
import { ConcurrencyManager } from '../utils/concurrencyManager';
import { LRUCache } from '../utils/lruCache';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { dbResilienceManager } from '../utils/dbResilience';
import { ILeak } from '../models/Leak';
import { FARM_CONSTANTS } from './farmConstants';
import { ingestionService } from './IngestionService';

const EVENTS_URL = 'https://api.github.com/events';
const POLL_INTERVAL = 60000;
const MAX_QUEUE = 1000;
const CONCURRENCY = 10;
const COMMIT_TIMEOUT = 15000;
const CORE_FLOOR = 500;
const CORE_RESUME = 1000;
const DIFF_MAX_SIZE = 5 * 1024 * 1024;
const REDACTION = { PREFIX: 6, SUFFIX: 6, TOTAL: 32 };
const SCANNABLE_EXT = new Set([
  'env', 'json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'cfg', 'conf', 'properties', 'tfvars',
  'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'java', 'php', 'rs', 'cs', 'kt', 'scala',
  'swift', 'sh', 'bash', 'zsh', 'tf', 'hcl',
]);

function redactKey(key: string): string {
  if (key.length <= 12) return key;
  const p = key.substring(0, REDACTION.PREFIX);
  const s = key.substring(key.length - REDACTION.SUFFIX);
  return `${p}${'*'.repeat(Math.max(REDACTION.TOTAL - p.length - s.length, 0))}${s}`;
}

function parseDiffSections(diff: string): Array<{ filePath: string; content: string }> {
  const sections: Array<{ filePath: string; content: string }> = [];
  const parts = diff.split(/^diff --git /m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const headerMatch = part.match(/^a\/(.+?) b\//);
    if (!headerMatch) continue;
    sections.push({ filePath: headerMatch[1]!, content: part });
  }
  return sections;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  payload: { head?: string; before?: string; ref?: string; size?: number };
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

      const diffRes = await axios.get(commitUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3.diff' },
        timeout: COMMIT_TIMEOUT,
        transformResponse: [d => d],
        maxContentLength: DIFF_MAX_SIZE,
        maxBodyLength: DIFF_MAX_SIZE,
        validateStatus: s => s === 200 || s === 404 || s === 422,
      });

      this.coreGuard.update(diffRes.headers);
      if (diffRes.status !== 200) return;

      const diff = typeof diffRes.data === 'string' ? diffRes.data : null;
      if (!diff || diff.length === 0) return;

      const sections = parseDiffSections(diff);
      if (!sections.length) return;

      const leaks: Partial<ILeak>[] = [];
      const repoUrl = `https://github.com/${repo}`;

      for (const section of sections) {
        const ext = section.filePath.split('.').pop()?.toLowerCase() ?? '';
        if (!SCANNABLE_EXT.has(ext)) continue;
        const matches = regexRouter.scan(section.content);
        if (!matches.length) continue;

        for (const { key, provider } of matches) {
          if (!isValidKey(key)) continue;
          if (provider === 'github-token') { rateLimitOptimizer.onboardToken(key).catch(() => { }); continue; }
          leaks.push({
            redactedKey: redactKey(key), fullKey: key, provider, repoUrl,
            filePath: section.filePath, leakIntroducedAt: new Date(), repoCreatedAt: new Date(),
          });
          logger.leak(provider, `${repo} | ${section.filePath} | ${redactKey(key)}`);
        }
      }

      if (leaks.length) {
        logger.events(`Found ${leaks.length} leak(s) in ${repo}@${sha.substring(0, 8)}`);
        await this.upsertLeaks(leaks);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_BAD_RESPONSE' || e?.message?.includes('maxContentLength')) return;
      logger.events(`Commit ${sha.substring(0, 8)} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async upsertLeaks(leaks: Partial<ILeak>[]): Promise<void> {
    await dbResilienceManager.execute(async () => {
      await ingestionService.processLeaks(leaks);
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
