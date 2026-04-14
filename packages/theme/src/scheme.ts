/**
 * @liteforge/theme — colorScheme()
 *
 * Signal-driven dark/light mode toggle.
 *
 * ```ts
 * import { colorScheme } from '@liteforge/theme';
 *
 * const scheme = colorScheme();
 * scheme()              // 'light' | 'dark'
 * scheme.set('dark');
 * scheme.update(s => s === 'dark' ? 'light' : 'dark');
 * ```
 *
 * On every change the signal:
 *   1. Sets `data-theme` on `<html>` (picked up by @liteforge/theme CSS variables)
 *   2. Persists the preference to `localStorage` under key `'lf-theme'`
 *
 * Initial value resolution order:
 *   1. `localStorage.getItem('lf-theme')` — persisted user preference
 *   2. `prefers-color-scheme: dark` media query — OS default
 *   3. `'light'` — final fallback
 *
 * Works alongside Tailwind v3 `dark:` variant — set `darkMode: 'class'` and
 * also toggle `.dark` via an effect:
 *
 * ```ts
 * import { effect } from '@liteforge/core';
 * effect(() => {
 *   document.documentElement.classList.toggle('dark', scheme() === 'dark');
 * });
 * ```
 */

import { signal, effect } from '@liteforge/core';
import type { Signal } from '@liteforge/core';

export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'lf-theme';

let _scheme: Signal<ColorScheme> | null = null;

/**
 * Returns the singleton color-scheme signal.
 * Safe to call multiple times — same signal is returned each time.
 */
export function colorScheme(): Signal<ColorScheme> {
  if (_scheme) return _scheme;

  const initial = resolveInitial();
  _scheme = signal<ColorScheme>(initial);

  if (typeof document !== 'undefined') {
    // Apply initial value synchronously so there is no FOUC before the
    // first effect tick.
    document.documentElement.setAttribute('data-theme', initial);

    // Keep DOM + localStorage in sync on every subsequent change.
    effect(() => {
      const s = _scheme!();
      document.documentElement.setAttribute('data-theme', s);
      try { localStorage.setItem(STORAGE_KEY, s); } catch { /* storage quota */ }
    });
  }

  return _scheme;
}

/**
 * Reset the singleton — useful for testing or SSR environments where each
 * request should start with a fresh state.
 */
export function resetColorScheme(): void {
  _scheme = null;
}

function resolveInitial(): ColorScheme {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* security / quota */ }
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}
