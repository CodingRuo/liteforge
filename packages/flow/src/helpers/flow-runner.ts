import type { FlowNode, FlowEdge } from '../types.js'

// =============================================================================
// createFlowRunner — generic graph-traversal execution engine
//
// The runner owns the traversal skeleton (visited set, state machine, delay,
// flush, markSkipped, branch handling). Callers inject per-node execute()
// functions that contain the actual business logic.
//
// Usage:
//   const runner = createFlowRunner({
//     executors: {
//       trigger: async ({ data, log }) => { log('fired'); return { user: data.username } },
//       http:    async ({ data, payload }) => fetch(data.url).then(r => r.json()),
//     },
//     onFlush: (state) => { statusSignal.set(new Map(state.nodeStates)); ... },
//     delay: { beforeNode: 300, afterNode: 200 },
//   })
//   await runner.run(triggerNode, nodes, edges)
// =============================================================================

// NodeExecStatus is shared with withNodeStatus — import from node-status
export type { NodeExecStatus } from './node-status.js'
import type { NodeExecStatus } from './node-status.js'

/** State snapshot passed to onFlush — caller decides which signals to update. */
export interface FlowRunnerState {
  readonly nodeStates:  ReadonlyMap<string, NodeExecStatus>
  readonly nodeOutputs: ReadonlyMap<string, unknown>
  readonly nodeErrors:  ReadonlyMap<string, string>
  readonly log:         readonly string[]
}

/** Context passed to each execute() function. */
export interface ExecuteContext<TData = unknown> {
  /** The node's data object. */
  data: TData
  /** Output from the previous node (or null for trigger). */
  payload: unknown
  /** Append a message to the execution log. */
  log: (msg: string) => void
}

/**
 * Return value from execute().
 * - Return `{ output, outHandle }` to control which edge handle to follow.
 * - Return `{ output }` or just a value to follow the default handle ('out').
 * - Return `{ output, skipHandles }` to mark certain outgoing branches as skipped.
 */
export interface ExecuteResult {
  output:       unknown
  /** Which sourceHandle to follow for downstream edges. Defaults to 'out'. */
  outHandle?:   string
  /** Source handles whose downstream nodes should be marked skipped. */
  skipHandles?: string[]
}

export type ExecuteFn<TData = unknown> =
  (ctx: ExecuteContext<TData>) => Promise<ExecuteResult | unknown> | ExecuteResult | unknown

export interface FlowRunnerOptions {
  /**
   * Map of node type → execute function.
   * Types not present fall through with `output = payload` (passthrough).
   */
  executors: Record<string, ExecuteFn>
  /**
   * Called after every state change — update your signals here.
   */
  onFlush: (state: FlowRunnerState) => void
  delay?: {
    /** ms to wait after marking a node 'running', before calling execute(). @default 300 */
    beforeNode?: number
    /** ms to wait after marking a node 'success', before following edges. @default 200 */
    afterNode?:  number
  }
}

export interface FlowRunnerHandle {
  /**
   * Execute the graph starting from `startNode`.
   * Returns when all reachable nodes have completed (or errored/skipped).
   */
  run(
    startNode: FlowNode,
    nodes:     FlowNode[],
    edges:     FlowEdge[],
  ): Promise<FlowRunnerState>
}

// ---- Internal mutable state (per run) ---------------------------------------

interface MutableRunState {
  nodeStates:  Map<string, NodeExecStatus>
  nodeOutputs: Map<string, unknown>
  nodeErrors:  Map<string, string>
  log:         string[]
}

function toReadonly(s: MutableRunState): FlowRunnerState {
  return {
    nodeStates:  s.nodeStates,
    nodeOutputs: s.nodeOutputs,
    nodeErrors:  s.nodeErrors,
    log:         s.log,
  }
}

function normalizeResult(raw: ExecuteResult | unknown): ExecuteResult {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'output' in (raw as object) &&
    Object.keys(raw as object).some(k => ['output', 'outHandle', 'skipHandles'].includes(k))
  ) {
    return raw as ExecuteResult
  }
  return { output: raw }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ---- markSkipped ------------------------------------------------------------

function markSkipped(
  nodeId:   string,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  state:    MutableRunState,
  visited:  Set<string>,
): void {
  if (visited.has(nodeId)) return
  visited.add(nodeId)
  const current = state.nodeStates.get(nodeId)
  // Only mark skipped if not yet executed (pending = hasn't started, undefined = unknown node)
  if (current === 'pending' || current === undefined) {
    state.nodeStates.set(nodeId, 'skipped')
  }
  const outgoing = allEdges.filter(e => e.source === nodeId)
  for (const e of outgoing) markSkipped(e.target, allNodes, allEdges, state, visited)
}

// =============================================================================

export function createFlowRunner(opts: FlowRunnerOptions): FlowRunnerHandle {
  const delayBefore = opts.delay?.beforeNode ?? 300
  const delayAfter  = opts.delay?.afterNode  ?? 200

  async function executeNode(
    nodeId:   string,
    payload:  unknown,
    allNodes: FlowNode[],
    allEdges: FlowEdge[],
    state:    MutableRunState,
    visited:  Set<string>,
  ): Promise<void> {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = allNodes.find(n => n.id === nodeId)
    if (!node) return

    state.nodeStates.set(nodeId, 'running')
    opts.onFlush(toReadonly(state))
    if (delayBefore > 0) await sleep(delayBefore)

    const executeFn = opts.executors[node.type]
    let result: ExecuteResult

    try {
      const ctx: ExecuteContext = {
        data:    node.data,
        payload,
        log: (msg) => state.log.push(msg),
      }

      if (executeFn) {
        const raw = await executeFn(ctx)
        result = normalizeResult(raw)
      } else {
        // Passthrough for unknown node types
        result = { output: payload }
      }

      state.nodeStates.set(nodeId, 'success')
      state.nodeOutputs.set(nodeId, result.output)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      state.nodeStates.set(nodeId, 'error')
      state.nodeErrors.set(nodeId, msg)
      state.nodeOutputs.set(nodeId, msg)
      state.log.push(`   ✗ Error: ${msg}`)
      opts.onFlush(toReadonly(state))
      return
    }

    // Mark skipped handles before flushing
    if (result.skipHandles?.length) {
      for (const handle of result.skipHandles) {
        const skipEdges = allEdges.filter(e => e.source === nodeId && e.sourceHandle === handle)
        for (const e of skipEdges) markSkipped(e.target, allNodes, allEdges, state, new Set(visited))
      }
    }

    opts.onFlush(toReadonly(state))
    if (delayAfter > 0) await sleep(delayAfter)

    const outHandle = result.outHandle ?? 'out'
    const outgoing  = allEdges.filter(e => e.source === nodeId && e.sourceHandle === outHandle)
    await Promise.all(outgoing.map(e =>
      executeNode(e.target, result.output, allNodes, allEdges, state, visited),
    ))
  }

  return {
    async run(startNode, nodes, edges) {
      // Mark all nodes pending before starting
      const state: MutableRunState = {
        nodeStates:  new Map(nodes.map(n => [n.id, 'pending' as NodeExecStatus])),
        nodeOutputs: new Map(),
        nodeErrors:  new Map(),
        log:         [],
      }
      opts.onFlush(toReadonly(state))

      await executeNode(startNode.id, null, nodes, edges, state, new Set())

      return toReadonly(state)
    },
  }
}
