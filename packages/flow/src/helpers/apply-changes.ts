import type { FlowNode, FlowEdge, NodeChange, EdgeChange } from '../types.js'

/**
 * Apply a list of NodeChanges to a nodes array, returning a new array.
 * Nodes not referenced in any change pass through unchanged.
 */
export function applyNodeChanges<T>(
  changes: NodeChange[],
  nodes: FlowNode<T>[],
): FlowNode<T>[] {
  if (changes.length === 0) return nodes

  // Build a quick lookup for changes by id
  const byId = new Map<string, NodeChange>()
  for (const change of changes) {
    byId.set(change.id, change)
  }

  const result: FlowNode<T>[] = []
  for (const node of nodes) {
    const change = byId.get(node.id)
    if (!change) {
      result.push(node)
      continue
    }
    if (change.type === 'remove') {
      // omit
      continue
    }
    if (change.type === 'position') {
      result.push({ ...node, position: change.position })
    } else if (change.type === 'select') {
      result.push({ ...node, selected: change.selected })
    } else {
      result.push(node)
    }
  }
  return result
}

/**
 * Apply a list of EdgeChanges to an edges array, returning a new array.
 * Edges not referenced in any change pass through unchanged.
 */
export function applyEdgeChanges<T>(
  changes: EdgeChange[],
  edges: FlowEdge<T>[],
): FlowEdge<T>[] {
  if (changes.length === 0) return edges

  const byId = new Map<string, EdgeChange>()
  for (const change of changes) {
    byId.set(change.id, change)
  }

  const result: FlowEdge<T>[] = []
  for (const edge of edges) {
    const change = byId.get(edge.id)
    if (!change) {
      result.push(edge)
      continue
    }
    if (change.type === 'remove') {
      // omit
      continue
    }
    if (change.type === 'select') {
      result.push({ ...edge, selected: change.selected })
    } else {
      result.push(edge)
    }
  }
  return result
}
