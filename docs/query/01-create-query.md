---
title: "createQuery"
category: "query"
tags: ["query", "createQuery", "createMutation", "cache", "fetch", "refetch", "invalidate"]
related: ["defineStore", "createForm", "Context"]
---

# createQuery

> Signals-based data fetching with caching, retries, and automatic refetching.

## Installation

```bash
npm install @liteforge/query
```

## Quick Start

```ts
import { createQuery, createMutation } from '@liteforge/query'

// Basic query
const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json()),
})

users.data()       // Signal<User[] | undefined>
users.isLoading()  // Signal<boolean>
users.error()      // Signal<Error | null>
users.refetch()    // Manual refetch

// Mutation
const addUser = createMutation({
  fn: (data: NewUser) => fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  invalidate: ['users'],
})

await addUser.mutate({ name: 'Alice' })
```

## API Reference

### `createQuery<T>(options)` → `QueryResult<T>`

**Options (`CreateQueryOptions<T>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string \| (() => QueryKey)` | required | Cache key. Reactive when a function. |
| `fn` | `() => Promise<T>` | required | Fetcher function |
| `staleTime` | `number` | `0` | ms before data is considered stale |
| `cacheTime` | `number` | `300000` (5m) | ms to keep inactive cache entry |
| `refetchOnFocus` | `boolean` | `true` | Refetch when window regains focus |
| `refetchInterval` | `number` | — | Poll interval in ms |
| `retry` | `number` | `3` | Retry count on failure |
| `retryDelay` | `number` | `1000` | ms between retries |
| `enabled` | `() => boolean` | `() => true` | Disable query when false |

**Returns (`QueryResult<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `data` | `Signal<T \| undefined>` | Fetched data |
| `error` | `Signal<Error \| null>` | Last error |
| `isLoading` | `Signal<boolean>` | True while fetching |
| `isFetched` | `Signal<boolean>` | True after first successful fetch |
| `isStale()` | `() => boolean` | Whether data is stale (non-reactive) |
| `refetch()` | `() => Promise<void>` | Manually re-run the query |
| `dispose()` | `() => void` | Stop the query and clean up |

---

### `createMutation<TData, TArgs>(options)` → `MutationResult<TData, TArgs>`

**Options (`CreateMutationOptions<TData, TArgs>`):**

| Option | Type | Description |
|--------|------|-------------|
| `fn` | `(args: TArgs) => Promise<TData>` | Mutation function |
| `invalidate` | `string[]` | Query keys to invalidate after success |
| `onSuccess` | `(data: TData, args: TArgs) => void` | Success callback |
| `onError` | `(error: Error, args: TArgs) => void` | Error callback |
| `onSettled` | `(data, error, args) => void` | Always runs after mutation |

**Returns (`MutationResult<TData, TArgs>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `mutate(args)` | `(args: TArgs) => Promise<TData>` | Execute the mutation |
| `isLoading` | `Signal<boolean>` | True while pending |
| `error` | `Signal<Error \| null>` | Last error |
| `data` | `Signal<TData \| undefined>` | Last result |

---

### `queryCache`

Global cache object.

| Method | Description |
|--------|-------------|
| `queryCache.invalidate(key)` | Invalidate a cache entry and trigger refetch |
| `queryCache.set(key, data)` | Manually set cache data |
| `queryCache.getEntry(key)` | Read a cache entry |
| `queryCache.clear()` | Clear all cache entries |

## Examples

### Reactive key (depends on signal)

```ts
const userId = signal(1)

const user = createQuery({
  key: () => ['user', userId()],
  fn: () => fetch(`/api/users/${userId()}`).then(r => r.json()),
  staleTime: 60_000,
})

userId.set(2)  // automatically refetches for new user
```

### Conditional query

```ts
const isLoggedIn = signal(false)

const profile = createQuery({
  key: 'profile',
  fn: () => fetch('/api/me').then(r => r.json()),
  enabled: () => isLoggedIn(),
})
```

## Notes

- `createQuery` auto-disposes when called inside `setup()` via `onSetupCleanup`.
- Queries are deduplicated by key — multiple components can share the same cache entry.
- When `refetchOnFocus` is true, a stale query revalidates silently in the background (no loading flash when data already exists).
- `queryPlugin` is available for registering the query API in app context via `use('query')`.
