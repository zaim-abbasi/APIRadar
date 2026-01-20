import { logger } from './logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  jitterFactor: number;
}

const DEFAULT = { maxRetries: 5, baseDelay: 1000, maxDelay: 120000, exponentialBase: 2, jitter: true, jitterFactor: 0.3 };

function getDelay(i: number, c: RetryConfig, e: any) {
  const h = e.response?.headers;
  if (h && h['retry-after']) {
    const s = parseInt(h['retry-after'], 10);
    if (!isNaN(s)) return (s * 1000) + (Math.random() * 500);
  }
  const d = Math.min(c.baseDelay * Math.pow(c.exponentialBase, i), c.maxDelay);
  return c.jitter ? Math.max(0, d + (Math.random() * 2 - 1) * d * c.jitterFactor) : d;
}

function isRetryable(e: any) {
  const c = e.code, s = e.response?.status, h = e.response?.headers;
  if (h && h['retry-after']) return true;
  if (s === 403) {
    const msg = (e.response?.data?.message || '').toLowerCase();
    if (msg.includes('secondary rate limit') || msg.includes('abuse detection')) return true;
    if (h && h['x-ratelimit-remaining'] === '0') return true;
  }
  return ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND'].includes(c) || (s >= 500 && s < 600) || [429, 408].includes(s);
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, config: Partial<RetryConfig> = {}, ctx = ''): Promise<T> {
  const c = { ...DEFAULT, ...config };
  for (let i = 0; i <= c.maxRetries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (!isRetryable(e) || i >= c.maxRetries) {
        logger.error(`${ctx ? `[${ctx}] ` : ''}Exhausted retries (${c.maxRetries}). Last: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
      const d = getDelay(i, c, e);
      logger.warn(`${ctx ? `[${ctx}] ` : ''}Retry ${i + 1}/${c.maxRetries} after ${(d / 1000).toFixed(2)}s. Error: ${e instanceof Error ? e.message : String(e)}`);
      await new Promise(r => setTimeout(r, Math.round(d)));
    }
  }
  throw new Error('Unreachable');
}

export const createRetryFunction = <T>(c: Partial<RetryConfig> = {}, ctx?: string) => (fn: () => Promise<T>) => retryWithBackoff(fn, c, ctx);
