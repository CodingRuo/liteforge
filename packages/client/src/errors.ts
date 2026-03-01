/**
 * @liteforge/client — ApiError
 *
 * Thrown whenever a fetch response has a non-2xx status code.
 */

import type { RequestConfig, ResponseContext } from './types.js';

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: unknown;
  readonly config: RequestConfig;
  readonly retry: () => Promise<ResponseContext>;

  constructor(opts: {
    status: number;
    statusText: string;
    data: unknown;
    config: RequestConfig;
    retry: () => Promise<ResponseContext>;
  }) {
    super(`Request failed with status ${opts.status} ${opts.statusText}`);
    this.name = 'ApiError';
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.data = opts.data;
    this.config = opts.config;
    this.retry = opts.retry;
  }
}
