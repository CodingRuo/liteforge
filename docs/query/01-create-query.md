---
title: "createQuery"
category: "query"
tags: ["query", "createQuery", "createMutation", "cache", "fetch", "refetch", "invalidate", "onError", "global error handler"]
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
| `key` | `string \| QueryKeyPrimitive[] \| (() => QueryKey)` | required | Cache key. Reactive when a function. Array form is serialized automatically. |
| `fn` | `() => Promise<T>` | required | Fetcher function |
| `staleTime` | `number` | `0` | ms before data is considered stale |
| `cacheTime` | `number` | `300000` (5m) | ms to keep inactive cache entry |
| `refetchOnFocus` | `boolean` | `true` | Refetch when window regains focus |
| `refetchInterval` | `number` | — | Poll interval in ms |
| `retry` | `number` | `3` | Retry count on failure |
| `retryDelay` | `number` | `1000` | ms between retries |
| `enabled` | `() => boolean` | `() => true` | Disable query when false |
| `onSuccess` | `(data: T) => void` | — | Called after every successful fetch |
| `onError` | `(error: Error) => void` | — | Called after all retries fail |

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

---

### `queryPlugin(options)` — Global Error Handler

Register `queryPlugin` in your app to handle all query and mutation errors in one place — no need to add `onError` to every individual `createQuery` or `createMutation` call.

```ts
import { createApp } from '@liteforge/runtime'
import { queryPlugin } from '@liteforge/query'

createApp({ root: App, target: '#app' })
  .use(queryPlugin({
    onError: (error, ctx) => {
      if (ctx.type === 'query') {
        console.error(`[Query ${ctx.key}]`, error.message)
      } else {
        console.error('[Mutation]', error.message)
      }
    },
  }))
  .mount()
```

**`QueryPluginOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultStaleTime` | `number` | `0` | Global stale time for all queries |
| `defaultCacheTime` | `number` | `300000` | Global cache time for all queries |
| `defaultRefetchOnFocus` | `boolean` | `true` | Global refetch-on-focus behavior |
| `defaultRefetchInterval` | `number` | `undefined` | Global poll interval in ms |
| `defaultRetry` | `number` | `3` | Global retry count on failure |
| `defaultRetryDelay` | `number` | `1000` | Global delay between retries in ms |
| `defaultEnabled` | `() => boolean` | — | Gate all queries (e.g. behind auth check). Per-query `enabled` wins. |
| `onError` | `(error: Error, ctx: QueryErrorContext) => void` | — | Called for every unhandled query or mutation error |

Per-query options always win over global defaults — `queryPlugin` only sets the fallback.

**`QueryErrorContext`:**

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'query' \| 'mutation'` | Source of the error |
| `key` | `string \| undefined` | Serialized cache key (queries only) |

**Execution order for query errors:** retries exhausted → `onError` (global handler).

**Execution order for mutation errors:** per-mutation `onError` callback → global `onError` handler.

The handler is automatically cleared when the app is destroyed (plugin cleanup).

#### Common pattern — disable refetch-on-focus globally

`refetchOnFocus: true` is the default but can be undesirable for CRUD apps where every tab-switch triggers refetches. Override it once in `queryPlugin` instead of patching every call site:

```ts
createApp({ root: App, target: '#app' })
  .use(queryPlugin({
    defaultRefetchOnFocus: false,
    defaultStaleTime: 30_000,
    defaultRetry: 1,
  }))
  .mount()

// Individual queries can still opt in:
const liveFeed = createQuery({
  key: 'live-feed',
  fn: fetchFeed,
  refetchOnFocus: true,  // overrides the global default
})
```

#### Common pattern — show a toast on every error

```ts
import { toastPlugin, createToast } from '@liteforge/toast'
import { queryPlugin } from '@liteforge/query'

const toast = createToast()

createApp({ root: App, target: '#app' })
  .use(toastPlugin())
  .use(queryPlugin({
    onError: (error) => toast.error(error.message),
  }))
  .mount()
```

#### Redirect to login on 401

```ts
import { routerPlugin, createRouter } from '@liteforge/router'
import { queryPlugin } from '@liteforge/query'

const router = createRouter({ routes })

createApp({ root: App, target: '#app' })
  .use(routerPlugin(router))
  .use(queryPlugin({
    onError: (error) => {
      if ((error as any).status === 401) router.navigate('/login')
    },
  }))
  .mount()
```

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

### onSuccess / onError callbacks

```ts
const orders = createQuery({
  key: 'orders',
  fn: fetchOrders,
  onSuccess: (data) => {
    console.log(`Loaded ${data.length} orders`)
  },
  onError: (error) => {
    toast.error(`Orders failed: ${error.message}`)
  },
})
```

### Gate all queries behind auth (defaultEnabled)

```ts
createApp({ root: App, target: '#app' })
  .use(queryPlugin({
    defaultEnabled: () => !!authStore.token(),  // no query fires until logged in
  }))
  .mount()
```

### Array query key

```ts
const postId = signal(1)

const post = createQuery({
  key: () => ['post', postId()],   // array form — automatically serialized
  fn: () => fetch(`/api/posts/${postId()}`).then(r => r.json()),
})
```

## Notes

- `createQuery` auto-disposes when called inside `setup()` via `onSetupCleanup`.
- Queries are deduplicated by key — multiple components can share the same cache entry.
- When `refetchOnFocus` is true, a stale query revalidates silently in the background (no loading flash when data already exists).
- `queryPlugin` is available for registering the query API in app context via `use('query')`.
