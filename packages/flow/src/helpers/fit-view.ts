import type { FlowNode, Transform } from '../types.js'

export interface FitViewOptions {
  padding?: number
  minScale?: number
  maxScale?: number
}

/**
 * Compute the transform that fits all nodes into the viewport.
 * Returns identity transform if there are no nodes.
 */
export function computeFitView(
  nodes: FlowNode[],
  viewportWidth: number,
  viewportHeight: number,
  options?: FitViewOptions,
): Transform {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 }

  const padding = options?.padding ?? 40

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of nodes) {
    if (node.position.x < minX) minX = node.position.x
    if (node.position.y < minY) minY = node.position.y
    if (node.position.x > maxX) maxX = node.position.x
    if (node.position.y > maxY) maxY = node.position.y
  }

  const bbox = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }

  // Guard against degenerate cases (single node → zero bbox dimensions)
  const bboxW = bbox.width  > 0 ? bbox.width  : 1
  const bboxH = bbox.height > 0 ? bbox.height : 1

  const scaleX = viewportWidth  / bboxW
  const scaleY = viewportHeight / bboxH
  let scale = Math.min(scaleX, scaleY, options?.maxScale ?? 1.5)
  scale = Math.max(scale, options?.minScale ?? 0.1)

  const x = viewportWidth  / 2 - (bbox.x + bbox.width  / 2) * scale
  const y = viewportHeight / 2 - (bbox.y + bbox.height / 2) * scale

  return { x, y, scale }
}
