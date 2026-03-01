/**
 * @liteforge/client — utils tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildUrl, appendQueryParams } from '../src/utils/url.js';
import { mergeHeaders } from '../src/utils/headers.js';
import { retryRequest } from '../src/utils/retry.js';
import { ApiError } from '../src/errors.js';

// ============================================================================
// buildUrl
// ============================================================================

describe('buildUrl', () => {
  it('joins base and path with a single slash', () => {
    expect(buildUrl('https://api.example.com', 'users')).toBe('https://api.example.com/users');
  });

  it('removes trailing slash from base', () => {
    expect(buildUrl('https://api.example.com/', 'users')).toBe('https://api.example.com/users');
  });

  it('removes leading slash from path', () => {
    expect(buildUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users');
  });

  it('removes both trailing and leading slashes', () => {
    expect(buildUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
  });

  it('handles nested paths', () => {
    expect(buildUrl('https://api.example.com', 'users/123/posts')).toBe(
      'https://api.example.com/users/123/posts',
    );
  });

  it('returns base unchanged when path is empty', () => {
    expect(buildUrl('https://api.example.com', '')).toBe('https://api.example.com');
  });
});

// ============================================================================
// appendQueryParams
// ============================================================================

describe('appendQueryParams', () => {
  it('appends params as query string', () => {
    const url = appendQueryParams('https://api.example.com/users', { page: 1, sort: 'name' });
    expect(url).toContain('page=1');
    expect(url).toContain('sort=name');
  });

  it('uses ? separator when no existing query string', () => {
    const url = appendQueryParams('https://api.example.com/users', { page: 1 });
    expect(url).toMatch(/\?page=1/);
  });

  it('uses & separator when query string already present', () => {
    const url = appendQueryParams('https://api.example.com/users?foo=bar', { page: 1 });
    expect(url).toContain('foo=bar');
    expect(url).toContain('page=1');
    expect(url).toContain('&');
  });

  it('skips undefined values', () => {
    const url = appendQueryParams('https://api.example.com/users', {
      page: 1,
      sort: undefined,
    });
    expect(url).not.toContain('sort');
    expect(url).toContain('page=1');
  });

  it('returns url unchanged when params object is empty', () => {
    const url = appendQueryParams('https://api.example.com/users', {});
    expect(url).toBe('https://api.example.com/users');
  });
});

// ============================================================================
// mergeHeaders
// ============================================================================

describe('mergeHeaders', () => {
  it('merges multiple header records', () => {
    const result = mergeHeaders({ Authorization: 'Bearer token' }, { 'Content-Type': 'application/json' });
    expect(result['authorization']).toBe('Bearer token');
    expect(result['content-type']).toBe('application/json');
  });

  it('later sources override earlier ones', () => {
    const result = mergeHeaders(
      { Authorization: 'first' },
      { Authorization: 'second' },
    );
    expect(result['authorization']).toBe('second');
  });

  it('lowercases all keys', () => {
    const result = mergeHeaders({ 'X-Request-ID': '123' });
    expect(result['x-request-id']).toBe('123');
    expect(result['X-Request-ID']).toBeUndefined();
  });

  it('handles undefined sources gracefully', () => {
    const result = mergeHeaders(undefined, { 'Content-Type': 'text/plain' }, undefined);
    expect(result['content-type']).toBe('text/plain');
  });

  it('returns empty object when no sources', () => {
    expect(mergeHeaders()).toEqual({});
  });
});

// ============================================================================
// retryRequest
// ============================================================================

function makeApiError(status: number): ApiError {
  return new ApiError({
    status,
    statusText: 'Error',
    data: null,
    config: { method: 'GET', url: '/test' },
    retry: async () => ({ data: null, status, statusText: 'Error', headers: new Headers(), config: { method: 'GET', url: '/test' } }),
  });
}

describe('retryRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns result immediately when fn succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = retryRequest(fn, 2, 100);
    // No timers needed — immediate success
    await vi.runAllTimersAsync();
    expect(await result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on third attempt after two failures', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(makeApiError(500));
      return Promise.resolve('ok');
    });

    const result = retryRequest(fn, 2, 10);
    await vi.runAllTimersAsync();
    expect(await result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx errors', async () => {
    const fn = vi.fn().mockRejectedValue(makeApiError(401));
    const result = retryRequest(fn, 3, 100);
    await vi.runAllTimersAsync();
    await expect(result).rejects.toThrow(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors', async () => {
    const fn = vi.fn().mockRejectedValue(makeApiError(503));
    const result = retryRequest(fn, 2, 10);
    await vi.runAllTimersAsync();
    await expect(result).rejects.toThrow(ApiError);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
