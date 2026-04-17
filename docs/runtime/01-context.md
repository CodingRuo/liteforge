---
title: "Context"
category: "runtime"
tags: ["context", "use", "provide", "dependency-injection", "plugin"]
related: ["defineComponent", "Rendering", "Quick Start"]
---

# Context

> Provide and consume values across the component tree without prop-drilling.

## Installation

```bash
npm install @liteforge/runtime
```

## Quick Start

```tsx
import { defineComponent, use } from '@liteforge/runtime'

// Provider component — injects values into child context
const AppShell = defineComponent({
  provide() {
    return { theme: 'dark', version: '1.0' }
  },
  component() {
    return <main><Child /></main>
  },
})

// Consumer — reads from context
const Child = defineComponent({
  setup({ use }) {
    const theme = use<string>('theme')
    return { theme }
  },
  component({ setup }) {
    return <div class={setup.theme}>Hello</div>
  },
})
```

## API Reference

### `use<T>(key)` → `T`

Read a value from the current component context. Available inside `setup`, `load`, `component`, `mounted`, and `destroyed`.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | Context key to look up |

**Returns:** `T` — the context value. Throws if key is not found.

### `hasContext(key)` → `boolean`

Check if a key exists in the current context without throwing.

### `provide` hook in `defineComponent`

The `provide` hook on a component definition injects values into the context for all child components:

```ts
defineComponent({
  provide({ use }) {
    return { apiClient: createApiClient() }
  },
  // ...
})
```

### Plugin Registry

Packages like `@liteforge/router` and `@liteforge/query` extend the `PluginRegistry` interface via declaration merging. This means `use('router')` returns a typed `Router` when `@liteforge/router` is imported.

```ts
import '@liteforge/router'  // augments PluginRegistry

setup({ use }) {
  const router = use('router')  // → Router (typed)
}
```

## Examples

### Injecting a store

```ts
const myStore = defineStore('settings', { state: { locale: 'en' } })

await defineApp({ root: App, target: '#app', stores: [myStore] })

// Inside any component:
setup({ use }) {
  const settings = use<typeof myStore>('settings')
  return { locale: settings.locale }
}
```

### Providing a service

```tsx
const ApiProvider = defineComponent({
  provide() {
    const client = { get: (url: string) => fetch(url).then(r => r.json()) }
    return { api: client }
  },
  component() {
    return <slot />
  },
})
```

## Notes

- `use()` traverses parent context upward until found. If not found, it throws.
- `hasContext()` is safe to call; returns false instead of throwing.
- Context is inherited by child components automatically.
- Plugin context keys are registered by the plugin system — call `.use(plugin)` on `AppBuilder` before mounting.
