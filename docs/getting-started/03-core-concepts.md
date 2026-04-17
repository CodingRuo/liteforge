---
title: "Core Concepts"
category: "getting-started"
tags: ["signals", "reactivity", "jsx", "components", "effects"]
related: ["Signals", "defineComponent", "JSX"]
---

# Core Concepts

> Understand LiteForge's fundamental design: signals, direct DOM updates, and JSX.

## Installation

```bash
npm install @liteforge/core @liteforge/runtime @liteforge/vite-plugin
```

## Quick Start

```ts
import { signal, effect, computed } from '@liteforge/core'

// 1. Create reactive state
const count = signal(0)

// 2. Derive values automatically
const doubled = computed(() => count() * 2)

// 3. React to changes
effect(() => {
  console.log('count:', count(), 'doubled:', doubled())
})

// 4. Update state — effect re-runs automatically
count.set(5)
```

## API Reference

### Signals — the foundation

Signals hold a value and notify subscribers when it changes.

```ts
const name = signal('Alice')
name()              // read → 'Alice'
name.set('Bob')     // write
name.update(n => n + ' Smith')  // functional update
name.peek()         // read without subscribing
```

### Computed — derived state

Computed values are lazily evaluated and cached until dependencies change.

```ts
const upper = computed(() => name().toUpperCase())
upper()   // → 'BOB SMITH' (recomputed)
upper()   // → 'BOB SMITH' (cached)
```

### Effects — side effects

Effects run immediately and re-run when any signal they read changes.

```ts
const dispose = effect(() => {
  document.title = name()  // auto-subscribes to name
})

dispose()  // stop the effect
```

### JSX Rules

| Pattern | Correct | Wrong |
|---------|---------|-------|
| Reactive text | `{() => count()}` | `{count()}` |
| Event handler | `onclick={() => fn()}` | no wrapper needed |
| Static attr | `class="foo"` | — |
| Dynamic attr | `class={() => active() ? 'on' : 'off'}` | `class={active() ? 'on' : 'off'}` |

### Components

```tsx
import { defineComponent } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

const Counter = defineComponent({
  setup() {
    const count = signal(0)
    return { count }
  },
  component({ setup }) {
    return (
      <div>
        <span>{() => setup.count()}</span>
        <button onclick={() => setup.count.update(n => n + 1)}>+</button>
      </div>
    )
  },
})
```

### Control Flow

```tsx
import { Show, For } from '@liteforge/runtime'

// Conditional rendering — children must be a render function
<Show when={() => isLoggedIn()}>
  {() => <Dashboard />}
</Show>

// List rendering
<For each={items}>
  {(item) => <li>{item.name}</li>}
</For>
```

## Notes

- Signals notify subscribers only when the value actually changes (`Object.is` comparison).
- Effects run synchronously on first call. Updates are batched internally to avoid diamond problems.
- `batch()` defers all signal notifications until the batch completes, preventing intermediate renders.
- Reactive text in JSX always needs a `() =>` wrapper — bare signal calls are not tracked by the JSX runtime.
- Event handlers (`onclick`, `onClick`, etc.) are never wrapped in getters by the vite-plugin.
