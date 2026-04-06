---
title: "createComponent"
category: "core"
tags: ["component", "createComponent", "factory", "props", "setup", "load"]
related: ["Lifecycle", "JSX", "Context"]
---

# createComponent

> The central factory for creating reactive components with full lifecycle support.

## Installation

```bash
npm install @liteforge/runtime
```

## Quick Start

```tsx
import { createComponent } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

const Counter = createComponent({
  setup() {
    const count = signal(0)
    return { count }
  },
  component({ setup }) {
    return (
      <div>
        <p>{() => setup.count()}</p>
        <button onclick={() => setup.count.update(n => n + 1)}>+</button>
      </div>
    )
  },
})

// Use in JSX
<Counter />
```

## API Reference

### `createComponent<TProps>(definition)` → `ComponentFactory<TProps>`

**Overloads:**

1. `createComponent<TProps>({ ... })` — explicit prop type, no schema object.
2. `createComponent({ props: schema, ... })` — schema-driven props with defaults/required.
3. `createComponent({ ... })` — no props.

**Definition object:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Optional debug name |
| `props` | `Record<string, PropDefinition>` | Props schema (optional) |
| `setup` | `(args: SetupArgs) => S` | Synchronous setup, runs before render |
| `load` | `(args: LoadArgs) => Promise<D>` | Async data loader |
| `placeholder` | `(args: PlaceholderArgs) => Node` | Shown while `load` is pending |
| `error` | `(args: ErrorArgs) => Node` | Shown when `load` rejects |
| `component` | `(args: ComponentArgs) => Node` | The render function (required) |
| `mounted` | `(args: MountedArgs) => void \| (() => void)` | Called after DOM insertion |
| `destroyed` | `(args: DestroyedArgs) => void` | Called on unmount |
| `provide` | `(args) => Record<string, unknown>` | Provide context to children |

**PropDefinition:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `StringConstructor \| NumberConstructor \| ...` | Prop type |
| `required` | `boolean` | Whether the prop is required |
| `default` | `T \| (() => T)` | Default value |

**Returns (`ComponentFactory<TProps, InputProps>`):**

A callable function that accepts props and returns a `Node` (for JSX compat). Internally returns a `ComponentInstance` with `mount`, `unmount`, `getNode`, `updateProps`.

## Examples

### Async loading with placeholder

```tsx
const UserProfile = createComponent({
  setup({ props }) {
    return { expanded: signal(false) }
  },
  async load({ props }) {
    const user = await fetch(`/api/users/${props.userId}`).then(r => r.json())
    return { user }
  },
  placeholder: () => <div class="skeleton">Loading...</div>,
  error: ({ error, retry }) => (
    <div>
      Error: {error.message}
      <button onclick={retry}>Retry</button>
    </div>
  ),
  component({ props, data, setup }) {
    return (
      <div>
        <h1>{data.user.name}</h1>
        <button onclick={() => setup.expanded.update(v => !v)}>Toggle</button>
      </div>
    )
  },
  mounted({ el }) {
    el.classList.add('fade-in')
    return () => el.classList.remove('fade-in')
  },
  destroyed({ props }) {
    console.log('unmounted user', props.userId)
  },
})

<UserProfile userId="42" />
```

### With typed props (explicit generic)

```tsx
interface CardProps {
  title: string
  subtitle?: string
}

const Card = createComponent<CardProps>({
  component({ props }) {
    return (
      <div class="card">
        <h2>{props.title}</h2>
        {props.subtitle && <p>{props.subtitle}</p>}
      </div>
    )
  },
})
```

### With props schema

```tsx
const Badge = createComponent({
  props: {
    label: { type: String, required: true },
    color: { type: String, default: 'blue' },
  },
  component({ props }) {
    return <span style={`color: ${props.color}`}>{props.label}</span>
  },
})
```

## Notes

- `setup()` runs synchronously before any rendering. Create all signals here.
- `load()` runs after setup. While loading, `placeholder` is shown. When resolved, `component` renders.
- `mounted()` receives the root element — only called when `component()` returns an `Element` (not a text node).
- `mounted()` may return a cleanup function; it runs before `destroyed()`.
- `onSetupCleanup(fn)` registers cleanup that runs when the component is destroyed, callable only during `setup()`.
- In dev mode, HMR is handled automatically via the component registry — no manual config needed.
