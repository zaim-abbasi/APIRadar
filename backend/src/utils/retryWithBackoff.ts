import { logger } from './logger';

const DEFAULTS = { maxRetries: 5, baseDelay: 1000, maxDelay: 120000, exp: 2, jitter: true, jitterFactor: 0.3 };

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: Partial<typeof DEFAULTS> = {}, ctx = ''): Promise<T> {
  const c = { ...DEFAULTS, ...opts };
  for (let i = 0; i <= c.maxRetries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (i >= c.maxRetries || !isRetryable(e)) {
        logger.error(`${ctx ? `[${ctx}] ` : ''}Fail: ${e.message || e}`); throw e;
      }
      const delay = getDelay(i, c, e);
      logger.warn(`${ctx ? `[${ctx}] ` : ''}Retry ${i + 1}/${c.maxRetries} in ${(delay / 1000).toFixed(2)}s: ${e.message || e}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

function isRetryable(e: any) {
  const s = e.response?.status, h = e.response?.headers;
  if (h?.['retry-after'] || (s === 403 && (h?.['x-ratelimit-remaining'] === '0' || /secondary|abuse/i.test(e.response?.data?.message || '')))) return true;
  return /ECONN|ETIME|ENOTFOUND/.test(e.code) || (s >= 500 && s < 600) || s === 429 || s === 408;
}

function getDelay(i: number, c: typeof DEFAULTS, e: any) {
  const ra = parseInt(e.response?.headers?.['retry-after'], 10);
  if (!isNaN(ra)) return (ra * 1000) + (Math.random() * 500);
  const d = Math.min(c.baseDelay * Math.pow(c.exp, i), c.maxDelay);
  return c.jitter ? Math.max(0, d + (Math.random() * 2 - 1) * d * c.jitterFactor) : d;
}

