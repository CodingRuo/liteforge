/**
 * Error Boundary
 *
 * Central error capture and display logic for the LiteForge runtime.
 *
 * Usage:
 *   const boundary = createErrorBoundary(targetElement, config);
 *   boundary.handle(err, info);        // capture + render
 *   boundary.attachGlobalListeners();  // window error/unhandledrejection
 *   boundary.detachGlobalListeners();  // cleanup on unmount
 */

import type { AppConfig, ErrorInfo } from './types.js';
import { defaultErrorComponentWithRetry } from './error-page.js';

// ============================================================================
// Error Boundary instance
// ============================================================================

export interface ErrorBoundary {
  /**
   * Handle an error: call onError hook, find the best error component,
   * render the fallback UI into the app target.
   */
  handle(error: unknown, info: ErrorInfo): void;

  /**
   * Fire the onError hook only — does NOT render any UI.
   * Used when per-route errorComponent handles the UI itself.
   */
  invokeHook(error: unknown, info: ErrorInfo): void;

  /** Attach window.onerror + unhandledrejection listeners */
  attachGlobalListeners(): void;

  /** Remove the global listeners (called on app unmount) */
  detachGlobalListeners(): void;
}

export function createErrorBoundary(
  targetElement: HTMLElement,
  config: Pick<AppConfig, 'onError' | 'errorComponent'>,
): ErrorBoundary {
  let unhandledRejectionListener: ((e: PromiseRejectionEvent) => void) | null = null;
  let errorListener: ((e: ErrorEvent) => void) | null = null;

  function invokeHook(error: unknown, info: ErrorInfo): void {
    try {
      config.onError?.(error, info);
    } catch {
      // Never let the hook itself crash anything
    }
  }

  function handle(error: unknown, info: ErrorInfo): void {
    // 1. Fire observer hook first (Sentry etc.)
    invokeHook(error, info);

    // 2. Pick error component: custom > built-in default with reload retry
    // 3. Render into app target
    try {
      const fallbackEl = config.errorComponent
        ? config.errorComponent(error, info)
        : defaultErrorComponentWithRetry(error, info, () => window.location.reload());
      targetElement.innerHTML = '';
      targetElement.appendChild(fallbackEl);
    } catch {
      // Absolute last resort if errorComponent itself throws
      targetElement.innerHTML = '<div style="font-family:monospace;padding:32px;color:#e53e3e">A fatal error occurred and the error UI could not be rendered.</div>';
    }
  }

  function attachGlobalListeners(): void {
    if (typeof window === 'undefined') return;

    unhandledRejectionListener = (e: PromiseRejectionEvent) => {
      handle(e.reason, { type: 'unhandled', originalError: e.reason });
    };

    errorListener = (e: ErrorEvent) => {
      if (!e.error) return;
      handle(e.error, { type: 'unhandled', originalError: e.error });
    };

    window.addEventListener('unhandledrejection', unhandledRejectionListener);
    window.addEventListener('error', errorListener);
  }

  function detachGlobalListeners(): void {
    if (typeof window === 'undefined') return;
    if (unhandledRejectionListener) {
      window.removeEventListener('unhandledrejection', unhandledRejectionListener);
      unhandledRejectionListener = null;
    }
    if (errorListener) {
      window.removeEventListener('error', errorListener);
      errorListener = null;
    }
  }

  return { handle, invokeHook, attachGlobalListeners, detachGlobalListeners };
}
