---
title: "Handle"
category: "flow"
tags: ["handle", "createHandle", "source", "target", "connection", "port"]
related: ["createFlow", "FlowCanvas", "Edges"]
---

# Handle

> Connection ports on flow nodes. Use `createHandle` inside node type renderers to add source/target handles.

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```tsx
import { createHandle, getFlowContext } from '@liteforge/flow'

function MyNode(node) {
  // createHandle must be called inside a node renderer that is rendered by FlowCanvas
  const inputHandle = createHandle({ type: 'target', position: 'left', id: 'in' })
  const outputHandle = createHandle({ type: 'source', position: 'right', id: 'out' })

  return (
    <div class="node">
      {inputHandle.el}
      <span>{node.data.label}</span>
      {outputHandle.el}
    </div>
  )
}
```

## API Reference

### `createHandle(options)` → `HandleHandle`

Creates a handle DOM element that participates in the flow's connection system.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'source' \| 'target'` | required | Handle type |
| `position` | `HandlePosition` | required | `'top' \| 'right' \| 'bottom' \| 'left'` |
| `id` | `string` | — | Handle ID (used in edge `sourceHandle`/`targetHandle`) |
| `isConnectable` | `boolean` | `true` | Whether connections can be made |
| `isConnected` | `() => boolean` | — | Reactive connected state |

**Returns (`HandleHandle`):**

| Property | Type | Description |
|----------|------|-------------|
| `el` | `Element` | The handle DOM element to insert in your node |

### `getFlowContext()` → `FlowContext`

Access the flow context inside a node renderer. Provides access to the flow's current state, transform, and interaction methods.

**`HandlePosition`:**

```ts
type HandlePosition = 'top' | 'right' | 'bottom' | 'left'
```

**`HandleType`:**

```ts
type HandleType = 'source' | 'target'
```

## Examples

### Node with multiple handles

```tsx
function DataProcessorNode(node: FlowNode<{ name: string }>) {
  const input1 = createHandle({ type: 'target', position: 'left', id: 'input1' })
  const input2 = createHandle({ type: 'target', position: 'left', id: 'input2' })
  const output = createHandle({ type: 'source', position: 'right', id: 'output' })

  return (
    <div class="processor-node">
      {input1.el}
      {input2.el}
      <span>{node.data.name}</span>
      {output.el}
    </div>
  )
}
```

### Conditional connectivity

```tsx
function ConditionalNode(node) {
  const isActive = signal(true)

  const handle = createHandle({
    type: 'source',
    position: 'right',
    id: 'out',
    isConnectable: true,
    isConnected: () => node.data.connected,
  })

  return <div>{handle.el}<span>{node.data.label}</span></div>
}
```

## Notes

- `createHandle` must be called inside a node type renderer function that is being rendered by `FlowCanvas`.
- The `id` you assign to a handle must match the `sourceHandle` / `targetHandle` fields on `FlowEdge`.
- `getFlowContext()` is available inside any node renderer for advanced use cases (e.g. programmatic connection).
