---
title: "defineStore"
category: "store"
tags: ["store", "defineStore", "state", "getters", "actions", "storeRegistry", "time-travel"]
related: ["Signals", "Context", "DevTools"]
---

# defineStore

> Global reactive state management built on signals.

## Installation

```bash
npm install @liteforge/store
```

## Quick Start

```ts
import { defineStore } from '@liteforge/store'

const counterStore = defineStore('counter', {
  state: {
    count: 0,
  },
  getters: (state) => ({
    doubled: () => state.count() * 2,
  }),
  actions: (state) => ({
    increment() {
      state.count.update(n => n + 1)
    },
    reset() {
      state.count.set(0)
    },
  }),
})

counterStore.count()      // → 0 (Signal)
counterStore.doubled()    // → 0 (getter)
counterStore.increment()  // action
counterStore.count()      // → 1
```

## API Reference

### `defineStore(name, definition)` → `Store<S, G, A>`

Creates (or retrieves) a singleton reactive store.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique store name. Calling again with the same name returns the existing store. |
| `definition.state` | `StateDefinition` | Initial state values. Each value becomes a `Signal`. |
| `definition.getters` | `(state) => GettersDefinition` | Factory returning getter functions. |
| `definition.actions` | `(state, use) => ActionsDefinition` | Factory returning action functions. |

**Returns (`Store<S, G, A>`):**

State signals are spread directly on the store object alongside getters, actions, and internal methods.

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `$name` | `string` | Store name |
| `[stateKey]` | `Signal<T>` | Each state key becomes a signal |
| `[getterKey]` | `() => T` | Each getter is a function |
| `[actionKey]` | `(...args) => any` | Each action |
| `$watch(key, callback)` | `() => void` | Watch a specific state key. Returns unsubscribe. |
| `$onChange(callback)` | `() => void` | Watch all state changes. Returns unsubscribe. |
| `$reset()` | `void` | Reset all state to initial values. |
| `$snapshot()` | `WidenedState<S>` | Get a plain-object snapshot. |
| `$restore(snapshot)` | `void` | Restore state from a snapshot (time-travel). |

## Examples

### Async actions with context

```ts
const userStore = defineStore('users', {
  state: {
    currentUser: null as User | null,
    loading: false,
  },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
  }),
  actions: (state, use) => ({
    async login(email: string, password: string) {
      state.loading.set(true)
      try {
        const api = use<ApiClient>('api')
        const user = await api.post('/auth/login', { email, password })
        state.currentUser.set(user)
      } finally {
        state.loading.set(false)
      }
    },
    logout() {
      state.currentUser.set(null)
    },
  }),
})
```

### Watching state changes

```ts
// Watch a specific key
const unsub = userStore.$watch('currentUser', (newVal, oldVal) => {
  console.log('user changed', newVal)
})

// Watch all changes
const unsub2 = userStore.$onChange((key, newVal, oldVal) => {
  console.log(`${key} changed`, newVal)
})

// Clean up
unsub()
unsub2()
```

### Time-travel debugging

```ts
// Snapshot
const snap = counterStore.$snapshot()  // { count: 5 }

// Restore
counterStore.$reset()
counterStore.$restore(snap)  // count is 5 again
```

### storeRegistry

```ts
import { storeRegistry } from '@liteforge/store'

const store = storeRegistry.get<typeof counterStore>('counter')
```

### Typed `use('store:name')` — Declaration Merging

By default `use('store:auth')` returns `unknown`. Add a Declaration Merging block next to your store definition to get full types everywhere — no casts needed:

```ts
// auth.ts
export const authStore = defineStore('auth', {
  state: { token: null as string | null },
  getters: (state) => ({
    isLoggedIn: () => state.token() !== null,
  }),
  actions: (state) => ({
    login(token: string) { state.token.set(token) },
    logout() { state.token.set(null) },
  }),
})

// ✅ Augment the PluginRegistry so use() is fully typed:
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    'store:auth': typeof authStore
  }
}

// In any component setup():
const auth = use('store:auth')  // → typeof authStore (fully typed)
auth.login('my-token')          // ✓ type-checked
auth.isLoggedIn()               // ✓ type-checked
```

The naming convention `'store:name'` is not enforced — use whatever key you register the store under. The merge just needs to match the key you pass to `use()`.

## Notes

- `defineStore` is singleton: calling it twice with the same name returns the existing store.
- State signals use `.set()` for updates — direct assignment does not work.
- Actions receive `use` as their second argument to access app context (e.g. router, API clients). `use` throws if the store is not connected to an app.
- Register stores in `defineApp({ stores: [myStore] })` to connect them to context before mounting.
