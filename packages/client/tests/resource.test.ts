/**
 * @liteforge/client — resource tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient } from '../src/client.js';

interface Post {
  id: number;
  title: string;
  body: string;
}

interface CreatePost {
  title: string;
  body: string;
}

// ============================================================================
// Fetch mock helpers
// ============================================================================

function mockFetch(status: number, body: unknown) {
  // 204/205/304 do not allow a body in the Response constructor
  const noBodyStatuses = new Set([204, 205, 304]);
  const headers = noBodyStatuses.has(status)
    ? new Headers()
    : new Headers({ 'content-type': 'application/json' });
  const responseBody = noBodyStatuses.has(status) ? null : JSON.stringify(body);
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(responseBody, { status, headers }),
  );
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

describe('resource', () => {
  afterEach(() => vi.restoreAllMocks());

  const BASE = 'https://api.example.com';

  it('getList() calls GET /<resource>', async () => {
    mockFetch(200, { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').getList();
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts`);
    expect(init.method).toBe('GET');
  });

  it('getList(params) appends query string', async () => {
    mockFetch(200, { data: [], meta: { total: 0, page: 2, pageSize: 10, totalPages: 0 } });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').getList({ page: 2, pageSize: 10 });
    const { url } = captureLastCall();
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=10');
  });

  it('getList() returns ListResponse shape', async () => {
    const payload = { data: [{ id: 1, title: 'Hello', body: 'World' }], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } };
    mockFetch(200, payload);
    const client = createClient({ baseUrl: BASE });
    const result = await client.resource<Post>('posts').getList();
    expect(result).toEqual(payload);
  });

  it('getOne(id) calls GET /<resource>/:id', async () => {
    mockFetch(200, { id: 123, title: 'Test', body: '' });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').getOne(123);
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/123`);
    expect(init.method).toBe('GET');
  });

  it('create(data) calls POST /<resource>', async () => {
    mockFetch(201, { id: 1, title: 'New', body: 'Post' });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post, CreatePost>('posts').create({ title: 'New', body: 'Post' });
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ title: 'New', body: 'Post' });
  });

  it('update(id, data) calls PUT /<resource>/:id', async () => {
    mockFetch(200, { id: 1, title: 'Updated', body: 'Content' });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').update(1, { title: 'Updated', body: 'Content' });
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/1`);
    expect(init.method).toBe('PUT');
  });

  it('patch(id, data) calls PATCH /<resource>/:id', async () => {
    mockFetch(200, { id: 1, title: 'Patched', body: '' });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').patch(1, { title: 'Patched' });
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/1`);
    expect(init.method).toBe('PATCH');
  });

  it('delete(id) calls DELETE /<resource>/:id', async () => {
    mockFetch(204, null);
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').delete(1);
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/1`);
    expect(init.method).toBe('DELETE');
  });

  it('action(action, undefined, id) calls POST /<resource>/:id/<action>', async () => {
    mockFetch(200, { promoted: true });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').action('publish', undefined, 42);
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/42/publish`);
    expect(init.method).toBe('POST');
  });

  it('action(action, data, id) sends body', async () => {
    mockFetch(200, {});
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').action('assign', { role: 'admin' }, 42);
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/42/assign`);
    expect(JSON.parse(init.body as string)).toEqual({ role: 'admin' });
  });

  it('action(action, data) without id calls POST /<resource>/<action>', async () => {
    mockFetch(200, { imported: 5 });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').action('bulk-import', [{ title: 'A' }]);
    const { url, init } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/bulk-import`);
    expect(init.method).toBe('POST');
  });

  it('custom({ path, method }) calls the right URL', async () => {
    mockFetch(200, { count: 42 });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts').custom({ path: 'count', method: 'GET' });
    const { url } = captureLastCall();
    expect(url).toBe(`${BASE}/posts/count`);
  });

  it('ResourceOptions.path overrides resource name', async () => {
    mockFetch(200, { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('u', { path: 'users' }).getList();
    const { url } = captureLastCall();
    expect(url).toBe(`${BASE}/users`);
  });

  it('ResourceOptions.headers are merged into resource requests', async () => {
    mockFetch(200, { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    const client = createClient({ baseUrl: BASE });
    await client.resource<Post>('posts', { headers: { 'x-resource': 'posts' } }).getList();
    const { init } = captureLastCall();
    const headers = init.headers as Record<string, string>;
    expect(headers['x-resource']).toBe('posts');
  });

  it('two resources on same client share interceptors', async () => {
    mockFetch(200, { id: 1, title: 'Post', body: '' });
    mockFetch(200, { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });

    const client = createClient({ baseUrl: BASE });
    const log: string[] = [];
    client.addInterceptor({
      onRequest: (cfg) => {
        log.push(cfg.url);
        return cfg;
      },
    });

    await client.resource<Post>('posts').getOne(1);
    await client.resource<Post>('users').getList();

    expect(log).toHaveLength(2);
    expect(log[0]).toContain('posts');
    expect(log[1]).toContain('users');
  });
});
