---
title: "FlowCanvas"
category: "flow"
tags: ["FlowCanvas", "canvas", "pan", "zoom", "minimap", "controls", "fitView"]
related: ["createFlow", "Handle", "Edges"]
---

# FlowCanvas

> The main canvas component that renders nodes, edges, handles, and manages pan/zoom interactions.

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```tsx
import { FlowCanvas, createFlow, applyNodeChanges, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const flow = createFlow({ nodeTypes: { default: MyNode } })
const nodes = signal<FlowNode[]>([...])
const edges = signal<FlowEdge[]>([...])

<FlowCanvas
  flow={flow}
  nodes={() => nodes()}
  edges={() => edges()}
  onNodesChange={(changes) => nodes.set(applyNodeChanges(nodes(), changes))}
  onEdgesChange={(changes) => edges.set(applyEdgeChanges(edges(), changes))}
  onConnect={(conn) => edges.update(es => [...es, { id: `e${Date.now()}`, ...conn }])}
  minZoom={0.1}
  maxZoom={4}
  defaultViewport={{ x: 0, y: 0, scale: 1 }}
/>
```

## API Reference

### `FlowCanvas(props: FlowCanvasProps)` → `Node`

**Props (`FlowCanvasProps`):**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flow` | `FlowHandle` | required | Flow instance from `createFlow()` |
| `nodes` | `() => FlowNode[]` | required | Reactive node array |
| `edges` | `() => FlowEdge[]` | required | Reactive edge array |
| `onNodesChange` | `(changes: NodeChange[]) => void` | — | Called when nodes are dragged, selected, or removed |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | — | Called when edges are selected or removed |
| `onConnect` | `(connection: Connection) => void` | — | Called when a new connection is drawn |
| `minZoom` | `number` | `0.1` | Minimum zoom scale |
| `maxZoom` | `number` | `4` | Maximum zoom scale |
| `defaultViewport` | `Transform` | `{ x: 0, y: 0, scale: 1 }` | Initial viewport |

### `NodeChange`

```ts
type NodeChange =
  | { type: 'position'; id: string; position: Point }
  | { type: 'select';   id: string; selected: boolean }
  | { type: 'remove';   id: string }
```

### `EdgeChange`

```ts
type EdgeChange =
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
```

### `Connection`

```ts
interface Connection {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}
```

### `Transform`

```ts
interface Transform { x: number; y: number; scale: number }
```

### `createControls()` → `ControlsHandle`

Renders zoom in/out/fit controls. Place inside `FlowCanvas`.

### `createMiniMap()` → `MiniMapHandle`

Renders a minimap overview. Place inside or alongside `FlowCanvas`.

### `computeFitView(nodes, options?)` → `Transform`

Calculate a `Transform` that fits all nodes in view.

**`FitViewOptions`:**

| Option | Type | Description |
|--------|------|-------------|
| `padding` | `number` | Padding around nodes (default: 0.1) |
| `minZoom` | `number` | Minimum allowed zoom |
| `maxZoom` | `number` | Maximum allowed zoom |

### Coordinate utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `screenToCanvas` | `(point, transform) => Point` | Convert screen coordinates to canvas |
| `canvasToScreen` | `(point, transform) => Point` | Convert canvas to screen |

## Examples

### With controls and minimap

```tsx
import { FlowCanvas, createControls, createMiniMap } from '@liteforge/flow'

const controls = createControls()
const minimap = createMiniMap()

<div class="flow-wrapper">
  <FlowCanvas flow={flow} nodes={() => nodes()} edges={() => edges()} ...>
  </FlowCanvas>
  {controls.Root()}
  {minimap.Root()}
</div>
```

### Fit view on load

```ts
import { computeFitView } from '@liteforge/flow'

const transform = computeFitView(nodes(), { padding: 0.2 })
// Apply transform to viewport
```

## Notes

- `FlowCanvas` is the only required rendering component. Controls and minimap are optional.
- Nodes are rendered using the `nodeTypes` renderers passed to `createFlow()`.
- The canvas intercepts pointer events for drag, pan, zoom, and connection drawing. Do not stop propagation in node renderers unless absolutely necessary.
