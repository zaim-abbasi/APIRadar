import { logger } from './logger';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'query_metrics.json');
type QMetrics = { query: string; successCount: number; failureCount: number; leakCount: number; lastUsed: number; averageResponseTime: number; totalRequests: number; isBlacklisted?: boolean; };

export class QueryPrioritizer {
  private m = new Map<string, QMetrics>();
  private dirty = false;

  constructor() {
    try { if (fs.existsSync(FILE)) this.m = new Map(Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf-8')))); } catch (e) { logger.warn(`[QUERY] Load fail: ${e}`); }
    setInterval(() => { if (this.dirty) { this.save(); logger.warn(`[QUERY] Saved ${this.m.size} metrics`); } }, 30000).unref();
    setInterval(() => this.clean(), 3600000).unref();
    ['exit', 'SIGINT', 'SIGTERM'].forEach(e => process.on(e, () => { if (this.dirty) this.save(); if (e !== 'exit') process.exit(0); }));
  }

  recordExecution(q: string, ok: boolean, leaks = 0, rt = 0) {
    let d = this.m.get(q);
    if (!d) { d = { query: q, successCount: 0, failureCount: 0, leakCount: 0, lastUsed: Date.now(), averageResponseTime: 0, totalRequests: 0, isBlacklisted: false }; this.m.set(q, d); }
    ok ? d.successCount++ : d.failureCount++;
    d.leakCount += leaks; d.lastUsed = Date.now(); d.totalRequests++;
    if (rt > 0) d.averageResponseTime = d.averageResponseTime === 0 ? rt : 0.3 * rt + 0.7 * d.averageResponseTime;
    this.dirty = true;
  }

  shouldSkipQuery(q: string, low = false): boolean {
    const d = this.m.get(q);
    if (!d || !d.totalRequests) return false;
    if (d.isBlacklisted) return true;
    if (d.totalRequests > 500 && d.leakCount === 0) { d.isBlacklisted = true; this.dirty = true; logger.warn(`[BLACKLIST] Auto-blacklisted: ${q}`); return true; }
    const s = this.score(d);
    if (s < 0.15 && d.totalRequests >= 20) { logger.warn(`[BOUNCER] Trash: ${q} (s=${s.toFixed(2)})`); return true; }
    const sr = d.successCount / (d.successCount + d.failureCount);
    const lr = d.successCount > 0 ? d.leakCount / d.successCount : 0;
    if (sr < 0.3 && lr < 0.01 && low) { logger.warn(`[BOUNCER] Low value: ${q}`); return true; }
    return false;
  }

  logStatsReport() {
    const all = [...this.m.values()];
    const w = all.filter(x => x.leakCount > 0).sort((a, b) => b.leakCount - a.leakCount).slice(0, 5);
    const l = all.filter(x => !x.leakCount && x.totalRequests > 0 && !x.isBlacklisted).sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 5);
    logger.init('[REPORT] === TOP 5 WINNERS ==='); w.forEach((x, i) => logger.init(`  ${i + 1}. ${x.query} | Leaks: ${x.leakCount}`));
    logger.error('[REPORT] === TOP 5 WASTERS ==='); l.forEach((x, i) => logger.error(`  ${i + 1}. ${x.query} | Wasted: ${x.totalRequests}`));
    logger.warn(`[REPORT] 🚫 BLACKLISTED: ${all.filter(x => x.isBlacklisted).length}`);
  }

  getTopQueries(limit = 10) { return [...this.m.entries()].map(([q, d]) => ({ query: q, score: this.score(d), metrics: d })).sort((a, b) => b.score - a.score).slice(0, limit); }
  prioritizeQueries(queries: string[]) { return queries.sort((a, b) => this.score(this.m.get(b)) - this.score(this.m.get(a))); }
  getQueryStats(q: string) { return this.m.get(q) || null; }
  unblacklistAll() { let c = 0; for (const v of this.m.values()) if (v.isBlacklisted) { v.isBlacklisted = false; c++; } this.dirty = true; this.save(); logger.warn(`[BLACKLIST] Freed ${c} queries`); }
  resetProvider(qs: string[]) { qs.forEach(q => this.m.delete(q)); this.save(); logger.warn(`[QUERY] Reset ${qs.length}`); }
  resetQuery(q: string) { this.m.delete(q); this.dirty = true; }
  resetAll() { this.m.clear(); this.dirty = true; }
  getAllMetrics() { return new Map(this.m); }

  private save() { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(this.m), null, 2)); this.dirty = false; }
  private clean() {
    const c = Date.now() - 86400000; let n = 0;
    for (const [k, v] of this.m) if (v.lastUsed < c && v.totalRequests < 10) { this.m.delete(k); n++; }
    if (n) { this.dirty = true; logger.warn(`[QUERY] Cleaned ${n}`); }
  }
  private score(d: QMetrics | undefined): number {
    if (!d || !d.totalRequests) return 0.8;
    const t = d.successCount + d.failureCount;
    if (!t) return 0.8;
    const sr = d.successCount / t;
    const lr = d.successCount > 0 ? Math.min(d.leakCount / d.successCount, 1) : 0;
    const rec = Math.exp(-(Date.now() - d.lastUsed) / 604800000);
    const spd = d.averageResponseTime > 0 ? Math.max(0, 1 - d.averageResponseTime / 10000) : 1;
    return lr * 0.5 + sr * 0.2 + spd * 0.2 + rec * 0.1;
  }
}
export const queryPrioritizer = new QueryPrioritizer();
