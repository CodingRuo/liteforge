---
title: "Edges"
category: "flow"
tags: ["edges", "EdgeLayer", "bezier", "step", "straight", "path", "EdgeComponentFn"]
related: ["createFlow", "FlowCanvas", "Handle"]
---

# Edges

> Custom edge renderers, path generators, and the edge layer component.

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```ts
import { createFlow, getBezierPath } from '@liteforge/flow'

// Custom edge renderer
function CustomEdge(edge, source, target, sourcePos, targetPos) {
  const [path] = getBezierPath({ source, target, sourcePos, targetPos })
  return `<path d="${path}" stroke="red" stroke-width="2" fill="none" />`
}

const flow = createFlow({
  nodeTypes: { ... },
  edgeTypes: { custom: CustomEdge },
})
```

## API Reference

### `EdgeComponentFn<T>`

```ts
type EdgeComponentFn<T = unknown> = (
  edge: FlowEdge<T>,
  source: Point,
  target: Point,
  sourcePosition: HandlePosition,
  targetPosition: HandlePosition,
) => string
```

Returns an SVG string (inner content of an `<svg>` element).

### Path generators

#### `getBezierPath(options)` → `[path: string, labelX: number, labelY: number]`

| Option | Type | Description |
|--------|------|-------------|
| `source` | `Point` | Source point `{ x, y }` |
| `target` | `Point` | Target point `{ x, y }` |
| `sourcePos` | `HandlePosition` | Source handle position |
| `targetPos` | `HandlePosition` | Target handle position |
| `curvature` | `number?` | Bezier curvature (default: 0.25) |

#### `getStepPath(options)` → `[path: string, labelX: number, labelY: number]`

Generates a step (right-angle) path.

| Option | Type | Description |
|--------|------|-------------|
| `source` | `Point` | Source point |
| `target` | `Point` | Target point |
| `sourcePos` | `HandlePosition` | Source handle position |
| `targetPos` | `HandlePosition` | Target handle position |
| `borderRadius` | `number?` | Corner radius |
| `offset` | `number?` | Step offset |

#### `getStraightPath(options)` → `[path: string, labelX: number, labelY: number]`

Generates a straight line path.

| Option | Type | Description |
|--------|------|-------------|
| `source` | `Point` | Source point |
| `target` | `Point` | Target point |

### `createEdgeLayer(options?)` → `EdgeLayerHandle`

Advanced: manually manage the edge SVG layer. Normally `FlowCanvas` handles this internally.

**Returns (`EdgeLayerHandle`):**

| Property | Type | Description |
|----------|------|-------------|
| `el` | `SVGElement` | The SVG element |

### Geometry utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `rectsOverlap` | `(a: Rect, b: Rect) => boolean` | AABB overlap test |
| `rectFromPoints` | `(points: Point[]) => Rect` | Bounding rect from points |

## Examples

### Animated edge

```ts
function AnimatedEdge(edge, source, target, sourcePos, targetPos) {
  const [path] = getBezierPath({ source, target, sourcePos, targetPos })
  return `
    <path d="${path}" stroke="#555" stroke-width="2" fill="none"
          stroke-dasharray="5" >
      <animate attributeName="stroke-dashoffset" values="10;0" dur="1s" repeatCount="indefinite" />
    </path>
  `
}
```

### Step path

```ts
function StepEdge(edge, source, target, sourcePos, targetPos) {
  const [path] = getStepPath({ source, target, sourcePos, targetPos, borderRadius: 8 })
  return `<path d="${path}" stroke="#999" stroke-width="1.5" fill="none" />`
}
```

## Notes

- Edge renderers return SVG strings (not DOM nodes). The `createEdgeLayer` assembles them into a single `<svg>`.
- The default edge type is bezier. To use a different default, pass `connectionLineType` to `createFlow()`.
- Path generators return a tuple: `[pathD, labelX, labelY]` — use `labelX`/`labelY` to position edge labels.
