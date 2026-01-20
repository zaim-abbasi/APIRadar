import { logger } from './logger';
import fs from 'fs';
import path from 'path';

interface QueryMetrics {
  query: string;
  successCount: number;
  failureCount: number;
  leakCount: number;
  lastUsed: number;
  averageResponseTime: number;
  totalRequests: number;
  isBlacklisted?: boolean;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'query_metrics.json');
const AUTOSAVE_INTERVAL = 30000;
const CLEANUP_INTERVAL = 3600000;

export class QueryPrioritizer {
  private metrics = new Map<string, QueryMetrics>();
  private readonly historyWindow = 86400000;
  private saveTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor() {
    this.load();
    this.saveTimer = setInterval(() => this.autoSave(), AUTOSAVE_INTERVAL);
    this.saveTimer.unref();
    this.cleanupTimer = setInterval(() => this.cleanOld(), CLEANUP_INTERVAL);
    this.cleanupTimer.unref();
    process.on('exit', () => this.saveSync());
    process.on('SIGINT', () => { this.saveSync(); process.exit(0); });
    process.on('SIGTERM', () => { this.saveSync(); process.exit(0); });
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        this.metrics = new Map(Object.entries(data));
        logger.init(`[QUERY] Loaded ${this.metrics.size} query metrics from disk`);
      }
    } catch (e) {
      logger.warn(`[QUERY] Failed to load metrics: ${e instanceof Error ? e.message : e}`);
    }
  }

  private save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(this.metrics), null, 2));
      this.dirty = false;
    } catch (e) {
      logger.warn(`[QUERY] Failed to save metrics: ${e instanceof Error ? e.message : e}`);
    }
  }

  private saveSync() {
    if (this.dirty) this.save();
  }

  private autoSave() {
    if (this.dirty) {
      this.save();
      logger.warn(`[QUERY] Auto-saved ${this.metrics.size} query metrics`);
    }
  }

  recordExecution(query: string, success: boolean, leakCount = 0, responseTime = 0) {
    let m = this.metrics.get(query);
    if (!m) {
      m = { query, successCount: 0, failureCount: 0, leakCount: 0, lastUsed: Date.now(), averageResponseTime: 0, totalRequests: 0, isBlacklisted: false };
      this.metrics.set(query, m);
    }
    success ? m.successCount++ : m.failureCount++;
    m.leakCount += leakCount;
    m.lastUsed = Date.now();
    m.totalRequests++;
    if (responseTime > 0) m.averageResponseTime = m.averageResponseTime === 0 ? responseTime : 0.3 * responseTime + 0.7 * m.averageResponseTime;
    this.dirty = true;
  }

  prioritizeQueries(queries: string[]): string[] {
    return queries.map(q => ({ q, s: this.score(this.metrics.get(q)) })).sort((a, b) => b.s - a.s).map(x => x.q);
  }

  private score(m: QueryMetrics | undefined): number {
    if (!m || m.totalRequests === 0) return 0.8;
    const total = m.successCount + m.failureCount;
    if (total === 0) return 0.8;
    const sr = m.successCount / total;
    const lr = m.successCount > 0 ? Math.min(m.leakCount / m.successCount, 1) : 0;
    const recency = Math.exp(-(Date.now() - m.lastUsed) / 604800000);
    const speed = m.averageResponseTime > 0 ? Math.max(0, 1 - m.averageResponseTime / 10000) : 1;
    return lr * 0.5 + sr * 0.2 + speed * 0.2 + recency * 0.1;
  }

  shouldSkipQuery(query: string, rateLimitLow = false): boolean {
    const m = this.metrics.get(query);
    if (!m || m.totalRequests === 0) return false;
    if (m.isBlacklisted) {
      return true;
    }
    if (m.totalRequests > 500 && m.leakCount === 0) {
      m.isBlacklisted = true;
      this.dirty = true;
      logger.warn(`[BLACKLIST] Auto-blacklisted: ${query} (500+ tries, 0 leaks)`);
      return true;
    }
    const s = this.score(m);
    if (s < 0.15 && m.totalRequests >= 20) {
      logger.warn(`[BOUNCER] Confirmed trash: ${query} (score: ${s.toFixed(2)}, tries: ${m.totalRequests})`);
      return true;
    }
    const total = m.successCount + m.failureCount;
    if (total === 0) return false;
    const sr = m.successCount / total;
    const lr = m.successCount > 0 ? m.leakCount / m.successCount : 0;
    if (sr < 0.3 && lr < 0.01 && rateLimitLow) {
      logger.warn(`[BOUNCER] Low-value (rate limit mode): ${query}`);
      return true;
    }
    return false;
  }

  unblacklistAll() {
    let count = 0;
    for (const m of this.metrics.values()) {
      if (m.isBlacklisted) { m.isBlacklisted = false; count++; }
    }
    this.dirty = true;
    this.save();
    logger.warn(`[BLACKLIST] Unblacklisted ${count} queries for fresh exploration`);
  }

  logStatsReport() {
    const all = [...this.metrics.values()];
    const blacklisted = all.filter(m => m.isBlacklisted).length;
    const winners = all.filter(m => m.leakCount > 0).sort((a, b) => b.leakCount - a.leakCount).slice(0, 5);
    const losers = all.filter(m => m.leakCount === 0 && m.totalRequests > 0 && !m.isBlacklisted).sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 5);
    logger.init('[QUERY REPORT] ===== TOP 5 WINNERS =====');
    winners.forEach((m, i) => logger.init(`  ${i + 1}. ${m.query} | Leaks: ${m.leakCount} | Requests: ${m.totalRequests}`));
    logger.error('[QUERY REPORT] ===== TOP 5 TIME WASTERS =====');
    losers.forEach((m, i) => logger.error(`  ${i + 1}. ${m.query} | Leaks: 0 | Wasted Requests: ${m.totalRequests}`));
    logger.warn(`[QUERY REPORT] 🚫 BLACKLISTED QUERIES: ${blacklisted}`);
  }

  getTopQueries(limit = 10) {
    return [...this.metrics.entries()].map(([q, m]) => ({ query: q, score: this.score(m), metrics: m })).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  getQueryStats(query: string) { return this.metrics.get(query) || null; }

  private cleanOld() {
    const cutoff = Date.now() - this.historyWindow;
    let cleaned = 0;
    for (const [k, m] of this.metrics) {
      if (m.lastUsed < cutoff && m.totalRequests < 10) {
        this.metrics.delete(k);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.dirty = true;
      logger.warn(`[QUERY] Cleaned ${cleaned} stale metrics`);
    }
  }

  resetProvider(queries: string[]) {
    for (const q of queries) this.metrics.delete(q);
    this.save();
    logger.warn(`[QUERY] Reset ${queries.length} queries for fresh exploration`);
  }

  getAllMetrics() { return new Map(this.metrics); }
  resetQuery(query: string) { this.metrics.delete(query); this.dirty = true; }
  resetAll() { this.metrics.clear(); this.dirty = true; }
}

export const queryPrioritizer = new QueryPrioritizer();
