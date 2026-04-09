import { effect } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type { FlowNode, NodeComponentFn } from '../types.js'

// =============================================================================
// withNodeStatus — HOF that adds reactive execution-state CSS + output tooltip
//
// Wraps any NodeComponentFn (including defineNode output) to:
//   1. Apply a CSS class on the node element based on the current status
//   2. Set a `data-output` attribute on the lf-node-wrapper for hover tooltips
//
// User owns the signals — no global state in the framework.
//
// Usage:
//   const myNode = withNodeStatus(execStates, defineNode({ ... }), {
//     outputSignal: execOutputs,
//   })
// =============================================================================

/**
 * Execution status values for nodes.
 * Use these as values in the statusSignal Map.
 */
export type NodeExecStatus = 'idle' | 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface WithNodeStatusOptions {
  /**
   * Signal carrying a map of nodeId → output value.
   * When provided, sets `data-output` on the lf-node-wrapper for hover tooltips.
   */
  outputSignal?: Signal<Map<string, unknown>>
  /**
   * Custom CSS class resolver.
   * Defaults to: idle → '' (no class), otherwise `lf-node--{status}`
   */
  statusClass?: (status: NodeExecStatus) => string
  /**
   * Attribute name for the output tooltip.
   * Defaults to `'data-output'`
   */
  outputAttr?: string
  /**
   * CSS class prefix used when removing stale status classes.
   * Defaults to `'lf-node--'`
   */
  classPrefix?: string
}

const DEFAULT_STATUS_CLASS = (status: NodeExecStatus): string =>
  status === 'idle' ? '' : `lf-node--${status}`

function formatOutput(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') {
    const s = JSON.stringify(value)
    return s.length > 60 ? s.slice(0, 57) + '…' : s
  }
  return String(value)
}

/**
 * Wraps a NodeComponentFn to add reactive execution-state CSS classes
 * and an output tooltip attribute on the node wrapper element.
 *
 * ```ts
 * const myNode = withNodeStatus(execStates, defineNode({ ... }), {
 *   outputSignal: execOutputs,
 * })
 * ```
 */
export function withNodeStatus<T>(
  statusSignal: Signal<Map<string, NodeExecStatus>>,
  fn: NodeComponentFn<T>,
  opts: WithNodeStatusOptions = {},
): NodeComponentFn<T> {
  const {
    outputSignal,
    statusClass = DEFAULT_STATUS_CLASS,
    outputAttr  = 'data-output',
    classPrefix,
  } = opts

  return function statusWrapped(node: FlowNode<T>): Node {
    const el = fn(node) as HTMLElement

    // Derive class prefix from the first class on the element, or fall back to 'lf-node--'
    const resolvePrefix = (): string => {
      if (classPrefix) return classPrefix
      // Inspect the element's first class to match its naming convention
      const first = el.classList[0]
      if (first) {
        // e.g. 'lf-dn' → strip last segment → 'lf-' + 'node--' doesn't fit;
        // just use a sentinel that can't accidentally match: derive from statusClass
        const idle = statusClass('idle')
        if (idle !== '') {
          // User provided a custom statusClass — derive prefix from a known status
          const sample = statusClass('running')
          const idx = sample.lastIndexOf('running')
          return idx >= 0 ? sample.slice(0, idx) : 'lf-node--'
        }
        const sample = statusClass('running')
        const idx = sample.lastIndexOf('running')
        return idx >= 0 ? sample.slice(0, idx) : 'lf-node--'
      }
      return 'lf-node--'
    }

    const prefix = resolvePrefix()

    // 1. Reactive status class on the node element
    effect(() => {
      const status = statusSignal().get(node.id) ?? 'idle'
      el.classList.forEach(cls => {
        if (cls.startsWith(prefix)) el.classList.remove(cls)
      })
      const cls = statusClass(status)
      if (cls) el.classList.add(cls)
    })

    // 2. Output tooltip via data-* on the lf-node-wrapper (parent)
    if (outputSignal) {
      queueMicrotask(() => {
        const wrapper = el.parentElement
        if (!wrapper) return
        effect(() => {
          const raw    = outputSignal().get(node.id)
          const status = statusSignal().get(node.id) ?? 'idle'
          if (status === 'idle') {
            wrapper.removeAttribute(outputAttr)
            return
          }
          const text = formatOutput(raw)
          if (text) wrapper.setAttribute(outputAttr, text)
          else      wrapper.removeAttribute(outputAttr)
        })
      })
    }

    return el
  }
}
