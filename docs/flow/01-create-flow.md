---
title: "createFlow"
category: "flow"
tags: ["flow", "createFlow", "node-editor", "graph", "FlowHandle"]
related: ["FlowCanvas", "Handle", "Edges"]
---

# createFlow

> Create a node-graph editor instance. Holds configuration (node types, edge types, interaction settings).

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```tsx
import { createFlow, FlowCanvas } from '@liteforge/flow'
import { signal } from '@liteforge/core'

// Define your node renderer
function TextNode(node) {
  return <div class="node">{node.data.label}</div>
}

// Create the flow configuration
const flow = createFlow({
  nodeTypes: { text: TextNode },
})

// Reactive state (fully controlled)
const nodes = signal([
  { id: '1', type: 'text', position: { x: 100, y: 100 }, data: { label: 'Hello' } },
  { id: '2', type: 'text', position: { x: 300, y: 100 }, data: { label: 'World' } },
])
const edges = signal([
  { id: 'e1', source: '1', sourceHandle: 'out', target: '2', targetHandle: 'in' },
])

// Render
<FlowCanvas
  flow={flow}
  nodes={() => nodes()}
  edges={() => edges()}
  onNodesChange={(changes) => nodes.set(applyNodeChanges(nodes(), changes))}
  onEdgesChange={(changes) => edges.set(applyEdgeChanges(edges(), changes))}
  onConnect={(conn) => edges.update(es => [...es, { id: `e${Date.now()}`, ...conn }])}
/>
```

## API Reference

### `createFlow(options)` → `FlowHandle`

**Options (`FlowOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `nodeTypes` | `Record<string, NodeComponentFn>` | required | Map of type name → node renderer |
| `edgeTypes` | `Record<string, EdgeComponentFn>` | — | Custom edge renderers |
| `connectionLineType` | `'bezier' \| 'step' \| 'straight'` | `'bezier'` | In-progress connection line style |
| `isValidConnection` | `(conn: Connection) => boolean` | — | Validate a connection before creating |
| `unstyled` | `boolean` | `false` | Skip default CSS injection |

**Returns (`FlowHandle`):**

| Property | Type | Description |
|----------|------|-------------|
| `options` | `Readonly<FlowOptions>` | The frozen options object |

### `NodeComponentFn<T>`

```ts
type NodeComponentFn<T = unknown> = (node: FlowNode<T>) => Node
```

Receives a `FlowNode` and returns a DOM `Node`.

### `FlowNode<T>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique node ID |
| `type` | `string` | Matches a key in `nodeTypes` |
| `position` | `Point` | `{ x, y }` canvas position |
| `data` | `T` | Custom node data |
| `selected` | `boolean?` | Selection state |
| `dragging` | `boolean?` | Drag state |

### `FlowEdge<T>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique edge ID |
| `source` | `string` | Source node ID |
| `sourceHandle` | `string` | Source handle ID |
| `target` | `string` | Target node ID |
| `targetHandle` | `string` | Target handle ID |
| `type` | `string?` | Edge type (matches `edgeTypes` key) |
| `data` | `T?` | Custom edge data |
| `selected` | `boolean?` | Selection state |

### `applyNodeChanges(nodes, changes)` → `FlowNode[]`

Pure helper — apply a `NodeChange[]` array to the nodes array and return updated nodes.

### `applyEdgeChanges(edges, changes)` → `FlowEdge[]`

Pure helper — apply an `EdgeChange[]` array to the edges array.

## Examples

### Custom node type

```tsx
function DecisionNode(node: FlowNode<{ question: string }>) {
  return (
    <div class="decision-node">
      <p>{node.data.question}</p>
    </div>
  )
}

const flow = createFlow({
  nodeTypes: { decision: DecisionNode },
})
```

### Validate connections

```ts
const flow = createFlow({
  nodeTypes: { ... },
  isValidConnection: (conn) => {
    // Prevent self-loops
    return conn.source !== conn.target
  },
})
```

## Notes

- `createFlow` only stores configuration. Nodes and edges are always passed as reactive props to `FlowCanvas`.
- The pattern is fully controlled: you own the state, `onNodesChange`/`onEdgesChange` emit change descriptors.
- Use `applyNodeChanges` and `applyEdgeChanges` to apply change descriptors to your state signals.
