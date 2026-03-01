/**
 * @liteforge/client — query integration tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient } from '../../src/client.js';
import type { QueryIntegration } from '../../src/integrations/query.js';

interface User {
  id: number;
  name: string;
}

// ============================================================================
// Mock query integration
// ============================================================================

function makeQueryResult<T>(data: T) {
  return {
    data: () => data,
    error: () => undefined,
    isLoading: () => false,
    isStale: () => false,
    isFetched: () => true,
    refetch: vi.fn(),
    dispose: vi.fn(),
  };
}

function makeMutationResult<TData, TVars>() {
  return {
    mutate: vi.fn(),
    isLoading: () => false,
    error: () => undefined,
    data: () => undefined as TData | undefined,
    reset: vi.fn(),
  };
}

function makeQueryIntegration() {
  const createQuery = vi.fn().mockImplementation(() => makeQueryResult(undefined));
  const createMutation = vi.fn().mockImplementation(() => makeMutationResult());
  const integration: QueryIntegration = { createQuery, createMutation };
  return { integration, createQuery, createMutation };
}

// ============================================================================
// Helpers
// ============================================================================

function mockFetch(status: number, body: unknown) {
  const noBodyStatuses = new Set([204, 205, 304]);
  const headers = noBodyStatuses.has(status)
    ? new Headers()
    : new Headers({ 'content-type': 'application/json' });
  const responseBody = noBodyStatuses.has(status) ? null : JSON.stringify(body);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(responseBody, { status, headers }),
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('query integration', () => {
  afterEach(() => vi.restoreAllMocks());

  const BASE = 'https://api.example.com';

  it('useList() returns a QueryResult shape', () => {
    const { integration } = makeQueryIntegration();
    const client = createClient({ baseUrl: BASE, query: integration });
    const res = client.resource<User>('users');

    expect(typeof res.useList).toBe('function');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = res.useList!();
    expect(typeof result.data).toBe('function');
    expect(typeof result.isLoading).toBe('function');
    expect(typeof result.error).toBe('function');
    expect(typeof result.refetch).toBe('function');
  });

  it('useList(params) passes params into the query key', () => {
    const { integration, createQuery } = makeQueryIntegration();
    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client.resource<User>('users').useList!({ page: 3 });

    const options = createQuery.mock.calls[0]?.[0];
    expect(options).toBeDefined();
    const key = options.key() as string[];
    expect(key).toContain('users');
    expect(key.join(',')).toContain('page');
  });

  it('useOne(id) calls createQuery with correct key and fetch fn', () => {
    mockFetch(200, { id: 5, name: 'Alice' });
    const { integration, createQuery } = makeQueryIntegration();
    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client.resource<User>('users').useOne!(5);

    const options = createQuery.mock.calls[0]?.[0];
    expect(options).toBeDefined();
    const key = options.key() as string[];
    expect(key).toContain('users');
    expect(key).toContain('5');
  });

  it('useCreate() calls createMutation with invalidate: [basePath]', () => {
    const { integration, createMutation } = makeQueryIntegration();
    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client.resource<User>('users').useCreate!();

    const options = createMutation.mock.calls[0]?.[0];
    expect(options?.invalidate).toContain(`${BASE}/users`);
  });

  it('useUpdate() calls createMutation and fn calls update correctly', async () => {
    mockFetch(200, { id: 1, name: 'Updated' });
    const { integration, createMutation } = makeQueryIntegration();
    createMutation.mockImplementation((opts: { fn: (vars: unknown) => unknown }) => ({
      mutate: (vars: unknown) => opts.fn(vars),
      isLoading: () => false,
      error: () => undefined,
      data: () => undefined,
      reset: vi.fn(),
    }));

    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mutation = client.resource<User>('users').useUpdate!();
    await mutation.mutate({ id: 1, data: { name: 'Updated' } });

    const lastCall = vi.mocked(fetch).mock.calls[0];
    expect((lastCall?.[0] as string)).toContain('/users/1');
    expect((lastCall?.[1] as RequestInit).method).toBe('PUT');
  });

  it('useDelete() calls createMutation and fn calls delete correctly', async () => {
    mockFetch(204, null);
    const { integration, createMutation } = makeQueryIntegration();
    createMutation.mockImplementation((opts: { fn: (vars: unknown) => unknown }) => ({
      mutate: (vars: unknown) => opts.fn(vars),
      isLoading: () => false,
      error: () => undefined,
      data: () => undefined,
      reset: vi.fn(),
    }));

    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mutation = client.resource<User>('users').useDelete!();
    await mutation.mutate(42);

    const lastCall = vi.mocked(fetch).mock.calls[0];
    expect((lastCall?.[0] as string)).toContain('/users/42');
    expect((lastCall?.[1] as RequestInit).method).toBe('DELETE');
  });

  it('useList and useOne are absent when no query integration provided', () => {
    const client = createClient({ baseUrl: BASE });
    const res = client.resource<User>('users');
    expect((res as { useList?: unknown }).useList).toBeUndefined();
    expect((res as { useOne?: unknown }).useOne).toBeUndefined();
  });

  it('multiple calls to useList with same params produce same key', () => {
    const { integration, createQuery } = makeQueryIntegration();
    const client = createClient({ baseUrl: BASE, query: integration });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client.resource<User>('users').useList!({ page: 1 });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client.resource<User>('users').useList!({ page: 1 });

    const key1 = createQuery.mock.calls[0]?.[0].key();
    const key2 = createQuery.mock.calls[1]?.[0].key();
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });
});
