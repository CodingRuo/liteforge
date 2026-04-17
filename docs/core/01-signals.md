---
title: "Signals"
category: "core"
tags: ["signal", "computed", "effect", "batch", "onCleanup", "reactivity"]
related: ["Core Concepts", "defineComponent", "JSX"]
---

# Signals

> Fine-grained reactive primitives: `signal`, `computed`, `effect`, `batch`, `onCleanup`.

## Installation

```bash
npm install @liteforge/core
```

## Quick Start

```ts
import { signal, computed, effect, batch, onCleanup } from '@liteforge/core'

const count = signal(0)
const doubled = computed(() => count() * 2)

const dispose = effect(() => {
  console.log(count(), doubled())
})

count.set(5)   // logs: 5 10
dispose()      // stop the effect
```

## API Reference

### `signal<T>(initialValue, options?)` → `Signal<T>`

Creates a reactive value holder.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | auto | Debug label shown in DevTools |

**Returns (`Signal<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `()` | `() => T` | Read the current value. Auto-subscribes active observers. |
| `.set(value)` | `(value: T) => void` | Set a new value. Notifies subscribers if changed. |
| `.update(fn)` | `(fn: (current: T) => T) => void` | Update value via function. |
| `.peek()` | `() => T` | Read without subscribing (no reactive tracking). |
| `.__debugId` | `string` | Auto-generated or label-based debug ID. |
| `.__debugLabel` | `string \| undefined` | The label provided in options. |

---

### `computed<T>(fn, options?)` → `ReadonlySignal<T>`

Creates a lazily-evaluated, cached derived value.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | auto | Debug label |

**Returns (`ReadonlySignal<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `()` | `() => T` | Read the computed value. Recomputes if dirty. |
| `.peek()` | `() => T` | Read without subscribing. Recomputes if dirty. |
| `.__debugId` | `string` | Debug ID |
| `.__debugLabel` | `string \| undefined` | Debug label |

---

### `effect(fn, options?)` → `DisposeFn`

Creates a reactive side effect that re-runs when its signal dependencies change.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `fn` | `() => void \| (() => void)` | Effect body. May return a cleanup function. |
| `options.label` | `string` | Debug label |

**Returns:** `() => void` — call to stop the effect and run cleanup.

---

### `batch(fn)` → `void`

Defers all signal notifications until `fn` completes. Prevents intermediate re-renders when updating multiple signals.

```ts
import { batch } from '@liteforge/core'

batch(() => {
  firstName.set('John')
  lastName.set('Doe')
})
// Subscribers notified once, after both sets
```

---

### `onCleanup(fn)` → `void`

Registers a cleanup function inside an `effect`. Called before the effect re-runs and on dispose.

```ts
effect(() => {
  const timer = setInterval(() => tick(), 1000)
  onCleanup(() => clearInterval(timer))
})
```

## Examples

### Reactive key-value store

```ts
const items = signal<string[]>([])
const count = computed(() => items().length)

effect(() => {
  console.log(`${count()} items in store`)
})

items.update(arr => [...arr, 'apple'])  // logs: 1 items in store
```

### Effect with cleanup

```ts
const url = signal('/api/data')

effect(() => {
  const controller = new AbortController()
  fetch(url(), { signal: controller.signal })
    .then(r => r.json())
    .then(data => console.log(data))

  onCleanup(() => controller.abort())
})

url.set('/api/other')  // aborts in-flight request, starts new one
```

## Notes

- Signals use `Object.is` for change detection — identity comparison, not deep equality.
- `computed` is lazy: the function only runs when the value is read AND dependencies have changed.
- Effects run immediately on creation, before returning the dispose function.
- Nested effects are supported. Each creates its own dependency scope.
- `batch()` is applied implicitly around every `signal.set()` call to handle diamond dependencies.
