import { logger } from './logger';

interface QueryMetrics {
  query: string;
  successCount: number;
  failureCount: number;
  leakCount: number;
  lastUsed: number;
  averageResponseTime: number;
  totalRequests: number;
}

export class QueryPrioritizer {
  private metrics: Map<string, QueryMetrics> = new Map();
  private readonly minSuccessRate = 0.3;
  private readonly minLeakRate = 0.01;
  private readonly historyWindow = 24 * 60 * 60 * 1000;

  recordExecution(
    query: string,
    success: boolean,
    leakCount: number = 0,
    responseTime: number = 0
  ): void {
    let metric = this.metrics.get(query);
    if (!metric) {
      metric = {
        query,
        successCount: 0,
        failureCount: 0,
        leakCount: 0,
        lastUsed: Date.now(),
        averageResponseTime: 0,
        totalRequests: 0
      };
      this.metrics.set(query, metric);
    }
    if (success) {
      metric.successCount++;
    } else {
      metric.failureCount++;
    }
    metric.leakCount += leakCount;
    metric.lastUsed = Date.now();
    metric.totalRequests++;
    if (responseTime > 0) {
      const alpha = 0.3;
      metric.averageResponseTime = 
        metric.averageResponseTime === 0
          ? responseTime
          : alpha * responseTime + (1 - alpha) * metric.averageResponseTime;
    }
    this.cleanOldMetrics();
  }

  prioritizeQueries(queries: string[]): string[] {
    const scoredQueries = queries.map(query => {
      const metric = this.metrics.get(query);
      const score = this.calculateScore(query, metric);
      return { query, score };
    });
    scoredQueries.sort((a, b) => b.score - a.score);
    return scoredQueries.map(item => item.query);
  }

  private calculateScore(_query: string, metric: QueryMetrics | undefined): number {
    if (!metric || metric.totalRequests === 0) {
      return 0.5;
    }
    const totalAttempts = metric.successCount + metric.failureCount;
    if (totalAttempts === 0) return 0.5;
    const successRate = metric.successCount / totalAttempts;
    const leakRate = metric.successCount > 0 
      ? metric.leakCount / metric.successCount 
      : 0;
    const recencyFactor = Math.exp(-(Date.now() - metric.lastUsed) / (7 * 24 * 60 * 60 * 1000));
    const responseTimeFactor = metric.averageResponseTime > 0
      ? Math.max(0, 1 - (metric.averageResponseTime / 10000))
      : 1;
    const score = 
      (successRate * 0.4) +
      (Math.min(leakRate, 1) * 0.4) +
      (recencyFactor * 0.1) +
      (responseTimeFactor * 0.1);
    return score;
  }

  shouldSkipQuery(query: string, rateLimitLow: boolean = false): boolean {
    const metric = this.metrics.get(query);
    if (!metric || metric.totalRequests === 0) {
      return false;
    }
    const totalAttempts = metric.successCount + metric.failureCount;
    if (totalAttempts === 0) return false;
    const successRate = metric.successCount / totalAttempts;
    const leakRate = metric.successCount > 0 
      ? metric.leakCount / metric.successCount 
      : 0;
    if (successRate < this.minSuccessRate && leakRate < this.minLeakRate) {
      if (rateLimitLow) {
        logger.warn(`[QUERY-PRIORITIZER] Skipping low-value query: ${query} (success: ${(successRate * 100).toFixed(1)}%, leaks: ${leakRate.toFixed(3)})`);
        return true;
      }
    }
    return false;
  }

  getTopQueries(limit: number = 10): Array<{ query: string; score: number; metrics: QueryMetrics }> {
    const scoredQueries = Array.from(this.metrics.entries()).map(([query, metric]) => {
      const score = this.calculateScore(query, metric);
      return { query, score, metrics: metric };
    });
    scoredQueries.sort((a, b) => b.score - a.score);
    return scoredQueries.slice(0, limit);
  }

  getQueryStats(query: string): QueryMetrics | null {
    return this.metrics.get(query) || null;
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - this.historyWindow;
    const keysToDelete: string[] = [];
    for (const [query, metric] of this.metrics.entries()) {
      if (metric.lastUsed < cutoff && metric.totalRequests < 10) {
        keysToDelete.push(query);
      }
    }
    keysToDelete.forEach(key => this.metrics.delete(key));
  }

  getAllMetrics(): Map<string, QueryMetrics> {
    return new Map(this.metrics);
  }

  resetQuery(query: string): void {
    this.metrics.delete(query);
  }

  resetAll(): void {
    this.metrics.clear();
  }
}

export const queryPrioritizer = new QueryPrioritizer();
