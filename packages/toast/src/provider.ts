import { effect } from '@liteforge/core';
import { toasts, removeToast } from './store.js';
import { injectDefaultStyles } from './styles.js';
import type { ToastEntry, ToastPosition } from './types.js';

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function renderToast(entry: ToastEntry, container: HTMLElement): void {
  const el = document.createElement('div');
  el.className = `lf-toast lf-toast--${entry.type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.dataset['id'] = entry.id;

  const icon = document.createElement('span');
  icon.className = 'lf-toast__icon';
  icon.textContent = ICONS[entry.type] ?? '';
  el.appendChild(icon);

  const msg = document.createElement('span');
  msg.className = 'lf-toast__message';
  msg.textContent = entry.message;
  el.appendChild(msg);

  if (entry.options.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lf-toast__close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.addEventListener('click', () => dismissToast(entry.id, el, container));
    el.appendChild(closeBtn);
  }

  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.classList.add('lf-toast--visible');
  });

  // Auto-dismiss
  if (entry.options.duration > 0) {
    let remaining = entry.options.duration;
    let startTime: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const start = () => {
      startTime = Date.now();
      timer = setTimeout(() => dismissToast(entry.id, el, container), remaining);
    };

    const pause = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        if (startTime !== null) {
          remaining -= Date.now() - startTime;
        }
      }
    };

    if (entry.options.pauseOnHover) {
      el.addEventListener('mouseenter', pause);
      el.addEventListener('mouseleave', start);
    }

    start();
  }
}

function dismissToast(id: string, el: HTMLElement, container: HTMLElement): void {
  el.classList.remove('lf-toast--visible');
  el.classList.add('lf-toast--hiding');
  el.addEventListener('transitionend', () => {
    if (el.parentNode === container) container.removeChild(el);
    removeToast(id);
  }, { once: true });
}

export function ToastProvider(opts?: { position?: ToastPosition; unstyled?: boolean }): HTMLElement {
  if (!opts?.unstyled) {
    injectDefaultStyles();
  }

  const position = opts?.position ?? 'bottom-right';

  const container = document.createElement('div');
  container.className = `lf-toast-container lf-toast-container--${position}`;
  container.setAttribute('aria-live', 'assertive');
  container.setAttribute('aria-atomic', 'false');

  const rendered = new Set<string>();

  effect(() => {
    const current = toasts();
    const currentIds = new Set(current.map(t => t.id));

    // Remove DOM nodes for dismissed toasts (not yet cleaned via transitionend)
    for (const id of rendered) {
      if (!currentIds.has(id)) {
        rendered.delete(id);
        // DOM cleanup happens in dismissToast via transitionend
      }
    }

    // Render new toasts
    for (const entry of current) {
      if (!rendered.has(entry.id)) {
        rendered.add(entry.id);
        renderToast(entry, container);
      }
    }
  });

  return container;
}
