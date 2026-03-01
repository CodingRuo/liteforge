/**
 * Retry utility with exponential backoff for @liteforge/client
 */

import { ApiError } from '../errors.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Only retry on 5xx (server errors) — never on 4xx (client errors)
    return error.status >= 500;
  }
  // Network-level errors (fetch rejected, e.g. DNS failure) are always retryable
  return true;
}

/**
 * Executes `fn`, retrying up to `times` times on retryable errors.
 * Uses exponential backoff: delay = baseDelay * 2^attempt (0-indexed).
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  times: number,
  baseDelay: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      if (!isRetryable(err) || attempt === times) {
        throw err;
      }

      const waitMs = baseDelay * Math.pow(2, attempt);
      await delay(waitMs);
    }
  }

  // This path is unreachable but satisfies TypeScript
  throw lastError;
}
