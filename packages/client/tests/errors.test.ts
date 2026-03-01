/**
 * @liteforge/client — ApiError tests
 */

import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '../src/errors.js';
import type { RequestConfig, ResponseContext } from '../src/types.js';

const baseConfig: RequestConfig = { method: 'GET', url: 'https://api.example.com/users' };

function makeRetry(): () => Promise<ResponseContext> {
  return vi.fn().mockResolvedValue({
    data: { retried: true },
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    config: baseConfig,
  });
}

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError({ status: 404, statusText: 'Not Found', data: null, config: baseConfig, retry: makeRetry() });
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of ApiError', () => {
    const err = new ApiError({ status: 404, statusText: 'Not Found', data: null, config: baseConfig, retry: makeRetry() });
    expect(err).toBeInstanceOf(ApiError);
  });

  it('sets message from status and statusText', () => {
    const err = new ApiError({ status: 500, statusText: 'Internal Server Error', data: null, config: baseConfig, retry: makeRetry() });
    expect(err.message).toContain('500');
    expect(err.message).toContain('Internal Server Error');
  });

  it('exposes status and statusText', () => {
    const err = new ApiError({ status: 403, statusText: 'Forbidden', data: null, config: baseConfig, retry: makeRetry() });
    expect(err.status).toBe(403);
    expect(err.statusText).toBe('Forbidden');
  });

  it('exposes parsed response data', () => {
    const data = { code: 'FORBIDDEN', message: 'Access denied' };
    const err = new ApiError({ status: 403, statusText: 'Forbidden', data, config: baseConfig, retry: makeRetry() });
    expect(err.data).toEqual(data);
  });

  it('calls retry() and returns the response context', async () => {
    const retryFn = makeRetry();
    const err = new ApiError({ status: 500, statusText: 'Server Error', data: null, config: baseConfig, retry: retryFn });
    const result = await err.retry();
    expect(retryFn).toHaveBeenCalledOnce();
    expect((result as ResponseContext<{ retried: boolean }>).data).toEqual({ retried: true });
  });
});
