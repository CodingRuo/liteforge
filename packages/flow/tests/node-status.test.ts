import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowNode, NodeComponentFn } from '../src/types.js'
import { withNodeStatus } from '../src/helpers/node-status.js'
import type { NodeExecStatus } from '../src/helpers/node-status.js'

// ---- Helpers ----------------------------------------------------------------

function makeNode(id = 'n1'): FlowNode {
  return { id, type: 'test', position: { x: 0, y: 0 }, data: {} }
}

/** A minimal NodeComponentFn that creates a real div. */
function makeRenderer(className = 'my-node'): NodeComponentFn {
  return (node: FlowNode) => {
    const el = document.createElement('div')
    el.className = className
    el.dataset.nodeId = node.id
    return el
  }
}

/** Wraps el in a parent div (simulating lf-node-wrapper) and returns both. */
function mountInWrapper(el: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'lf-node-wrapper'
  wrapper.appendChild(el)
  return wrapper
}

// Flush all microtasks (for queueMicrotask inside withNodeStatus)
async function flushMicrotasks() {
  await new Promise(r => queueMicrotask(r as () => void))
}

// ---- Fixtures ---------------------------------------------------------------

let execStates: ReturnType<typeof signal<Map<string, NodeExecStatus>>>

beforeEach(() => {
  execStates = signal<Map<string, NodeExecStatus>>(new Map())
})

// =============================================================================
// withNodeStatus — basic class management
// =============================================================================

describe('withNodeStatus — class management', () => {
  it('returns a NodeComponentFn', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    expect(typeof wrapped).toBe('function')
  })

  it('delegates rendering to the inner fn', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer('foo-node'))
    const el = wrapped(makeNode()) as HTMLElement
    expect(el.classList.contains('foo-node')).toBe(true)
  })

  it('adds no class when status is idle', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n1')) as HTMLElement
    execStates.set(new Map([['n1', 'idle']]))
    expect(el.className).toBe('my-node')
  })

  it('adds lf-node--running class when status is running', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n1')) as HTMLElement
    execStates.set(new Map([['n1', 'running']]))
    expect(el.classList.contains('lf-node--running')).toBe(true)
  })

  it('updates class reactively when status changes', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n1')) as HTMLElement

    execStates.set(new Map([['n1', 'running']]))
    expect(el.classList.contains('lf-node--running')).toBe(true)

    execStates.set(new Map([['n1', 'success']]))
    expect(el.classList.contains('lf-node--success')).toBe(true)
    expect(el.classList.contains('lf-node--running')).toBe(false)
  })

  it('removes class when status returns to idle', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n1')) as HTMLElement

    execStates.set(new Map([['n1', 'error']]))
    expect(el.classList.contains('lf-node--error')).toBe(true)

    execStates.set(new Map([['n1', 'idle']]))
    expect(el.classList.contains('lf-node--error')).toBe(false)
  })

  it('handles all status values', () => {
    const statuses: NodeExecStatus[] = ['pending', 'running', 'success', 'error', 'skipped']
    for (const status of statuses) {
      const wrapped = withNodeStatus(execStates, makeRenderer())
      const el = wrapped(makeNode('n1')) as HTMLElement
      execStates.set(new Map([['n1', status]]))
      expect(el.classList.contains(`lf-node--${status}`)).toBe(true)
    }
  })

  it('does not affect other nodes in the same map', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el1 = wrapped(makeNode('n1')) as HTMLElement
    const el2 = wrapped(makeNode('n2')) as HTMLElement

    execStates.set(new Map([['n1', 'running'], ['n2', 'idle']]))
    expect(el1.classList.contains('lf-node--running')).toBe(true)
    expect(el2.classList.contains('lf-node--running')).toBe(false)
  })

  it('treats missing entry as idle', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n99')) as HTMLElement
    // No entry for n99 in signal
    expect([...el.classList].some(c => c.startsWith('lf-node--'))).toBe(false)
  })
})

// =============================================================================
// withNodeStatus — custom statusClass
// =============================================================================

describe('withNodeStatus — custom statusClass', () => {
  it('uses custom class resolver', () => {
    const statusClass = (s: NodeExecStatus) => s === 'idle' ? '' : `pipe-node--${s}`
    const wrapped = withNodeStatus(execStates, makeRenderer(), { statusClass })
    const el = wrapped(makeNode('n1')) as HTMLElement
    execStates.set(new Map([['n1', 'running']]))
    expect(el.classList.contains('pipe-node--running')).toBe(true)
    expect(el.classList.contains('lf-node--running')).toBe(false)
  })

  it('cleans up custom prefix classes on status change', () => {
    const statusClass = (s: NodeExecStatus) => s === 'idle' ? '' : `pipe-node--${s}`
    const wrapped = withNodeStatus(execStates, makeRenderer(), { statusClass })
    const el = wrapped(makeNode('n1')) as HTMLElement

    execStates.set(new Map([['n1', 'running']]))
    execStates.set(new Map([['n1', 'success']]))
    expect(el.classList.contains('pipe-node--running')).toBe(false)
    expect(el.classList.contains('pipe-node--success')).toBe(true)
  })

  it('explicit classPrefix overrides derived prefix', () => {
    const statusClass = (s: NodeExecStatus) => s === 'idle' ? '' : `my-${s}`
    const wrapped = withNodeStatus(execStates, makeRenderer(), { statusClass, classPrefix: 'my-' })
    const el = wrapped(makeNode('n1')) as HTMLElement
    execStates.set(new Map([['n1', 'running']]))
    execStates.set(new Map([['n1', 'error']]))
    expect(el.classList.contains('my-running')).toBe(false)
    expect(el.classList.contains('my-error')).toBe(true)
  })
})

// =============================================================================
// withNodeStatus — output tooltip
// =============================================================================

describe('withNodeStatus — outputSignal / data-output', () => {
  it('sets data-output on wrapper when output present and not idle', async () => {
    const outputs = signal<Map<string, unknown>>(new Map())
    const wrapped = withNodeStatus(execStates, makeRenderer(), { outputSignal: outputs })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    outputs.set(new Map([['n1', { status: 200 }]]))
    await flushMicrotasks()

    expect(wrapper.getAttribute('data-output')).toContain('200')
  })

  it('removes data-output when status returns to idle', async () => {
    const outputs = signal<Map<string, unknown>>(new Map([['n1', 'ok']]))
    const wrapped = withNodeStatus(execStates, makeRenderer(), { outputSignal: outputs })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()
    expect(wrapper.hasAttribute('data-output')).toBe(true)

    execStates.set(new Map([['n1', 'idle']]))
    expect(wrapper.hasAttribute('data-output')).toBe(false)
  })

  it('truncates long JSON output to 60 chars', async () => {
    const longObj = { key: 'a'.repeat(100) }
    const outputs = signal<Map<string, unknown>>(new Map([['n1', longObj]]))
    const wrapped = withNodeStatus(execStates, makeRenderer(), { outputSignal: outputs })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()

    const attr = wrapper.getAttribute('data-output') ?? ''
    expect(attr.length).toBeLessThanOrEqual(60)
    expect(attr.endsWith('…')).toBe(true)
  })

  it('formats primitive output as string', async () => {
    const outputs = signal<Map<string, unknown>>(new Map([['n1', 42]]))
    const wrapped = withNodeStatus(execStates, makeRenderer(), { outputSignal: outputs })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()
    expect(wrapper.getAttribute('data-output')).toBe('42')
  })

  it('does not set data-output when output is undefined', async () => {
    const outputs = signal<Map<string, unknown>>(new Map())
    const wrapped = withNodeStatus(execStates, makeRenderer(), { outputSignal: outputs })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()
    expect(wrapper.hasAttribute('data-output')).toBe(false)
  })

  it('uses custom outputAttr name', async () => {
    const outputs = signal<Map<string, unknown>>(new Map([['n1', 'hello']]))
    const wrapped = withNodeStatus(execStates, makeRenderer(), {
      outputSignal: outputs,
      outputAttr: 'data-result',
    })
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()
    expect(wrapper.getAttribute('data-result')).toBe('hello')
    expect(wrapper.hasAttribute('data-output')).toBe(false)
  })

  it('does nothing when outputSignal not provided', async () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el = wrapped(makeNode('n1')) as HTMLElement
    const wrapper = mountInWrapper(el)

    execStates.set(new Map([['n1', 'success']]))
    await flushMicrotasks()
    expect(wrapper.hasAttribute('data-output')).toBe(false)
  })
})

// =============================================================================
// withNodeStatus — composition with defineNode
// =============================================================================

describe('withNodeStatus — composability', () => {
  it('works when inner fn is called multiple times (multiple node instances)', () => {
    const wrapped = withNodeStatus(execStates, makeRenderer())
    const el1 = wrapped(makeNode('n1')) as HTMLElement
    const el2 = wrapped(makeNode('n2')) as HTMLElement

    execStates.set(new Map([['n1', 'error'], ['n2', 'success']]))
    expect(el1.classList.contains('lf-node--error')).toBe(true)
    expect(el2.classList.contains('lf-node--success')).toBe(true)
  })

  it('inner fn is called once per invocation', () => {
    const innerFn = vi.fn(makeRenderer())
    const wrapped = withNodeStatus(execStates, innerFn as NodeComponentFn)
    wrapped(makeNode('n1'))
    wrapped(makeNode('n2'))
    expect(innerFn).toHaveBeenCalledTimes(2)
  })
})
