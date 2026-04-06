---
title: "Rendering"
category: "runtime"
tags: ["rendering", "dom", "template", "insert", "setProp", "h"]
related: ["JSX", "createComponent", "Context"]
---

# Rendering

> How LiteForge renders components to the DOM: direct DOM creation, signal-tracked updates, template optimizations.

## Installation

```bash
npm install @liteforge/runtime
```

## Quick Start

```tsx
// The JSX transform compiles this automatically:
const el = <div class="box">{() => count()}</div>

// Equivalent low-level calls (rarely written manually):
import { h } from '@liteforge/runtime'
const el = h('div', { class: 'box' }, () => count())
```

## API Reference

### `h(tag, props, ...children)` → `Node`

JSX factory. Creates DOM elements or instantiates component factories.

| Param | Type | Description |
|-------|------|-------------|
| `tag` | `string \| ComponentFactory` | HTML tag name or component factory |
| `props` | `object \| null` | Element attributes / component props |
| `...children` | `Child[]` | Text, nodes, signals (wrapped in `() =>`), or arrays |

### `Fragment` → `DocumentFragment`

Used for `<>...</>` JSX fragments.

### Template runtime (advanced / compiler output)

The vite-plugin may emit calls to these low-level APIs for static templates:

| Function | Description |
|----------|-------------|
| `_template(html)` | Clone a cached HTML template fragment |
| `_insert(parent, value, before?)` | Insert a reactive child at a position |
| `_setProp(el, name, value)` | Set a property or attribute reactively |
| `_addEventListener(el, event, handler)` | Attach a DOM event listener |

These are compiler output — you should not call them directly.

## Examples

### Manual DOM construction (without JSX)

```ts
import { h, Fragment } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

const label = signal('Hello')

const node = h('div', { class: 'wrapper' },
  h('span', null, () => label()),
  h('button', { onclick: () => label.set('World') }, 'Click'),
)

document.body.appendChild(node)
```

### Children types

```tsx
// Strings are static text nodes
<p>Hello world</p>

// () => expressions are reactive
<p>{() => user()?.name ?? 'Guest'}</p>

// Arrays are flattened
<ul>{items().map(i => <li>{i}</li>)}</ul>

// Nodes are inserted as-is
<div>{document.createElement('canvas')}</div>
```

## Notes

- The runtime uses direct DOM APIs — no virtual DOM diff.
- Signal-returning children (`() => ...`) are wrapped in effects; updating the signal updates the DOM node in place.
- The vite-plugin's template compiler generates `_template`/`_insert`/`_setProp` calls for static subtrees to avoid repeated `createElement` calls.
- `ref` props are supported: `ref={el => myRef = el}` calls the function with the element after insertion.
