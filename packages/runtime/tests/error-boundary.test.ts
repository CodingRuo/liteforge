import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createErrorBoundary } from '../src/error-boundary.js';
import type { ErrorInfo } from '../src/types.js';

function makeTarget(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function cleanup(el: HTMLElement): void {
  if (el.parentNode) el.parentNode.removeChild(el);
}

const basicInfo: ErrorInfo = { type: 'render', originalError: new Error('test') };

describe('createErrorBoundary', () => {
  describe('invokeHook', () => {
    it('calls onError with error and info', () => {
      const onError = vi.fn();
      const target = makeTarget();
      const boundary = createErrorBoundary(target, { onError });
      const err = new Error('boom');

      boundary.invokeHook(err, basicInfo);

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(err, basicInfo);
      cleanup(target);
    });

    it('does not render anything into the target', () => {
      const target = makeTarget();
      const boundary = createErrorBoundary(target, { onError: () => {} });

      boundary.invokeHook(new Error('x'), basicInfo);

      expect(target.innerHTML).toBe('');
      cleanup(target);
    });

    it('swallows errors thrown by onError hook', () => {
      const target = makeTarget();
      const boundary = createErrorBoundary(target, {
        onError: () => { throw new Error('hook crashed'); },
      });

      expect(() => boundary.invokeHook(new Error('x'), basicInfo)).not.toThrow();
      cleanup(target);
    });
  });

  describe('handle', () => {
    it('calls onError then renders errorComponent', () => {
      const onError = vi.fn();
      const target = makeTarget();
      const errorEl = document.createElement('div');
      errorEl.textContent = 'custom error';
      const errorComponent = vi.fn().mockReturnValue(errorEl);

      const boundary = createErrorBoundary(target, { onError, errorComponent });
      boundary.handle(new Error('oh no'), basicInfo);

      expect(onError).toHaveBeenCalledOnce();
      expect(errorComponent).toHaveBeenCalledOnce();
      expect(target.firstChild).toBe(errorEl);
      cleanup(target);
    });

    it('uses defaultErrorComponent when no errorComponent provided', () => {
      const target = makeTarget();
      const boundary = createErrorBoundary(target, {});

      boundary.handle(new Error('default fallback'), basicInfo);

      // defaultErrorComponent should have rendered something
      expect(target.childNodes.length).toBeGreaterThan(0);
      cleanup(target);
    });

    it('clears previous content before rendering', () => {
      const target = makeTarget();
      target.innerHTML = '<p>old content</p>';
      const boundary = createErrorBoundary(target, {});

      boundary.handle(new Error('x'), basicInfo);

      expect(target.querySelector('p')).toBeNull();
      cleanup(target);
    });

    it('renders last-resort HTML if errorComponent itself throws', () => {
      const target = makeTarget();
      const boundary = createErrorBoundary(target, {
        errorComponent: () => { throw new Error('broken ui'); },
      });

      boundary.handle(new Error('original'), basicInfo);

      expect(target.innerHTML).toContain('fatal');
      cleanup(target);
    });
  });

  describe('global listeners', () => {
    it('attaches and detaches unhandledrejection listener', () => {
      const target = makeTarget();
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const boundary = createErrorBoundary(target, {});
      boundary.attachGlobalListeners();

      expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));

      boundary.detachGlobalListeners();

      expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
      cleanup(target);
    });

    it('detach is idempotent when called without attach', () => {
      const target = makeTarget();
      const boundary = createErrorBoundary(target, {});

      expect(() => boundary.detachGlobalListeners()).not.toThrow();
      cleanup(target);
    });
  });
});
