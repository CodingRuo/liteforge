---
title: "Vite Plugin"
category: "vite-plugin"
tags: ["vite-plugin", "jsx", "transform", "hmr", "getter-wrap", "event-handler"]
related: ["JSX", "Installation", "defineComponent"]
---

# Vite Plugin

> The official LiteForge Vite plugin — JSX transform, signal-safe getter wrapping, and component-level HMR.

## Installation

```bash
npm install @liteforge/vite-plugin
```

## Quick Start

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()],
})
```

## API Reference

### `liteforgePlugin(options?)` → `Plugin`

The default export. Creates a Vite plugin instance.

**Options (`LiteForgePluginOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `extensions` | `string[]` | `['.tsx', '.jsx', '.ts', '.js']` | Files to transform |
| `hmr` | `boolean` | `true` (in dev) | Enable component-level HMR |

**Plugin behavior:**

1. **JSX transform** — Compiles JSX to `h()` calls. Reactive expressions are wrapped in getter functions `() => ...`. Event handlers and component calls are never wrapped.
2. **Signal-safe getters** — Any JSX attribute value that reads a signal is automatically wrapped in `() => expr` so the DOM tracks reactivity correctly.
3. **HMR injection** — In dev mode, injects `__hmrId` into every `defineComponent()` call and appends `import.meta.hot.accept()` code. On module update, the component registry is refreshed and `fullRerender()` rebuilds the app.

### Event handler detection

The plugin recognizes the following as event handlers (not wrapped in getters):

- **PascalCase:** `onClick`, `onPointerDown`, `onKeyUp`, etc. (any `on` + uppercase letter)
- **Lowercase known events:** `onclick`, `onpointerdown`, `onkeyup`, etc. (checked against `KNOWN_EVENTS` set in `utils.ts`)

Props like `online` or `once` are NOT treated as events.

If a new DOM event is not recognized as an event handler and gets wrapped incorrectly, add it to `KNOWN_EVENTS` in `packages/vite-plugin/src/utils.ts`.

### MemberExpression component calls

Component calls like `table.Root()` or `calendar.Toolbar()` in JSX children are recognized by the plugin and are NOT wrapped in getter functions. The check is: callee is a `MemberExpression` with an uppercase `property` name.

### Exported utilities (advanced)

| Export | Description |
|--------|-------------|
| `shouldWrapExpression(node)` | Check if a node should be wrapped in a getter |
| `isStaticExpression(node)` | Check if an expression is static (no signals) |
| `wrapInGetter(expr)` | Wrap an expression in `() => expr` |
| `isEventHandler(name)` | Check if a prop name is an event handler |
| `isComponent(name)` | Check if a tag name is a component (uppercase) |
| `transform(code, options, isDev)` | Transform a code string |
| `transformCode(code, id, options)` | Transform with file ID |
| `injectHmrIds(code, id)` | Inject `__hmrId` into `defineComponent()` calls |
| `analyzeElement(node)` | Analyze a JSX element for template extraction |
| `compileTemplate(element)` | Compile a static template |

## Examples

### Custom extensions

```ts
liteforge({
  extensions: ['.tsx', '.jsx'],
})
```

### Disable HMR

```ts
liteforge({
  hmr: false,
})
```

## Notes

- The plugin runs with `enforce: 'pre'` — it runs before other plugins.
- Node modules are never transformed (excluded by `isNodeModules()` check).
- If a file has no JSX, the plugin returns `null` (no transformation, no performance cost).
- The plugin generates source maps for transformed files.
