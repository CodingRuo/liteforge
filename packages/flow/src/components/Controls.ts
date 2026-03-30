import type { Signal } from '@liteforge/core'
import type { Transform } from '../types.js'
import type { FlowContextValue } from '../context.js'

export function createControls(
  _ctx: FlowContextValue,
  transform: Signal<Transform>,
  rootEl: HTMLElement,
  fitViewFn: () => void,
): { el: HTMLDivElement; dispose: () => void } {
  const el = document.createElement('div')
  el.className = 'lf-controls'

  const zoomInBtn = document.createElement('button')
  zoomInBtn.className = 'lf-controls-btn lf-controls-zoom-in'
  zoomInBtn.title = 'Zoom in'
  zoomInBtn.textContent = '+'

  const zoomOutBtn = document.createElement('button')
  zoomOutBtn.className = 'lf-controls-btn lf-controls-zoom-out'
  zoomOutBtn.title = 'Zoom out'
  zoomOutBtn.textContent = '−'

  const fitBtn = document.createElement('button')
  fitBtn.className = 'lf-controls-btn lf-controls-fit'
  fitBtn.title = 'Fit view'
  fitBtn.textContent = '⊡'

  el.appendChild(zoomInBtn)
  el.appendChild(zoomOutBtn)
  el.appendChild(fitBtn)

  const onZoomIn = () => {
    const t = transform.peek()
    const newScale = Math.min(t.scale * 1.2, 3)
    const cx = rootEl.offsetWidth / 2
    const cy = rootEl.offsetHeight / 2
    const ratio = newScale / t.scale
    transform.set({
      x: cx - (cx - t.x) * ratio,
      y: cy - (cy - t.y) * ratio,
      scale: newScale,
    })
  }

  const onZoomOut = () => {
    const t = transform.peek()
    const newScale = Math.max(t.scale / 1.2, 0.1)
    const cx = rootEl.offsetWidth / 2
    const cy = rootEl.offsetHeight / 2
    const ratio = newScale / t.scale
    transform.set({
      x: cx - (cx - t.x) * ratio,
      y: cy - (cy - t.y) * ratio,
      scale: newScale,
    })
  }

  zoomInBtn.addEventListener('click', onZoomIn)
  zoomOutBtn.addEventListener('click', onZoomOut)
  fitBtn.addEventListener('click', fitViewFn)

  rootEl.appendChild(el)

  const dispose = () => {
    zoomInBtn.removeEventListener('click', onZoomIn)
    zoomOutBtn.removeEventListener('click', onZoomOut)
    fitBtn.removeEventListener('click', fitViewFn)
    el.remove()
  }

  return { el, dispose }
}
