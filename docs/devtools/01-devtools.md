---
title: "DevTools"
category: "devtools"
tags: ["devtools", "devtoolsPlugin", "createDevTools", "time-travel", "signals", "debug"]
related: ["defineStore", "Signals", "defineApp"]
---

# DevTools

> Debug panel for LiteForge applications: signals inspector, store viewer, time-travel, navigation log, and performance counters.

## Installation

```bash
npm install @liteforge/devtools
```

## Quick Start

```ts
import { devtoolsPlugin } from '@liteforge/devtools'
import { defineApp } from '@liteforge/runtime'

await defineApp({ root: App, target: '#app' })
  .use(devtoolsPlugin())
```

A floating panel appears in the bottom-right corner in development.

## API Reference

### `devtoolsPlugin(config?)` → `LiteForgePlugin`

Register the DevTools panel as an app plugin.

**Config (`DevToolsConfig`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `PanelPosition` | `'bottom-right'` | Panel position on screen |
| `defaultOpen` | `boolean` | `false` | Start with panel open |
| `maxEvents` | `number` | `500` | Max events in history buffer |
| `stores` | `DevToolsStoreMap` | — | Stores to register for time-travel |

**`PanelPosition`:** `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'`

### `createDevTools(config?)` → `DevToolsInstance`

Create a standalone DevTools instance (without app plugin integration).

**Returns (`DevToolsInstance`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `mount(target)` | `(target: string \| Element) => void` | Mount to a DOM target |
| `destroy()` | `() => void` | Unmount and clean up |
| `api` | `DevToolsApi` | Access to tabs and state |

### `DevToolsApi`

| Method | Description |
|--------|-------------|
| `getSignals()` | List all tracked signals |
| `getStores()` | List all registered stores |
| `getNavigation()` | Navigation history |
| `getComponents()` | Component mount/unmount log |
| `getPerformance()` | Performance counters |
| `travelTo(index)` | Time-travel to a store snapshot |

### Tabs

The panel includes 5 tabs:

| Tab | Description |
|-----|-------------|
| Signals | Live signal values and update history |
| Stores | Store state snapshots, time-travel |
| Router | Navigation history and params |
| Components | Mount/unmount timeline |
| Performance | Effect run counts, render durations |

## Examples

### With store time-travel

```ts
import { devtoolsPlugin } from '@liteforge/devtools'
import { counterStore, userStore } from './stores'

await defineApp({ root: App, target: '#app', stores: [counterStore, userStore] })
  .use(devtoolsPlugin({
    position: 'bottom-right',
    stores: {
      counter: counterStore,
      users: userStore,
    },
  }))
```

### Standalone (e.g. embedded in a custom panel)

```ts
import { createDevTools } from '@liteforge/devtools'

const devtools = createDevTools({ position: 'bottom-right' })
devtools.mount('#devtools-container')
```

## Notes

- DevTools are only active in development (`import.meta.env.DEV`). In production builds they are no-ops.
- The debug system in `@liteforge/core` (`enableDebug()`) must be active for signals/effects to be tracked. `devtoolsPlugin` enables it automatically.
- Time-travel restores store state via `$restore(snapshot)` — router and component state are not rewound.
- `createEventBuffer` is exported for advanced usage (e.g. custom event logging).
