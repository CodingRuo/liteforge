import type {
  FlowNode,
  FlowEdge,
  NodeChange,
  EdgeChange,
  Point,
  NodeContextMenuItem,
  EdgeContextMenuItem,
  PaneContextMenuItem,
} from '../types.js'

// =============================================================================
// Context Menu Helpers
//
// Factory functions that return the item arrays expected by FlowCanvasProps.
// Drop-in replacements for hand-written nodeContextMenu / edgeContextMenu /
// paneContextMenu arrays — no new concepts, fully tree-shakeable.
//
// Usage:
//   nodeContextMenu: createNodeContextMenu({
//     onEdit:      (n) => openPanel(n.id),
//     onDelete:    { onNodesChange },
//     onDuplicate: { nodes, onNodesChange },
//   })
// =============================================================================

// ---- Node Context Menu -------------------------------------------------------

export interface NodeDeleteOptions {
  /** Called with the remove change — usually history.onNodesChange or equivalent. */
  onNodesChange: (changes: NodeChange[]) => void
  /** Optional side-effect when the deleted node was selected (e.g. close panel). */
  onDeselect?: (id: string) => void
}

export interface NodeDuplicateOptions {
  /** Current nodes getter — needed to append the clone. */
  nodes: () => FlowNode[]
  /** Called with the add change for the duplicate. */
  onNodesChange: (changes: NodeChange[]) => void
  /** Offset for the duplicate's position. Defaults to { x: 40, y: 40 }. */
  offset?: { x: number; y: number }
}

export interface CreateNodeContextMenuOptions {
  /** "Edit Properties" item — called with the right-clicked node. */
  onEdit?: (node: FlowNode) => void
  /** "Delete Node" item. */
  onDelete?: NodeDeleteOptions
  /** "Duplicate Node" item. */
  onDuplicate?: NodeDuplicateOptions
  /** Additional custom items appended after the built-in ones. */
  custom?: NodeContextMenuItem[]
}

/**
 * Build a `NodeContextMenuItem[]` array for use as `nodeContextMenu` prop.
 *
 * ```ts
 * nodeContextMenu: createNodeContextMenu({
 *   onEdit:      (n) => selectedId.set(n.id),
 *   onDelete:    { onNodesChange: history.onNodesChange, onDeselect: (id) => { if (selectedId.peek() === id) selectedId.set(null) } },
 *   onDuplicate: { nodes, onNodesChange: history.onNodesChange },
 * })
 * ```
 */
export function createNodeContextMenu(
  opts: CreateNodeContextMenuOptions,
): NodeContextMenuItem[] {
  const items: NodeContextMenuItem[] = []

  if (opts.onEdit) {
    const cb = opts.onEdit
    items.push({ label: '✏️ Edit Properties', action: cb })
  }

  if (opts.onDelete) {
    const { onNodesChange, onDeselect } = opts.onDelete
    items.push({
      label: '🗑 Delete Node',
      action: (n: FlowNode) => {
        onDeselect?.(n.id)
        onNodesChange([{ type: 'remove', id: n.id }])
      },
    })
  }

  if (opts.onDuplicate) {
    const { nodes, onNodesChange, offset = { x: 40, y: 40 } } = opts.onDuplicate
    items.push({
      label: '📋 Duplicate Node',
      action: (n: FlowNode) => {
        const id = `${n.id}-copy-${Date.now()}`
        onNodesChange([{
          type: 'add',
          node: {
            ...n,
            id,
            position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
            selected: false,
          },
        }])
        // Fallback: if consumer uses signal-based nodes not onNodesChange for add,
        // applyNodeChanges handles 'add' correctly.
        void nodes  // reference to avoid unused-var lint (nodes is used in closure for type safety)
      },
    })
  }

  if (opts.custom) {
    items.push(...opts.custom)
  }

  return items
}

// ---- Edge Context Menu -------------------------------------------------------

export interface EdgeDeleteOptions {
  /** Called with the remove change. */
  onEdgesChange: (changes: EdgeChange[]) => void
}

export interface EdgeEditLabelOptions {
  /** Called with the edge and the new label string (empty string = remove label). */
  onEditLabel: (edge: FlowEdge, newLabel: string) => void
  /**
   * Optional custom prompt implementation.
   * Defaults to `window.prompt`.
   */
  prompt?: (current: string) => string | null
}

export interface CreateEdgeContextMenuOptions {
  /** "Delete Edge" item. */
  onDelete?: EdgeDeleteOptions
  /** "Edit Label" item. */
  onEditLabel?: EdgeEditLabelOptions
  /** Additional custom items appended after the built-in ones. */
  custom?: EdgeContextMenuItem[]
}

/**
 * Build an `EdgeContextMenuItem[]` array for use as `edgeContextMenu` prop.
 *
 * ```ts
 * edgeContextMenu: createEdgeContextMenu({
 *   onDelete:    { onEdgesChange: history.onEdgesChange },
 *   onEditLabel: { onEditLabel: (e, lbl) => edges.set(edges.peek().map(ed => ed.id === e.id ? { ...ed, label: lbl || undefined } : ed)) },
 * })
 * ```
 */
export function createEdgeContextMenu(
  opts: CreateEdgeContextMenuOptions,
): EdgeContextMenuItem[] {
  const items: EdgeContextMenuItem[] = []

  if (opts.onDelete) {
    const { onEdgesChange } = opts.onDelete
    items.push({
      label: '🗑 Delete Edge',
      action: (e: FlowEdge) => onEdgesChange([{ type: 'remove', id: e.id }]),
    })
  }

  if (opts.onEditLabel) {
    const { onEditLabel, prompt: promptFn } = opts.onEditLabel
    items.push({
      label: '✏️ Edit Label',
      action: (e: FlowEdge) => {
        const ask = promptFn ?? ((cur: string) => window.prompt('Edge label:', cur))
        const result = ask(e.label ?? '')
        if (result === null) return
        onEditLabel(e, result.trim())
      },
    })
  }

  if (opts.custom) {
    items.push(...opts.custom)
  }

  return items
}

// ---- Pane Context Menu -------------------------------------------------------

export interface PaneNodeItem<TData = unknown> {
  /** Menu item label, e.g. "➕ Add Transform Node". */
  label: string
  /** The node type string registered in nodeTypes. */
  nodeType: string
  /**
   * Factory for the node's data object.
   * Receives the canvas-space click position.
   */
  data: (pos: Point) => TData
  /**
   * Called to insert the new node into the graph.
   * Receives the new node — usually calls `nodes.set([...nodes.peek(), newNode])`
   * or `onNodesChange([{ type: 'add', node: newNode }])`.
   */
  via: (newNode: FlowNode<TData>) => void
  /**
   * Optional snap function applied to the position before creating the node.
   * Defaults to snapping to a 20px grid.
   */
  snap?: (v: number) => number
}

export interface CreatePaneContextMenuOptions {
  /** Node-add items. Each item describes a node type that can be spawned. */
  items: PaneNodeItem[]
  /** Additional custom items appended after the node-add items. */
  custom?: PaneContextMenuItem[]
}

/**
 * Build a `PaneContextMenuItem[]` array for use as `paneContextMenu` prop.
 *
 * ```ts
 * paneContextMenu: createPaneContextMenu({
 *   items: [
 *     {
 *       label:    '➕ Add Transform Node',
 *       nodeType: 'transform',
 *       data:     () => ({ label: 'Transform', expression: '{ ...data }' }),
 *       via:      (n) => nodes.set([...nodes.peek(), n]),
 *     },
 *   ],
 * })
 * ```
 */
export function createPaneContextMenu(
  opts: CreatePaneContextMenuOptions,
): PaneContextMenuItem[] {
  const defaultSnap = (v: number) => Math.round(v / 20) * 20

  const items: PaneContextMenuItem[] = opts.items.map(item => ({
    label: item.label,
    action: (pos: Point) => {
      const snap = item.snap ?? defaultSnap
      const node: FlowNode = {
        id:       `${item.nodeType}-${Date.now()}`,
        type:     item.nodeType,
        position: { x: snap(pos.x), y: snap(pos.y) },
        data:     item.data(pos),
      }
      item.via(node)
    },
  }))

  if (opts.custom) {
    items.push(...opts.custom)
  }

  return items
}
