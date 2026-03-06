/**
 * Default Error Page
 *
 * Built-in fallback UI for unhandled errors.
 * DEV: full stack trace with highlighted first non-internal frame.
 * PROD: minimal "Something went wrong." + Go Home button.
 *
 * Pure DOM — no framework dependencies.
 */

import type { ErrorInfo, ErrorComponent } from './types.js';
import { parseStack } from './stack-parser.js';

// ============================================================================
// Helpers
// ============================================================================

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function text(content: string): Text {
  return document.createTextNode(content);
}

// ============================================================================
// Styles (injected once)
// ============================================================================

const STYLE_ID = '__lf-error-page-styles__';

function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.lf-error-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
  background: #0f0f0f;
  color: #e1e1e1;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 24px;
  box-sizing: border-box;
}
.lf-error-page__inner {
  max-width: 860px;
  width: 100%;
}
.lf-error-page__badge {
  display: inline-block;
  background: #e53e3e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.lf-error-page__message {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  line-height: 1.4;
  word-break: break-word;
}
.lf-error-page__meta {
  font-size: 13px;
  color: #888;
  margin: 0 0 28px;
  font-family: 'Courier New', Courier, monospace;
}
.lf-error-page__stack {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 28px;
  overflow-x: auto;
}
.lf-error-page__stack-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
  margin: 0 0 12px;
}
.lf-error-page__frame {
  display: flex;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid #222;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #888;
}
.lf-error-page__frame:last-child { border-bottom: none; }
.lf-error-page__frame--highlight {
  color: #e1e1e1;
  background: #1f1f1f;
  border-radius: 4px;
  padding: 5px 6px;
  margin: 0 -6px;
}
.lf-error-page__frame-fn {
  flex-shrink: 0;
  color: #a78bfa;
  min-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lf-error-page__frame-loc {
  color: #6ee7b7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lf-error-page__frame--internal .lf-error-page__frame-fn,
.lf-error-page__frame--internal .lf-error-page__frame-loc {
  opacity: 0.35;
}
.lf-error-page__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.lf-error-page__btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.lf-error-page__btn:hover { opacity: 0.8; }
.lf-error-page__btn--primary { background: #e53e3e; color: #fff; }
.lf-error-page__btn--secondary { background: #2a2a2a; color: #e1e1e1; }
.lf-error-page__prod-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px;
}
.lf-error-page__prod-sub {
  font-size: 15px;
  color: #888;
  margin: 0 0 32px;
}
`;
  document.head.appendChild(style);
}

// ============================================================================
// Error page builders
// ============================================================================

function buildDevPage(error: unknown, info: ErrorInfo, retryFn?: () => void): Element {
  injectStyles();

  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error ? error.stack ?? null : null;
  const frames = parseStack(stack);

  const inner = el('div', { class: 'lf-error-page__inner' });

  // Badge
  inner.appendChild(el('div', { class: 'lf-error-page__badge' }, info.type));

  // Error message
  inner.appendChild(el('h1', { class: 'lf-error-page__message' }, errorMessage));

  // Meta line
  const metaParts: string[] = [];
  if (info.route) metaParts.push(`route: ${info.route}`);
  if (info.componentName) metaParts.push(`component: ${info.componentName}`);
  if (metaParts.length > 0) {
    inner.appendChild(el('p', { class: 'lf-error-page__meta' }, metaParts.join('  ·  ')));
  }

  // Stack trace
  if (frames.length > 0) {
    const stackEl = el('div', { class: 'lf-error-page__stack' });
    stackEl.appendChild(el('div', { class: 'lf-error-page__stack-title' }, 'Stack Trace'));

    // Find first non-internal frame to highlight
    const highlightIdx = frames.findIndex(f => !f.isInternal);

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]!;
      const isHighlight = i === highlightIdx;

      const locText = formatLoc(frame.file, frame.line, frame.col);
      const classes = [
        'lf-error-page__frame',
        isHighlight ? 'lf-error-page__frame--highlight' : '',
        frame.isInternal ? 'lf-error-page__frame--internal' : '',
      ].filter(Boolean).join(' ');

      const frameEl = el('div', { class: classes });
      frameEl.appendChild(el('span', { class: 'lf-error-page__frame-fn' }, frame.fn));
      frameEl.appendChild(el('span', { class: 'lf-error-page__frame-loc' }, locText));
      stackEl.appendChild(frameEl);
    }

    inner.appendChild(stackEl);
  } else if (stack) {
    // Couldn't parse stack — show raw
    const pre = el('pre', { class: 'lf-error-page__stack', style: 'font-size:11px;white-space:pre-wrap;' });
    pre.appendChild(text(stack));
    inner.appendChild(pre);
  }

  // Actions
  const actions = el('div', { class: 'lf-error-page__actions' });

  if (retryFn) {
    const retryBtn = el('button', { class: 'lf-error-page__btn lf-error-page__btn--primary', type: 'button' }, 'Retry');
    retryBtn.addEventListener('click', retryFn);
    actions.appendChild(retryBtn);
  }

  const homeBtn = el('button', { class: 'lf-error-page__btn lf-error-page__btn--secondary', type: 'button' }, 'Go Home');
  homeBtn.addEventListener('click', () => {
    try {
      // Try router navigate first
      const router = (window as unknown as Record<string, unknown>).__lf_router__;
      if (router && typeof (router as { navigate?: unknown }).navigate === 'function') {
        (router as { navigate: (path: string) => void }).navigate('/');
      } else {
        window.location.href = '/';
      }
    } catch {
      window.location.href = '/';
    }
  });
  actions.appendChild(homeBtn);
  inner.appendChild(actions);

  const wrapper = el('div', { class: 'lf-error-page' });
  wrapper.appendChild(inner);
  return wrapper;
}

function buildProdPage(): Element {
  injectStyles();

  const inner = el('div', { class: 'lf-error-page__inner' });
  inner.appendChild(el('h1', { class: 'lf-error-page__prod-title' }, 'Something went wrong.'));
  inner.appendChild(el('p', { class: 'lf-error-page__prod-sub' }, 'An unexpected error occurred. Please try again.'));

  const homeBtn = el('button', { class: 'lf-error-page__btn lf-error-page__btn--secondary', type: 'button' }, 'Go Home');
  homeBtn.addEventListener('click', () => { window.location.href = '/'; });

  inner.appendChild(el('div', { class: 'lf-error-page__actions' }, homeBtn));

  const wrapper = el('div', { class: 'lf-error-page' });
  wrapper.appendChild(inner);
  return wrapper;
}

function formatLoc(file: string, line: number, col: number): string {
  // Shorten long paths — show last 3 segments
  const parts = file.replace(/\\/g, '/').split('/');
  const shortFile = parts.slice(-3).join('/');
  return `${shortFile}:${line}:${col}`;
}

// ============================================================================
// Exported default error component
// ============================================================================

/**
 * Default ErrorComponent used when no custom errorComponent is provided.
 * Shows full stack in dev, minimal message in production.
 */
export const defaultErrorComponent: ErrorComponent = (
  error: unknown,
  info: ErrorInfo,
): Element => {
  const isDev = (import.meta.env as { DEV?: boolean } | undefined)?.DEV !== false;
  return isDev ? buildDevPage(error, info) : buildProdPage();
};

/** @internal Used by router outlet to provide a retry action in the dev page */
export function defaultErrorComponentWithRetry(
  error: unknown,
  info: ErrorInfo,
  retry: () => void,
): Element {
  const isDev = (import.meta.env as { DEV?: boolean } | undefined)?.DEV !== false;
  return isDev ? buildDevPage(error, info, retry) : buildProdPage();
}
