import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal, effect } from '@liteforge/core';
import { useClickOutside } from '../src/use-click-outside.js';
import { initAppContext, clearContext } from '../src/context.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function pointerdown(target: EventTarget): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
  );
}

describe('useClickOutside', () => {
  let container: HTMLElement;
  let inner: HTMLElement;

  beforeEach(() => {
    clearContext();
    initAppContext({});
    container = document.createElement('div');
    inner = document.createElement('button');
    container.appendChild(inner);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('calls handler when clicking outside the element', async () => {
    const handler = vi.fn();
    useClickOutside(container, handler);

    await tick(); // let setTimeout(0) register the listener

    pointerdown(document.body);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does NOT call handler when clicking the element itself', async () => {
    const handler = vi.fn();
    useClickOutside(container, handler);

    await tick();

    pointerdown(container);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT call handler when clicking a descendant', async () => {
    const handler = vi.fn();
    useClickOutside(container, handler);

    await tick();

    pointerdown(inner);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire on the same tick as registration (race condition guard)', () => {
    // Without setTimeout(0), the click that opens the dropdown would immediately
    // close it again via the document listener.
    const handler = vi.fn();
    useClickOutside(container, handler);

    // Fire before tick — listener is not yet attached
    pointerdown(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returned cleanup function removes the listener', async () => {
    const handler = vi.fn();
    const cleanup = useClickOutside(container, handler);

    await tick();

    cleanup();
    pointerdown(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it('cleanup before tick cancels the pending setTimeout', async () => {
    const handler = vi.fn();
    const cleanup = useClickOutside(container, handler);

    // Clean up before the listener is even registered
    cleanup();
    await tick();

    pointerdown(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it('accepts a getter function for the element', async () => {
    const handler = vi.fn();
    useClickOutside(() => container, handler);

    await tick();

    pointerdown(document.body);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('accepts a getter returning an array of elements', async () => {
    const sibling = document.createElement('div');
    document.body.appendChild(sibling);

    const handler = vi.fn();
    useClickOutside(() => [container, sibling], handler);

    await tick();

    // Click inside either element — no handler call
    pointerdown(container);
    pointerdown(sibling);
    expect(handler).not.toHaveBeenCalled();

    // Click truly outside both
    const outside = document.createElement('span');
    document.body.appendChild(outside);
    pointerdown(outside);
    expect(handler).toHaveBeenCalledOnce();

    document.body.removeChild(sibling);
    document.body.removeChild(outside);
  });

  it('getter returning null is a no-op — does not throw', async () => {
    const handler = vi.fn();
    useClickOutside(() => null, handler);

    await tick();

    // Should not throw, handler not called
    expect(() => pointerdown(document.body)).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes the PointerEvent to the handler', async () => {
    let receivedEvent: PointerEvent | null = null;
    useClickOutside(container, (e) => { receivedEvent = e; });

    await tick();

    pointerdown(document.body);
    expect(receivedEvent).toBeInstanceOf(PointerEvent);
  });

  it('registers onCleanup inside an effect — listener removed when effect disposes', async () => {
    const handler = vi.fn();
    const active = signal(true);

    const dispose = effect(() => {
      if (active()) {
        useClickOutside(container, handler);
      }
    });

    await tick();

    pointerdown(document.body);
    expect(handler).toHaveBeenCalledTimes(1);

    // Dispose the effect — onCleanup runs, listener removed
    dispose();
    handler.mockClear();

    await tick();
    pointerdown(document.body);
    expect(handler).not.toHaveBeenCalled();
  });
});
