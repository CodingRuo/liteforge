---
title: "Quick Start"
category: "getting-started"
tags: ["quickstart", "hello-world", "app", "component"]
related: ["Installation", "Core Concepts", "createComponent"]
---

# Quick Start

> Build your first LiteForge application in minutes.

## Installation

```bash
npm install liteforge @liteforge/vite-plugin
```

## Quick Start

```ts
// main.ts
import { createApp } from '@liteforge/runtime'
import { App } from './App'

await createApp({ root: App, target: '#app' })
```

```tsx
// App.tsx
import { createComponent } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

export const App = createComponent({
  component() {
    const count = signal(0)
    return (
      <div>
        <h1>LiteForge</h1>
        <p>Count: {() => count()}</p>
        <button onclick={() => count.update(n => n + 1)}>Increment</button>
      </div>
    )
  },
})
```

## API Reference

### `createApp(config)` → `AppBuilder`

Bootstrap the application and mount it to the DOM.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `ComponentFactory` | required | Root component |
| `target` | `string \| Element` | required | Mount target selector or element |
| `stores` | `AnyStore[]` | `[]` | Stores to connect to context |
| `context` | `Record<string, unknown>` | `{}` | Arbitrary context values |
| `plugins` | `LiteForgePlugin[]` | `[]` | Plugins to install before mount |

**Returns:** `AppBuilder` — a Thenable that also exposes `.use(plugin)` and `.mount()`.

## Examples

### With router and store

```ts
import { createApp } from '@liteforge/runtime'
import { routerPlugin } from '@liteforge/router'
import { devtoolsPlugin } from '@liteforge/devtools'
import { userStore } from './stores/user'
import { App } from './App'
import { router } from './router'

await createApp({ root: App, target: '#app', stores: [userStore] })
  .use(routerPlugin(router))
  .use(devtoolsPlugin())
```

## Notes

- `createApp` returns an `AppBuilder` with a `.then()` and `.catch()` — you can `await` it directly.
- Stores passed to `stores` are connected to the app context and can call `use()` inside actions.
- The JSX transform is provided by `@liteforge/vite-plugin`. Without it, JSX will not compile.
