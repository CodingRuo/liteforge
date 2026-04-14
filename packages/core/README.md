# @liteforge/core

Fine-grained reactive primitives for LiteForge.

## Installation

```bash
npm install @liteforge/core
```

## Overview

`@liteforge/core` provides the reactive foundation for LiteForge applications. It includes signals for reactive state, computed values for derived state, effects for side effects, and batching for performance optimization.

## API

### signal

Creates a reactive value that notifies subscribers when it changes.

```ts
import { signal } from '@liteforge/core'

const count = signal(0)

// Read the value
count()  // 0

// Set a new value
count.set(5)

// Update based on previous value
count.update(n => n + 1)  // 6

// Peek without subscribing
count.peek()  // 6
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Debug name for devtools |
| `equals` | `(a, b) => boolean` | Custom equality function |

```ts
const user = signal({ name: 'Alice' }, {
  name: 'currentUser',
  equals: (a, b) => a.name === b.name
})
```

### computed

Creates a derived value that automatically tracks dependencies.

```ts
import { signal, computed } from '@liteforge/core'

const firstName = signal('John')
const lastName = signal('Doe')

const fullName = computed(() => `${firstName()} ${lastName()}`)

fullName()  // "John Doe"

firstName.set('Jane')
fullName()  // "Jane Doe"
```

Computed values are lazy and cached — they only recalculate when dependencies change and only when read.

### effect

Runs a function whenever its dependencies change.

```ts
import { signal, effect } from '@liteforge/core'

const count = signal(0)

const dispose = effect(() => {
  console.log(`Count is now: ${count()}`)
})
// Logs: "Count is now: 0"

count.set(1)
// Logs: "Count is now: 1"

// Stop the effect
dispose()
```

### batch

Groups multiple signal updates into a single notification cycle.

```ts
import { signal, effect, batch } from '@liteforge/core'

const a = signal(1)
const b = signal(2)

effect(() => {
  console.log(`a=${a()}, b=${b()}`)
})
// Logs once: "a=1, b=2"

batch(() => {
  a.set(10)
  b.set(20)
})
// Logs once: "a=10, b=20"
```

Without batch, the effect would run twice (once for each signal update).

### onCleanup

Registers a cleanup function to run before an effect re-executes or is disposed.

```ts
import { signal, effect, onCleanup } from '@liteforge/core'

const userId = signal(1)

effect(() => {
  const id = userId()
  const controller = new AbortController()
  
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(console.log)
  
  onCleanup(() => {
    controller.abort()
  })
})
```

### untrack

Executes a function without tracking any signal reads inside it. Use this when you need to read a signal inside an effect without creating a dependency — for example when writing to another signal to avoid infinite loops.

```ts
import { signal, effect, untrack } from '@liteforge/core'

const source = signal(0)
const derived = signal(0)

effect(() => {
  const val = source()                  // tracked — effect re-runs when source changes
  untrack(() => derived.set(val * 2))   // write without subscribing — no loop
})

source.set(5)
derived()  // 10
```

**Common pattern — prefilling a form from async data:**

```ts
effect(() => {
  const data = query.data()            // tracked
  if (data) untrack(() => form.setValues(data))  // write without re-triggering
})
```

Without `untrack`, `form.setValues()` would write form signals which would cause the effect to re-run, creating an infinite loop.

## Types

```ts
import type {
  Signal,
  ReadonlySignal,
  SignalOptions,
  EffectFn,
  DisposeFn,
  EffectOptions,
  ComputeFn,
  ComputedOptions
} from '@liteforge/core'
```

## Debug Utilities

For integration with devtools:

```ts
import { enableDebug, disableDebug, createDebugBus } from '@liteforge/core'

enableDebug()

const bus = createDebugBus()
bus.on('signal:update', (payload) => {
  console.log(`Signal ${payload.name} changed to ${payload.value}`)
})
```

## License

MIT
