/**
 * @liteforge/client — client tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '../src/client.js';
import { ApiError } from '../src/errors.js';

// ============================================================================
// Fetch mock helpers
// ============================================================================

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const responseHeaders = new Headers({ 'content-type': 'application/json', ...headers });
  const response = new Response(JSON.stringify(body), { status, headers: responseHeaders });
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
}

function mockFetchText(status: number, text: string) {
  const response = new Response(text, { status });
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
}

function mockFetchNetworkError() {
  vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

function captureLastCall() {
  const spy = vi.mocked(fetch);
  const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
  if (lastCall === undefined) throw new Error('No fetch calls recorded');
  return { url: lastCall[0] as string, init: lastCall[1] as RequestInit };
}

// ============================================================================
// Tests
// ============================================================================

describe('createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an object with expected methods', () => {
    const client = createClient({ baseUrl: 'https://api.example.com' });
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.patch).toBe('function');
    expect(typeof client.delete).toBe('function');
    expect(typeof client.resource).toBe('function');
    expect(typeof client.addInterceptor).toBe('function');
    expect(typeof client.use).toBe('function');
  });

  it('client.get calls fetch with correct URL and method', async () => {
    mockFetch(200, { id: 1 });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    await client.get('/users');
    const { url, init } = captureLastCall();
    expect(url).toBe('https://api.example.com/users');
    expect(init.method).toBe('GET');
  });

  it('joins baseUrl and path without double slashes', async () => {
    mockFetch(200, {});
    const client = createClient({ baseUrl: 'https://api.example.com/' });
    await client.get('/users');
    const { url } = captureLastCall();
    expect(url).toBe('https://api.example.com/users');
  });

  it('merges default headers into every request', async () => {
    mockFetch(200, {});
    const client = createClient({
      baseUrl: 'https://api.example.com',
      headers: { Authorization: 'Bearer secret' },
    });
    await client.get('/users');
    const { init } = captureLastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer secret');
  });

  it('auto-sets Content-Type: application/json when posting an object', async () => {
    mockFetch(201, { id: 1 });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    await client.post('/users', { name: 'Alice' });
    const { init } = captureLastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
  });

  it('returns parsed JSON response', async () => {
    mockFetch(200, { id: 1, name: 'Alice' });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    const result = await client.get<{ id: number; name: string }>('/users/1');
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('throws ApiError on 4xx response', async () => {
    mockFetch(404, { error: 'Not found' });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    await expect(client.get('/users/999')).rejects.toThrow(ApiError);
  });

  it('ApiError contains status, statusText, and data', async () => {
    mockFetch(422, { message: 'Validation failed' });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    let caught: ApiError | undefined;
    try {
      await client.post('/users', {});
    } catch (err: unknown) {
      if (err instanceof ApiError) caught = err;
    }
    expect(caught?.status).toBe(422);
    expect(caught?.data).toEqual({ message: 'Validation failed' });
  });

  it('throws ApiError on 5xx response', async () => {
    mockFetch(500, { error: 'Internal Server Error' });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    await expect(client.get('/broken')).rejects.toThrow(ApiError);
  });

  it('propagates network errors', async () => {
    mockFetchNetworkError();
    const client = createClient({ baseUrl: 'https://api.example.com' });
    await expect(client.get('/users')).rejects.toThrow(TypeError);
  });

  it('addInterceptor onRequest can inject auth header', async () => {
    mockFetch(200, {});
    const client = createClient({ baseUrl: 'https://api.example.com' });
    client.addInterceptor({
      onRequest: (cfg) => ({
        ...cfg,
        headers: { ...cfg.headers, Authorization: 'Bearer injected' },
      }),
    });
    await client.get('/users');
    const { init } = captureLastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer injected');
  });

  it('addInterceptor onResponse can transform response data', async () => {
    mockFetch(200, [{ id: 1 }, { id: 2 }]);
    const client = createClient({ baseUrl: 'https://api.example.com' });
    client.addInterceptor({
      onResponse: <T>(ctx: { data: T }) => ({ ...ctx, data: 'transformed' as unknown as T }),
    });
    const result = await client.get('/items');
    expect(result).toBe('transformed');
  });

  it('addInterceptor onResponseError intercepts ApiErrors', async () => {
    mockFetch(401, { error: 'Unauthorized' });
    const client = createClient({ baseUrl: 'https://api.example.com' });
    const onResponseError = vi.fn().mockImplementation((err: unknown) => { throw err; });
    client.addInterceptor({ onResponseError });
    await expect(client.get('/protected')).rejects.toThrow(ApiError);
    expect(onResponseError).toHaveBeenCalledOnce();
  });

  it('interceptor remove function stops handler from being called', async () => {
    mockFetch(200, {});
    const client = createClient({ baseUrl: 'https://api.example.com' });
    const onRequest = vi.fn((cfg: unknown) => cfg);
    const remove = client.addInterceptor({ onRequest });
    remove();
    await client.get('/users');
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('middleware pipeline wraps request execution', async () => {
    mockFetch(200, {});
    const client = createClient({ baseUrl: 'https://api.example.com' });
    const log: string[] = [];
    client.use(async (cfg, next) => {
      log.push('before');
      const result = await next(cfg);
      log.push('after');
      return result;
    });
    await client.get('/users');
    expect(log).toEqual(['before', 'after']);
  });

  it('two clients have isolated interceptors', async () => {
    mockFetch(200, {});
    mockFetch(200, {});
    const a = createClient({ baseUrl: 'https://a.example.com' });
    const b = createClient({ baseUrl: 'https://b.example.com' });

    const aInterceptor = vi.fn((cfg: unknown) => cfg);
    a.addInterceptor({ onRequest: aInterceptor });

    await b.get('/test');
    expect(aInterceptor).not.toHaveBeenCalled();
  });
});
