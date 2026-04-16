import { signal, computed, effect } from '@liteforge/core';
import type { Signal, ReadonlySignal } from '@liteforge/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeStoreOptions {
  /**
   * localStorage key for persisting the theme preference.
   * @default 'lf_theme'
   */
  storageKey?: string;

  /**
   * Initial theme mode when no persisted preference exists.
   * @default 'system'
   */
  default?: ThemeMode;
}

export interface ThemeStore {
  /** Current theme mode — `'light'` | `'dark'` | `'system'` */
  theme: Signal<ThemeMode>;

  /** Resolves `'system'` to the actual OS preference — always `'light'` or `'dark'` */
  effectiveTheme: ReadonlySignal<EffectiveTheme>;

  /** `true` when the effective theme is dark */
  isDark: ReadonlySignal<boolean>;

  /**
   * Set the theme mode, persist to localStorage, and apply `data-theme`
   * to `<html>` immediately.
   */
  setTheme(mode: ThemeMode): void;

  /**
   * Toggle between `'light'` and `'dark'`.
   * When the current mode is `'system'`, switches to the opposite of the
   * current effective theme.
   */
  toggle(): void;

  /**
   * Call once in `main.ts` after `createApp()`.
   * Restores the persisted theme preference and attaches a
   * `prefers-color-scheme` media-query listener for `'system'` mode.
   *
   * Returns a cleanup function that removes the media listener.
   */
  initialize(): () => void;
}

/**
 * Create a theme store that manages `light / dark / system` preference with
 * localStorage persistence and automatic `data-theme` application on `<html>`.
 *
 * @example
 * ```ts
 * // store/ui.ts
 * import { createThemeStore } from '@liteforge/theme'
 *
 * export const uiStore = createThemeStore({ storageKey: 'my_theme' })
 *
 * // main.ts
 * uiStore.initialize()
 *
 * // In a component
 * const { isDark, toggle } = uiStore
 * <button onclick={toggle}>Toggle theme</button>
 * ```
 */
export function createThemeStore(options: ThemeStoreOptions = {}): ThemeStore {
  const storageKey = options.storageKey ?? 'lf_theme';
  const defaultMode = options.default ?? 'system';

  // ── State ────────────────────────────────────────────────────────────────

  const theme = signal<ThemeMode>(defaultMode);

  // The OS preference as a signal — updated by the media listener
  const systemIsDark = signal<boolean>(false);

  const effectiveTheme = computed<EffectiveTheme>(() => {
    const t = theme();
    if (t !== 'system') return t;
    return systemIsDark() ? 'dark' : 'light';
  });

  const isDark = computed<boolean>(() => effectiveTheme() === 'dark');

  // ── Helpers ──────────────────────────────────────────────────────────────

  function readStorage(): ThemeMode | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const val = localStorage.getItem(storageKey);
      if (val === 'light' || val === 'dark' || val === 'system') return val;
    } catch { /* quota / security */ }
    return null;
  }

  function writeStorage(mode: ThemeMode): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, mode);
    } catch { /* quota */ }
  }

  function applyToDocument(effective: EffectiveTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', effective);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  function setTheme(mode: ThemeMode): void {
    theme.set(mode);
    writeStorage(mode);
    applyToDocument(effectiveTheme());
  }

  function toggle(): void {
    const next: EffectiveTheme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  function initialize(): () => void {
    // Restore persisted preference
    const persisted = readStorage();
    if (persisted !== null) {
      theme.set(persisted);
    }

    // Read OS preference
    let mediaQuery: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemIsDark.set(mediaQuery.matches);
    }

    // Apply initial data-theme synchronously — no FOUC
    applyToDocument(effectiveTheme());

    // Keep data-theme in sync with effectiveTheme signal
    const disposeEffect = effect(() => {
      applyToDocument(effectiveTheme());
    });

    // Listen for OS preference changes
    const onMediaChange = (e: MediaQueryListEvent): void => {
      systemIsDark.set(e.matches);
    };

    if (mediaQuery) {
      mediaQuery.addEventListener('change', onMediaChange);
    }

    return () => {
      disposeEffect();
      mediaQuery?.removeEventListener('change', onMediaChange);
    };
  }

  return { theme, effectiveTheme, isDark, setTheme, toggle, initialize };
}
