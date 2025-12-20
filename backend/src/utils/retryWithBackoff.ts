import { logger } from './logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  jitterFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 60000,
  exponentialBase: 2,
  jitter: true,
  jitterFactor: 0.3
};

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  if (config.jitter) {
    const jitterAmount = cappedDelay * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;
    return Math.max(0, cappedDelay + jitter);
  }
  return cappedDelay;
}

function isRetryableError(error: any): boolean {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }
  if (error.response?.status === 429) {
    return true;
  }
  if (error.response?.status === 408) {
    return true;
  }
  if (error.response?.status === 503) {
    return true;
  }
  if (error.response?.status === 502) {
    return true;
  }
  if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
    return true;
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  let attempt = 0;
  while (attempt <= finalConfig.maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (!isRetryableError(error)) {
        throw error;
      }
      if (attempt >= finalConfig.maxRetries) {
        break;
      }
      const delay = calculateDelay(attempt, finalConfig);
      const delaySeconds = (delay / 1000).toFixed(2);
      const contextStr = context ? `[${context}] ` : '';
      logger.warn(
        `${contextStr}Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delaySeconds}s. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      await new Promise(resolve => setTimeout(resolve, Math.round(delay)));
      attempt++;
    }
  }
  const contextStr = context ? `[${context}] ` : '';
  logger.error(
    `${contextStr}All retry attempts exhausted (${finalConfig.maxRetries + 1} total). ` +
    `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
  throw lastError;
}

export function createRetryFunction<T>(
  config: Partial<RetryConfig> = {},
  context?: string
) {
  return (fn: () => Promise<T>) => retryWithBackoff(fn, config, context);
}
