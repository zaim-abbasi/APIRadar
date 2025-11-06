import { logger } from './logger';

/**
 * Query Performance Metrics
 */
interface QueryMetrics {
  query: string;
  successCount: number;
  failureCount: number;
  leakCount: number;
  lastUsed: number;
  averageResponseTime: number;
  totalRequests: number;
}

/**
 * Query Prioritizer
 * 
 * Priority 3: Root Implementation
 * - Tracks query performance (success rate, leak count, response time)
 * - Prioritizes high-value queries (more leaks found)
 * - Adapts to changing patterns
 * - Skips low-value queries when rate limits are low
 */
export class QueryPrioritizer {
  private metrics: Map<string, QueryMetrics> = new Map();
  private readonly minSuccessRate = 0.3; // 30% success rate minimum
  private readonly minLeakRate = 0.01; // 1% leak rate minimum
  private readonly historyWindow = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record query execution result
   */
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

    // Update average response time (exponential moving average)
    if (responseTime > 0) {
      const alpha = 0.3; // Smoothing factor
      metric.averageResponseTime = 
        metric.averageResponseTime === 0
          ? responseTime
          : alpha * responseTime + (1 - alpha) * metric.averageResponseTime;
    }

    // Clean old metrics
    this.cleanOldMetrics();
  }

  /**
   * Prioritize queries based on performance
   */
  prioritizeQueries(queries: string[]): string[] {
    const scoredQueries = queries.map(query => {
      const metric = this.metrics.get(query);
      const score = this.calculateScore(query, metric);
      return { query, score };
    });

    // Sort by score (highest first)
    scoredQueries.sort((a, b) => b.score - a.score);

    return scoredQueries.map(item => item.query);
  }

  /**
   * Calculate priority score for a query
   */
  private calculateScore(_query: string, metric: QueryMetrics | undefined): number {
    if (!metric || metric.totalRequests === 0) {
      // New queries get medium priority
      return 0.5;
    }

    const totalAttempts = metric.successCount + metric.failureCount;
    if (totalAttempts === 0) return 0.5;

    // Success rate (0-1)
    const successRate = metric.successCount / totalAttempts;

    // Leak rate (leaks per successful request)
    const leakRate = metric.successCount > 0 
      ? metric.leakCount / metric.successCount 
      : 0;

    // Recency factor (recently used queries get slight boost)
    const recencyFactor = Math.exp(-(Date.now() - metric.lastUsed) / (7 * 24 * 60 * 60 * 1000)); // 7 days

    // Response time factor (faster queries get slight boost)
    const responseTimeFactor = metric.averageResponseTime > 0
      ? Math.max(0, 1 - (metric.averageResponseTime / 10000)) // Normalize to 10s
      : 1;

    // Combined score
    const score = 
      (successRate * 0.4) +           // 40% weight on success rate
      (Math.min(leakRate, 1) * 0.4) + // 40% weight on leak rate (capped at 1)
      (recencyFactor * 0.1) +         // 10% weight on recency
      (responseTimeFactor * 0.1);     // 10% weight on speed

    return score;
  }

  /**
   * Check if query should be skipped (low value)
   */
  shouldSkipQuery(query: string, rateLimitLow: boolean = false): boolean {
    const metric = this.metrics.get(query);
    
    if (!metric || metric.totalRequests === 0) {
      // Don't skip new queries
      return false;
    }

    const totalAttempts = metric.successCount + metric.failureCount;
    if (totalAttempts === 0) return false;

    const successRate = metric.successCount / totalAttempts;
    const leakRate = metric.successCount > 0 
      ? metric.leakCount / metric.successCount 
      : 0;

    // Skip if both success rate and leak rate are very low
    if (successRate < this.minSuccessRate && leakRate < this.minLeakRate) {
      if (rateLimitLow) {
        // When rate limits are low, be more aggressive about skipping
        logger.warn(`[QUERY-PRIORITIZER] Skipping low-value query: ${query} (success: ${(successRate * 100).toFixed(1)}%, leaks: ${leakRate.toFixed(3)})`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get top performing queries
   */
  getTopQueries(limit: number = 10): Array<{ query: string; score: number; metrics: QueryMetrics }> {
    const scoredQueries = Array.from(this.metrics.entries()).map(([query, metric]) => {
      const score = this.calculateScore(query, metric);
      return { query, score, metrics: metric };
    });

    scoredQueries.sort((a, b) => b.score - a.score);
    return scoredQueries.slice(0, limit);
  }

  /**
   * Get query statistics
   */
  getQueryStats(query: string): QueryMetrics | null {
    return this.metrics.get(query) || null;
  }

  /**
   * Clean old metrics (outside history window)
   */
  private cleanOldMetrics(): void {
    const cutoff = Date.now() - this.historyWindow;
    const keysToDelete: string[] = [];

    for (const [query, metric] of this.metrics.entries()) {
      if (metric.lastUsed < cutoff && metric.totalRequests < 10) {
        // Delete old metrics with low activity
        keysToDelete.push(query);
      }
    }

    keysToDelete.forEach(key => this.metrics.delete(key));
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, QueryMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Reset metrics for a query
   */
  resetQuery(query: string): void {
    this.metrics.delete(query);
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics.clear();
  }
}

// Singleton instance
export const queryPrioritizer = new QueryPrioritizer();

