import { logger } from './logger';

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;           // Base delay in ms
  maxDelay: number;            // Maximum delay in ms
  exponentialBase: number;     // Exponential multiplier (default 2)
  jitter: boolean;             // Add random jitter to prevent thundering herd
  jitterFactor: number;        // Jitter as fraction of delay (0-1)
}

/**
 * Default Retry Configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,             // Start with 1 second
  maxDelay: 60000,             // Max 60 seconds
  exponentialBase: 2,
  jitter: true,
  jitterFactor: 0.3           // ±30% jitter
};

/**
 * Calculate delay with exponential backoff and jitter
 * 
 * Root Implementation:
 * - Exponential backoff: delay = baseDelay * (exponentialBase ^ attempt)
 * - Jitter: random variation to prevent synchronized retries
 * - Capped at maxDelay to prevent excessive waits
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * (2 ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter if enabled
  if (config.jitter) {
    const jitterAmount = cappedDelay * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterAmount; // ±jitterAmount
    return Math.max(0, cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // HTTP 5xx errors are retryable (server errors)
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit) is retryable
  if (error.response?.status === 429) {
    return true;
  }

  // HTTP 408 (timeout) is retryable
  if (error.response?.status === 408) {
    return true;
  }

  // HTTP 503 (service unavailable) is retryable
  if (error.response?.status === 503) {
    return true;
  }

  // HTTP 502 (bad gateway) is retryable
  if (error.response?.status === 502) {
    return true;
  }

  // HTTP 403 with rate limit is retryable (handled separately but still retryable)
  if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
    return true;
  }

  // Non-retryable errors
  // 400, 401, 404, 422, etc. are not retryable
  return false;
}

/**
 * Retry a function with exponential backoff and jitter
 * 
 * Root Implementation:
 * - Exponential backoff prevents overwhelming failing services
 * - Jitter prevents synchronized retries (thundering herd)
 * - Only retries on retryable errors
 * - Logs retry attempts for observability
 */
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

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= finalConfig.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateDelay(attempt, finalConfig);
      const delaySeconds = (delay / 1000).toFixed(2);

      // Log retry attempt
      const contextStr = context ? `[${context}] ` : '';
      logger.warn(
        `${contextStr}Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delaySeconds}s. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.round(delay)));
      attempt++;
    }
  }

  // All retries exhausted
  const contextStr = context ? `[${context}] ` : '';
  logger.error(
    `${contextStr}All retry attempts exhausted (${finalConfig.maxRetries + 1} total). ` +
    `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );

  throw lastError;
}

/**
 * Create a retry function with specific configuration
 */
export function createRetryFunction<T>(
  config: Partial<RetryConfig> = {},
  context?: string
) {
  return (fn: () => Promise<T>) => retryWithBackoff(fn, config, context);
}

