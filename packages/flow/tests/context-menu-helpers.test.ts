import { describe, it, expect, vi } from 'vitest'
import type { FlowNode, FlowEdge } from '../src/types.js'
import {
  createNodeContextMenu,
  createEdgeContextMenu,
  createPaneContextMenu,
} from '../src/helpers/context-menu-helpers.js'

// ---- Fixtures ----------------------------------------------------------------

function node(id = 'n1', x = 100, y = 200): FlowNode {
  return { id, type: 'default', position: { x, y }, data: { label: 'Test' } }
}

function edge(id = 'e1', label?: string): FlowEdge {
  return { id, source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in', label }
}

// =============================================================================
// createNodeContextMenu
// =============================================================================

describe('createNodeContextMenu', () => {
  it('returns empty array when no options provided', () => {
    expect(createNodeContextMenu({})).toEqual([])
  })

  it('returns empty array when all options are undefined', () => {
    expect(createNodeContextMenu({ onEdit: undefined, onDelete: undefined, onDuplicate: undefined })).toEqual([])
  })

  describe('onEdit', () => {
    it('adds an Edit Properties item', () => {
      const items = createNodeContextMenu({ onEdit: vi.fn() })
      expect(items).toHaveLength(1)
      expect(items[0].label).toBe('✏️ Edit Properties')
    })

    it('calls callback with the node on action', () => {
      const cb = vi.fn()
      const [item] = createNodeContextMenu({ onEdit: cb })
      const n = node()
      item.action(n)
      expect(cb).toHaveBeenCalledOnce()
      expect(cb).toHaveBeenCalledWith(n)
    })
  })

  describe('onDelete', () => {
    it('adds a Delete Node item', () => {
      const onNodesChange = vi.fn()
      const items = createNodeContextMenu({ onDelete: { onNodesChange } })
      expect(items).toHaveLength(1)
      expect(items[0].label).toBe('🗑 Delete Node')
    })

    it('calls onNodesChange with remove change', () => {
      const onNodesChange = vi.fn()
      const [item] = createNodeContextMenu({ onDelete: { onNodesChange } })
      item.action(node('abc'))
      expect(onNodesChange).toHaveBeenCalledWith([{ type: 'remove', id: 'abc' }])
    })

    it('calls onDeselect when provided', () => {
      const onNodesChange = vi.fn()
      const onDeselect = vi.fn()
      const [item] = createNodeContextMenu({ onDelete: { onNodesChange, onDeselect } })
      item.action(node('xyz'))
      expect(onDeselect).toHaveBeenCalledWith('xyz')
    })

    it('does not throw when onDeselect is absent', () => {
      const onNodesChange = vi.fn()
      const [item] = createNodeContextMenu({ onDelete: { onNodesChange } })
      expect(() => item.action(node())).not.toThrow()
    })
  })

  describe('onDuplicate', () => {
    it('adds a Duplicate Node item', () => {
      const onNodesChange = vi.fn()
      const nodes = vi.fn(() => [])
      const items = createNodeContextMenu({ onDuplicate: { nodes, onNodesChange } })
      expect(items).toHaveLength(1)
      expect(items[0].label).toBe('📋 Duplicate Node')
    })

    it('calls onNodesChange with add change at +40,+40 offset by default', () => {
      const onNodesChange = vi.fn()
      const nodesFn = vi.fn(() => [])
      const [item] = createNodeContextMenu({ onDuplicate: { nodes: nodesFn, onNodesChange } })
      const n = node('n1', 100, 200)
      item.action(n)
      expect(onNodesChange).toHaveBeenCalledOnce()
      const [changes] = onNodesChange.mock.calls[0] as [Array<{ type: string; node: FlowNode }>]
      expect(changes[0].type).toBe('add')
      expect(changes[0].node.position).toEqual({ x: 140, y: 240 })
      expect(changes[0].node.selected).toBe(false)
    })

    it('respects custom offset', () => {
      const onNodesChange = vi.fn()
      const [item] = createNodeContextMenu({
        onDuplicate: { nodes: () => [], onNodesChange, offset: { x: 80, y: 0 } },
      })
      item.action(node('n1', 50, 50))
      const [changes] = onNodesChange.mock.calls[0] as [Array<{ type: string; node: FlowNode }>]
      expect(changes[0].node.position).toEqual({ x: 130, y: 50 })
    })

    it('duplicate node gets a new unique id', () => {
      const onNodesChange = vi.fn()
      const [item] = createNodeContextMenu({ onDuplicate: { nodes: () => [], onNodesChange } })
      item.action(node('orig'))
      const [changes] = onNodesChange.mock.calls[0] as [Array<{ type: string; node: FlowNode }>]
      expect(changes[0].node.id).not.toBe('orig')
      expect(changes[0].node.id).toContain('orig')
    })
  })

  describe('custom items', () => {
    it('appends custom items after built-ins', () => {
      const onEdit = vi.fn()
      const customAction = vi.fn()
      const items = createNodeContextMenu({
        onEdit,
        custom: [{ label: 'My Action', action: customAction }],
      })
      expect(items).toHaveLength(2)
      expect(items[0].label).toBe('✏️ Edit Properties')
      expect(items[1].label).toBe('My Action')
    })

    it('custom items work standalone (no built-ins)', () => {
      const customAction = vi.fn()
      const items = createNodeContextMenu({
        custom: [{ label: 'Custom', action: customAction }],
      })
      expect(items).toHaveLength(1)
      const n = node()
      items[0].action(n)
      expect(customAction).toHaveBeenCalledWith(n)
    })
  })

  describe('item order', () => {
    it('order is edit → delete → duplicate → custom', () => {
      const items = createNodeContextMenu({
        onEdit:      vi.fn(),
        onDelete:    { onNodesChange: vi.fn() },
        onDuplicate: { nodes: () => [], onNodesChange: vi.fn() },
        custom:      [{ label: 'Extra', action: vi.fn() }],
      })
      expect(items.map(i => i.label)).toEqual([
        '✏️ Edit Properties',
        '🗑 Delete Node',
        '📋 Duplicate Node',
        'Extra',
      ])
    })
  })
})

// =============================================================================
// createEdgeContextMenu
// =============================================================================

describe('createEdgeContextMenu', () => {
  it('returns empty array when no options provided', () => {
    expect(createEdgeContextMenu({})).toEqual([])
  })

  describe('onDelete', () => {
    it('adds a Delete Edge item', () => {
      const items = createEdgeContextMenu({ onDelete: { onEdgesChange: vi.fn() } })
      expect(items).toHaveLength(1)
      expect(items[0].label).toBe('🗑 Delete Edge')
    })

    it('calls onEdgesChange with remove change', () => {
      const onEdgesChange = vi.fn()
      const [item] = createEdgeContextMenu({ onDelete: { onEdgesChange } })
      item.action(edge('e99'))
      expect(onEdgesChange).toHaveBeenCalledWith([{ type: 'remove', id: 'e99' }])
    })
  })

  describe('onEditLabel', () => {
    it('adds an Edit Label item', () => {
      const items = createEdgeContextMenu({
        onEditLabel: { onEditLabel: vi.fn(), prompt: () => 'x' },
      })
      expect(items).toHaveLength(1)
      expect(items[0].label).toBe('✏️ Edit Label')
    })

    it('calls onEditLabel with trimmed result', () => {
      const onEditLabel = vi.fn()
      const [item] = createEdgeContextMenu({
        onEditLabel: { onEditLabel, prompt: () => '  hello  ' },
      })
      item.action(edge())
      expect(onEditLabel).toHaveBeenCalledWith(expect.any(Object), 'hello')
    })

    it('passes current label to prompt', () => {
      const promptFn = vi.fn().mockReturnValue(null)
      const [item] = createEdgeContextMenu({
        onEditLabel: { onEditLabel: vi.fn(), prompt: promptFn },
      })
      item.action(edge('e1', 'existing label'))
      expect(promptFn).toHaveBeenCalledWith('existing label')
    })

    it('does nothing when prompt returns null (cancelled)', () => {
      const onEditLabel = vi.fn()
      const [item] = createEdgeContextMenu({
        onEditLabel: { onEditLabel, prompt: () => null },
      })
      item.action(edge())
      expect(onEditLabel).not.toHaveBeenCalled()
    })

    it('calls onEditLabel with empty string when prompt returns empty', () => {
      const onEditLabel = vi.fn()
      const [item] = createEdgeContextMenu({
        onEditLabel: { onEditLabel, prompt: () => '   ' },
      })
      item.action(edge())
      expect(onEditLabel).toHaveBeenCalledWith(expect.any(Object), '')
    })
  })

  describe('custom items', () => {
    it('appends custom items after built-ins', () => {
      const items = createEdgeContextMenu({
        onDelete: { onEdgesChange: vi.fn() },
        custom:   [{ label: 'Inspect', action: vi.fn() }],
      })
      expect(items).toHaveLength(2)
      expect(items[1].label).toBe('Inspect')
    })
  })

  describe('item order', () => {
    it('order is delete → editLabel → custom', () => {
      const items = createEdgeContextMenu({
        onDelete:    { onEdgesChange: vi.fn() },
        onEditLabel: { onEditLabel: vi.fn(), prompt: () => null },
        custom:      [{ label: 'Extra', action: vi.fn() }],
      })
      expect(items.map(i => i.label)).toEqual([
        '🗑 Delete Edge',
        '✏️ Edit Label',
        'Extra',
      ])
    })
  })
})

// =============================================================================
// createPaneContextMenu
// =============================================================================

describe('createPaneContextMenu', () => {
  it('returns empty array when items is empty', () => {
    expect(createPaneContextMenu({ items: [] })).toEqual([])
  })

  it('creates one item per entry', () => {
    const via = vi.fn()
    const items = createPaneContextMenu({
      items: [
        { label: '➕ Add Foo', nodeType: 'foo', data: () => ({ x: 1 }), via },
        { label: '➕ Add Bar', nodeType: 'bar', data: () => ({ y: 2 }), via },
      ],
    })
    expect(items).toHaveLength(2)
    expect(items[0].label).toBe('➕ Add Foo')
    expect(items[1].label).toBe('➕ Add Bar')
  })

  it('calls via with a node of the correct type', () => {
    const via = vi.fn()
    const [item] = createPaneContextMenu({
      items: [{ label: '➕ Add Foo', nodeType: 'foo', data: () => ({}), via }],
    })
    item.action({ x: 100, y: 200 })
    expect(via).toHaveBeenCalledOnce()
    const n: FlowNode = via.mock.calls[0][0]
    expect(n.type).toBe('foo')
  })

  it('snaps position to 20px grid by default', () => {
    const via = vi.fn()
    const [item] = createPaneContextMenu({
      items: [{ label: '➕ Add', nodeType: 'x', data: () => ({}), via }],
    })
    item.action({ x: 133, y: 47 })
    const n: FlowNode = via.mock.calls[0][0]
    expect(n.position).toEqual({ x: 140, y: 40 })
  })

  it('respects custom snap function', () => {
    const via = vi.fn()
    const [item] = createPaneContextMenu({
      items: [{ label: '➕ Add', nodeType: 'x', data: () => ({}), via, snap: (v) => Math.round(v / 10) * 10 }],
    })
    item.action({ x: 133, y: 47 })
    const n: FlowNode = via.mock.calls[0][0]
    expect(n.position).toEqual({ x: 130, y: 50 })
  })

  it('passes pos to data factory', () => {
    const dataFn = vi.fn().mockReturnValue({ label: 'Dynamic' })
    const via = vi.fn()
    const [item] = createPaneContextMenu({
      items: [{ label: '➕ Add', nodeType: 'x', data: dataFn, via }],
    })
    item.action({ x: 40, y: 80 })
    // data factory receives the original pos (before snap) — implementation uses snap on position only
    expect(dataFn).toHaveBeenCalledOnce()
    const n: FlowNode = via.mock.calls[0][0]
    expect(n.data).toEqual({ label: 'Dynamic' })
  })

  it('node id contains the nodeType', () => {
    const via = vi.fn()
    const [item] = createPaneContextMenu({
      items: [{ label: '➕ Add', nodeType: 'transform', data: () => ({}), via }],
    })
    item.action({ x: 0, y: 0 })
    const n: FlowNode = via.mock.calls[0][0]
    expect(n.id).toContain('transform')
  })

  it('appends custom items after node-add items', () => {
    const via = vi.fn()
    const customAction = vi.fn()
    const items = createPaneContextMenu({
      items: [{ label: '➕ Add', nodeType: 'x', data: () => ({}), via }],
      custom: [{ label: 'Reset View', action: customAction }],
    })
    expect(items).toHaveLength(2)
    expect(items[1].label).toBe('Reset View')
  })
})
