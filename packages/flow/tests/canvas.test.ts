import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearContext } from '@liteforge/runtime'
import { createFlow, FlowCanvas } from '../src/index.js'
import type { FlowNode, FlowEdge } from '../src/types.js'

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('FlowCanvas', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)
    clearContext()
  })

  afterEach(() => {
    container.remove()
    clearContext()
  })

  it('renders the expected DOM structure', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    expect(root.classList.contains('lf-flow-root')).toBe(true)
    expect(root.querySelector('.lf-transform-layer')).not.toBeNull()
    expect(root.querySelector('.lf-edges-layer')).not.toBeNull()
    expect(root.querySelector('.lf-nodes-layer')).not.toBeNull()
  })

  it('applies default viewport transform', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
      defaultViewport: { x: 50, y: 30, scale: 1.5 },
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(50px,30px)')
    expect(layer.style.transform).toContain('scale(1.5)')
  })

  it('applies identity transform by default', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(0px,0px)')
    expect(layer.style.transform).toContain('scale(1)')
  })
})

describe('createFlow', () => {
  it('returns a FlowHandle with options', () => {
    const nodeTypes = { custom: () => document.createElement('div') }
    const flow = createFlow({ nodeTypes })
    expect(flow.options.nodeTypes).toBe(nodeTypes)
  })

  it('options are frozen (immutable)', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(Object.isFrozen(flow.options)).toBe(true)
  })

  it('defaults connectionLineType', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(flow.options.connectionLineType).toBeUndefined()
  })
})
