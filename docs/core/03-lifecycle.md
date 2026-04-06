---
title: "Lifecycle"
category: "core"
tags: ["lifecycle", "setup", "load", "mounted", "destroyed", "placeholder", "error"]
related: ["createComponent", "Context", "Rendering"]
---

# Lifecycle

> The full component lifecycle in LiteForge: setup → placeholder → load → component → mounted → destroyed.

## Installation

```bash
npm install @liteforge/runtime
```

## Quick Start

```tsx
import { createComponent } from '@liteforge/runtime'
import { onSetupCleanup } from '@liteforge/runtime'
import { signal, effect } from '@liteforge/core'

const MyComponent = createComponent({
  setup({ props, use }) {
    const count = signal(0)

    // Register cleanup for when the component is destroyed
    const stop = effect(() => console.log(count()))
    onSetupCleanup(stop)

    return { count }
  },
  async load({ props, setup, use }) {
    const data = await fetch('/api/data').then(r => r.json())
    return data
  },
  placeholder: ({ props }) => <div>Loading...</div>,
  error: ({ error, retry }) => <button onclick={retry}>Retry</button>,
  component({ props, data, setup, use }) {
    return <div>{data.title}</div>
  },
  mounted({ el, props, data, setup }) {
    el.focus()
    return () => console.log('cleanup mounted')
  },
  destroyed({ props, setup }) {
    console.log('destroyed')
  },
})
```

## API Reference

### Lifecycle Phases (in order)

| Phase | Hook | When |
|-------|------|------|
| 1 | `setup(args)` | Synchronous, runs immediately on component creation |
| 2 | `placeholder(args)` | Shown while `load()` is pending (only when `load` is defined) |
| 3 | `load(args)` | Async data fetch (optional) |
| 4 | `error(args)` | Shown if `load()` rejects (optional) |
| 5 | `component(args)` | Renders the component, called after `load()` resolves |
| 6 | `mounted(args)` | Called after root element is inserted into DOM |
| 7 | `destroyed(args)` | Called on unmount |

### `setup({ props, use })` → `S`

Synchronous initialization. Create signals and side effects here. Return an object that `component`, `mounted`, and `destroyed` can access via `setup` argument.

### `load({ props, setup, use })` → `Promise<D>`

Async data loading. The resolved value is passed as `data` to `component` and `mounted`.

### `placeholder({ props })` → `Node`

Shown in the DOM while `load` is pending. If not provided, an empty comment node is used.

### `error({ props, error, retry })` → `Node`

Shown when `load` rejects. `retry` is a function that re-attempts loading.

### `component({ props, data, setup, use })` → `Node`

The render function. Called when data is loaded (or immediately if no `load`). Must return a DOM `Node`.

### `mounted({ el, props, data, setup, use })` → `void | (() => void)`

Called after the component's root element is inserted into the DOM. Receives the root `Element`. May return a cleanup function called before `destroyed`.

### `destroyed({ props, setup })` → `void`

Called when the component is unmounted from the DOM.

### `onSetupCleanup(fn)` → `void`

Register a cleanup function during `setup()`. Called in reverse order when the component is destroyed.

```ts
import { onSetupCleanup } from '@liteforge/runtime'

setup() {
  const timer = setInterval(() => ..., 1000)
  onSetupCleanup(() => clearInterval(timer))
}
```

## Examples

### Cleanup in setup

```tsx
setup({ props }) {
  const ws = new WebSocket(`ws://example.com/${props.id}`)
  const messages = signal<string[]>([])

  ws.onmessage = (e) => messages.update(m => [...m, e.data])
  onSetupCleanup(() => ws.close())

  return { messages }
}
```

### Animate on mount

```tsx
mounted({ el }) {
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
}
```

## Notes

- `setup()` re-runs on HMR updates (Phase 1 trade-off). Store signals survive.
- `mounted()` only fires when `component()` returns an `Element`. Text nodes do not trigger it.
- Cleanups registered via `onSetupCleanup()` run in reverse registration order on destroy.
- `provide` (an optional lifecycle hook) allows components to inject values into child context: `provide({ use }) => Record<string, unknown>`.
