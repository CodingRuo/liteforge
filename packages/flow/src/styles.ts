let stylesInjected = false

export function injectFlowStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = getFlowCSS()
  document.head.appendChild(style)
}

export function resetFlowStylesInjection(): void {
  stylesInjected = false
}

function getFlowCSS(): string {
  return `
.lf-flow-root {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  background: var(--lf-flow-bg, #0d0d0d);
}
.lf-transform-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  will-change: transform;
}
.lf-edges-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.lf-nodes-layer {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.lf-node-wrapper {
  position: absolute;
  pointer-events: all;
}
.lf-handle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lf-flow-handle-bg, #555);
  border: 2px solid var(--lf-flow-handle-border, #888);
  cursor: crosshair;
  pointer-events: all;
}
.lf-ghost-edge {
  stroke: var(--lf-flow-edge-connecting, #888);
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 5 5;
  pointer-events: none;
}
.lf-flow-edge {
  stroke: var(--lf-flow-edge-color, #555);
  stroke-width: 2;
  fill: none;
  cursor: pointer;
  pointer-events: stroke;
}
.lf-flow-edge.selected {
  stroke: var(--lf-flow-edge-selected, #6366f1);
}
.lf-marquee {
  position: absolute;
  border: 1px solid var(--lf-flow-marquee-border, #6366f1);
  background: var(--lf-flow-marquee-bg, rgba(99,102,241,0.08));
  pointer-events: none;
  display: none;
}
.lf-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lf-minimap {
  position: absolute;
  bottom: 16px;
  left: 16px;
}
`
}
