---
title: "JSX"
category: "core"
tags: ["jsx", "tsx", "h", "Fragment", "Show", "For", "Switch", "Match", "Dynamic"]
related: ["Signals", "defineComponent", "Vite Plugin"]
---

# JSX

> LiteForge's JSX syntax: reactive expressions, event handlers, control flow.

## Installation

```bash
npm install @liteforge/runtime @liteforge/vite-plugin
```

## Quick Start

```tsx
// tsconfig.json: "jsxImportSource": "@liteforge/runtime"
import { signal } from '@liteforge/core'
import { Show, For } from '@liteforge/runtime'

const visible = signal(true)
const items = signal(['a', 'b', 'c'])

const view = (
  <div>
    <Show when={visible}>
      {() => <p>Hello!</p>}
    </Show>
    <For each={items}>
      {(item) => <li>{item}</li>}
    </For>
  </div>
)
```

## API Reference

### JSX expression rules

| Case | Syntax | Notes |
|------|--------|-------|
| Reactive text | `{() => mySignal()}` | Must wrap in getter |
| Static text | `{'hello'}` or `hello` | No wrapper needed |
| Event handler | `onclick={() => fn()}` | Never wrapped by vite-plugin |
| PascalCase event | `onClick={() => fn()}` | Also recognized |
| Dynamic attribute | `class={() => active() ? 'on' : 'off'}` | Must wrap |
| Static attribute | `class="foo"` | No wrapper |
| Component call | `<MyComponent prop={val} />` | Props passed as object |

### `h(tag, props, ...children)` → `Node`

The JSX factory function. Called automatically by the Babel/TypeScript transform. You rarely call this directly.

### `Fragment` → `DocumentFragment`

JSX Fragment support — `<>...</>` compiles to `Fragment`.

### Control Flow

#### `Show`

```tsx
import { Show } from '@liteforge/runtime'

// Children must be a render function — NOT static JSX
<Show when={() => isLoggedIn()}>
  {() => <Dashboard />}
</Show>

<Show when={() => isLoggedIn()} fallback={() => <Login />}>
  {() => <Dashboard />}
</Show>

// Value-based: the truthy value is passed into the render function
<Show when={() => currentUser()}>
  {(user) => <h1>{user.name}</h1>}
</Show>
```

`when` accepts a signal, a getter function `() => T`, or a static value.
`children` **must** be a render function `(value) => Node` — passing static JSX
(e.g. `<Dashboard />`) will throw `TypeError: children is not a function` at runtime
because Show calls `children(value)` internally.

#### `For`

```tsx
import { For } from '@liteforge/runtime'

<For each={items}>
  {(item, index) => <li key={item.id}>{item.name}</li>}
</For>
```

`each` accepts a signal or getter returning an array.

#### `Switch` / `Match`

```tsx
import { Switch, Match } from '@liteforge/runtime'

<Switch fallback={() => <NotFound />}>
  <Match when={() => isAdmin()}>
    {() => <AdminPanel />}
  </Match>
  <Match when={() => isUser()}>
    {() => <UserPanel />}
  </Match>
</Switch>
```

#### `Dynamic`

```tsx
import { Dynamic } from '@liteforge/runtime'

<Dynamic component={() => currentComponent()} />
```

Renders a component that can change at runtime.

## Examples

### Reactive class binding

```tsx
const active = signal(false)

<div class={() => active() ? 'btn btn--active' : 'btn'}>
  Click me
</div>
```

### Reactive style

```tsx
const color = signal('red')

<p style={() => `color: ${color()}`}>Text</p>
```

### MemberExpression component call in children

```tsx
// Both of these work — the vite-plugin does NOT wrap uppercase MemberExpression calls
<div>
  {table.Root()}
  {calendar.Toolbar()}
</div>
```

## Notes

- Reactive text must always be wrapped in `() =>`. A bare `{count()}` evaluates once and is static.
- Event handlers (`onclick`, `onClick`, and all known DOM events) are never wrapped in getters.
- Props like `online` or `once` are NOT treated as events.
- `Show` double-resolves if `when` returns a function (handles both `when={mySignal}` and `when={() => mySignal()}`).
- Removing a node from the DOM disposes its effects. Use `style="display:none"` to hide without destroying reactive state.
