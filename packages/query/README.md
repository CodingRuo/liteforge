# @liteforge/query

Signals-based data fetching with caching and mutations for LiteForge.

## Installation

```bash
npm install @liteforge/query @liteforge/core
```

Peer dependency: `@liteforge/core >= 0.1.0`

## Overview

`@liteforge/query` provides a simple, powerful data fetching solution built on signals. It handles caching, refetching, loading states, and error handling automatically.

## API

### createQuery

Fetches and caches data.

```ts
import { createQuery } from '@liteforge/query'

const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json())
})

// All return values are signals
users.data()        // User[] | undefined
users.error()       // Error | undefined
users.isLoading()   // boolean
users.isFetching()  // boolean (includes background refetch)
users.isStale()     // boolean
users.isSuccess()   // boolean
users.isError()     // boolean

// Manual control
users.refetch()
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string \| () => string[]` | required | Cache key (can be reactive) |
| `fn` | `() => Promise<T>` | required | Fetch function |
| `staleTime` | `number` | `0` | ms until data is considered stale |
| `cacheTime` | `number` | `300000` | ms to keep unused data in cache |
| `refetchOnFocus` | `boolean` | `true` | Refetch when window gains focus |
| `refetchInterval` | `number` | — | Polling interval in ms |
| `retry` | `number` | `3` | Number of retry attempts |
| `retryDelay` | `number \| (n) => number` | `1000` | Delay between retries |
| `enabled` | `boolean \| () => boolean` | `true` | Whether query should run |

**Reactive Keys:**

```ts
import { signal } from '@liteforge/core'

const userId = signal(1)

const user = createQuery({
  key: () => ['user', userId()],  // Refetches when userId changes
  fn: () => fetch(`/api/users/${userId()}`).then(r => r.json())
})

// Change userId → automatically refetches
userId.set(2)
```

**Conditional Queries:**

```ts
const token = signal<string | null>(null)

const profile = createQuery({
  key: 'profile',
  fn: () => fetchProfile(token()!),
  enabled: () => token() !== null  // Only run when logged in
})
```

### createMutation

Performs data modifications with cache invalidation.

```ts
import { createMutation } from '@liteforge/query'

const addUser = createMutation({
  fn: (data: NewUser) => fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(r => r.json()),
  
  invalidate: ['users'],  // Refetch users after success
  
  onSuccess: (result, variables) => {
    console.log('Created user:', result)
  },
  
  onError: (error, variables) => {
    console.error('Failed:', error)
  }
})

// Use the mutation
addUser.mutate({ name: 'Alice', email: 'alice@example.com' })

// Mutation state (signals)
addUser.isLoading()
addUser.error()
addUser.data()  // Last successful result
```

**Optimistic Updates:**

```ts
const updateUser = createMutation({
  fn: (user: User) => api.updateUser(user),
  
  onMutate: (newUser, cache) => {
    // Save current value for rollback
    const previous = cache.get(['user', newUser.id])
    
    // Optimistically update cache
    cache.set(['user', newUser.id], newUser)
    
    return previous  // Returned value passed to onError
  },
  
  onError: (error, variables, rollback) => {
    // Restore previous value
    queryCache.set(['user', variables.id], rollback)
  },
  
  onSuccess: (result, variables) => {
    // Update with server response
    queryCache.set(['user', variables.id], result)
  }
})
```

### queryCache

Direct cache manipulation.

```ts
import { queryCache } from '@liteforge/query'

// Get cached data
queryCache.get('users')
queryCache.get(['user', '123'])

// Set cache data
queryCache.set('users', newUsers)

// Invalidate (triggers refetch)
queryCache.invalidate('users')
queryCache.invalidate(['user', '*'])  // Wildcard pattern

// Remove from cache
queryCache.remove('users')

// Clear entire cache
queryCache.clear()

// Check if key exists
queryCache.has('users')
```

## Usage in Components

```tsx
import { createComponent } from '@liteforge/runtime'
import { createQuery } from '@liteforge/query'
import { Show, For } from '@liteforge/runtime'

const UserList = createComponent({
  component: () => {
    const users = createQuery({
      key: 'users',
      fn: () => fetch('/api/users').then(r => r.json()),
      staleTime: 5 * 60 * 1000  // 5 minutes
    })
    
    return (
      <div>
        <Show when={() => users.isLoading()}>
          <Spinner />
        </Show>
        
        <Show when={() => users.error()}>
          <div>
            Error: {() => users.error()?.message}
            <button onclick={() => users.refetch()}>Retry</button>
          </div>
        </Show>
        
        <Show when={() => users.data()}>
          <ul>
            <For each={() => users.data()!}>
              {(user) => <li>{user.name}</li>}
            </For>
          </ul>
        </Show>
      </div>
    )
  }
})
```

## Data Fetching Patterns

### When to use `load()` vs `createQuery()` in `setup()`

**Use `load()` for one-shot fetches where caching is not needed:**

- Detail views (`/customers/:id`)
- Edit forms (pre-fill existing record)

```ts
createComponent({
  async load({ props }) {
    const customer = await client.get(`/customers/${props.id}`)
    return { customer }
  },
  component({ data }) {
    return <div>{data.customer.name}</div>
  }
})
```

`load()` runs on every component mount. There is no cache — navigating away and back triggers a new fetch each time.

**Use `createQuery()` in `setup()` for list views and views where caching matters:**

- List views (`/customers`, `/invoices`, ...)
- Dashboard aggregations

```ts
createComponent({
  setup() {
    const customers = createQuery({
      key: 'customers',
      fn: () => fetch('/api/customers').then(r => r.json()),
      staleTime: 30_000,  // 30s cache — navigating back does NOT refetch if fresh
    })
    return { customers }
  },
  component({ setup }) {
    const table = createTable({
      data: () => setup.customers.data() ?? [],  // reactive — updates when query resolves
      columns: [...],
    })
    return <div>{table.Root()}</div>
  }
})
```

**Key difference:** `createQuery()` in `setup()` uses the cache. Navigating away and back within the `staleTime` window does **not** trigger a new network request. `load()` always fetches.

> **Important:** Do not call `createTable()` inside `load()` or after awaiting — `setup()` must be synchronous and run before data arrives. Use `data: () => setup.query.data() ?? []` so the table reacts to the query signal.

## Types

```ts
import type {
  QueryKey,
  QueryFetcher,
  CreateQueryOptions,
  QueryResult,
  MutationFn,
  CreateMutationOptions,
  MutationResult,
  CacheEntry,
  QueryCacheInterface
} from '@liteforge/query'
```

## License

MIT
