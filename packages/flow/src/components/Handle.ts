import type { FlowContextValue } from '../context.js'
import type { HandleType, HandlePosition, Point } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'

export interface HandleHandle {
  el:      HTMLDivElement
  dispose: () => void
}

/**
 * Creates a handle element — the dot on a node where edges connect.
 *
 * The element is NOT appended to the DOM here; the caller (node content) is
 * responsible for insertion. Measurement is deferred via queueMicrotask so
 * that layout has settled by the time getBoundingClientRect() is called.
 */
export function createHandle(
  nodeId:        string,
  handleId:      string,
  type:          HandleType,
  position:      HandlePosition,
  ctx:           FlowContextValue,
  nodeWrapperEl: HTMLElement,
): HandleHandle {
  const handleEl = document.createElement('div')
  handleEl.className = `lf-handle lf-handle--${type} lf-handle--${position}`
  handleEl.dataset['nodeId']     = nodeId
  handleEl.dataset['handleId']   = handleId
  handleEl.dataset['handleType'] = type

  // Register a live measure function — called by the EdgeLayer each time it needs
  // the handle position. No timing issue: measurement happens when the edge geometry
  // is actually needed (after layout), not at mount time.
  const measureFn = (): Point => {
    const handleRect = handleEl.getBoundingClientRect()
    const nodeRect   = nodeWrapperEl.getBoundingClientRect()
    const scale      = ctx.transform.peek().scale
    if (nodeRect.width === 0) return { x: 0, y: 0 }
    return {
      x: (handleRect.left - nodeRect.left + handleRect.width  / 2) / scale,
      y: (handleRect.top  - nodeRect.top  + handleRect.height / 2) / scale,
    }
  }
  ctx.handleRegistry.register(nodeId, handleId, measureFn, type)

  // Pointer down — start a connecting interaction
  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation() // prevent NodeWrapper from starting a drag
    e.preventDefault()

    const rootRect = ctx.getRootRect()
    const canvasPos = screenToCanvas(
      { x: e.clientX - rootRect.left, y: e.clientY - rootRect.top },
      ctx.transform.peek(),
    )
    ctx.stateMgr.toConnecting(nodeId, handleId, type, canvasPos)
  }

  handleEl.addEventListener('pointerdown', onPointerDown)

  function dispose() {
    handleEl.removeEventListener('pointerdown', onPointerDown)
    ctx.handleRegistry.unregister(nodeId, handleId)
    handleEl.remove()
  }

  return { el: handleEl, dispose }
}
