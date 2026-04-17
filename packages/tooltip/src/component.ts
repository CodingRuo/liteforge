import type { TooltipOptions } from './types.js';
import { tooltip } from './tooltip.js';

export interface TooltipProps extends TooltipOptions {
  children: Node
}

/**
 * Plain factory function (not defineComponent) that wraps a child element
 * with tooltip behaviour. The child is attached to a `display: contents` span
 * so layout is unaffected. Tooltip is attached to the first HTMLElement child.
 *
 * Cleanup: call the returned cleanup fn from onCleanup() when used inside
 * defineComponent, or rely on GC when used in short-lived contexts.
 */
export function Tooltip(props: TooltipProps): Node {
  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents';
  wrapper.appendChild(props.children);

  const child = wrapper.firstElementChild as HTMLElement | null;
  if (child) {
    const { children: _children, ...tooltipOpts } = props;
    tooltip(child, tooltipOpts);
  }

  return wrapper;
}
