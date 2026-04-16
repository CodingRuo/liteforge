import { onCleanup } from '@liteforge/core';

/**
 * Attach an outside-click handler to one or more elements.
 *
 * The callback fires on every `pointerdown` event whose target is outside all
 * of the provided elements and their descendants.
 *
 * The document listener is registered via `setTimeout(..., 0)` so that the
 * click that opened the popover/dropdown does not immediately trigger the
 * handler on the same tick. The returned cleanup function — and the
 * `onCleanup()` registration inside an effect — both remove the listener.
 *
 * @param elements - One element, or a getter that returns one or more elements.
 *                   A getter is re-evaluated on every outside click so the
 *                   reference stays fresh (useful with reactive refs).
 * @param handler  - Called when a pointerdown outside all elements is detected.
 * @returns A cleanup function that removes the document listener immediately.
 *
 * @example
 * ```ts
 * // Inside a component's component() or setup():
 * const open = signal(false)
 * let containerEl: HTMLElement | null = null
 *
 * useClickOutside(() => containerEl, () => open.set(false))
 *
 * return (
 *   <div ref={(el) => { containerEl = el }}>
 *     <button onclick={() => open.set(true)}>Open</button>
 *     <Show when={() => open()}>
 *       {() => <ul>...</ul>}
 *     </Show>
 *   </div>
 * )
 * ```
 *
 * @example
 * ```ts
 * // Multiple elements (e.g. trigger + floating panel are separate nodes):
 * useClickOutside(() => [triggerEl, panelEl], () => open.set(false))
 * ```
 *
 * @example
 * ```ts
 * // Outside a component (manual cleanup):
 * const cleanup = useClickOutside(myEl, () => close())
 * // later:
 * cleanup()
 * ```
 */
export function useClickOutside(
  elements: HTMLElement | null | (() => HTMLElement | HTMLElement[] | null | undefined),
  handler: (event: PointerEvent) => void,
): () => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const getElements = (): HTMLElement[] => {
    const raw = typeof elements === 'function' ? elements() : elements;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  };

  const onPointerDown = (event: PointerEvent): void => {
    const targets = getElements();
    if (targets.length === 0) return;

    const clickedInside = targets.some(
      (el) => el === event.target || el.contains(event.target as Node),
    );

    if (!clickedInside) {
      handler(event);
    }
  };

  // Register after the current event propagation finishes so the click that
  // triggered the open() call doesn't immediately fire the outside handler.
  timerId = setTimeout(() => {
    document.addEventListener('pointerdown', onPointerDown);
    timerId = null;
  }, 0);

  const cleanup = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    document.removeEventListener('pointerdown', onPointerDown);
  };

  // Auto-cleanup when called inside an effect or component setup().
  // Silently skipped when called outside a reactive context — the returned
  // cleanup function must be called manually in that case.
  try {
    onCleanup(cleanup);
  } catch {
    // Not inside an effect — caller is responsible for calling cleanup()
  }

  return cleanup;
}
