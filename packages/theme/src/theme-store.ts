import { computed, effect } from '@liteforge/core';
import type { ReadonlySignal } from '@liteforge/core';
import { defineStore } from '@liteforge/store';
import type { Store, SignalifiedState } from '@liteforge/store';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeStoreOptions {
  /**
   * Store name — used by DevTools and as the key in `createApp({ stores })`.
   * @default 'theme'
   */
  name?: string;

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

// Internal state shape used by defineStore
type ThemeState = {
  theme: ThemeMode;
  systemIsDark: boolean;
};

type ThemeActions = {
  setTheme(mode: ThemeMode): void;
  toggle(): void;
  initialize(): void;
};

export type ThemeStore = Store<ThemeState, Record<string, never>, ThemeActions> & {
  /** Resolves `'system'` to the actual OS preference — always `'light'` or `'dark'` */
  effectiveTheme: ReadonlySignal<EffectiveTheme>;

  /** `true` when the effective theme is dark */
  isDark: ReadonlySignal<boolean>;
};

/**
 * Create a theme store that manages `light / dark / system` preference with
 * localStorage persistence and automatic `data-theme` application on `<html>`.
 *
 * Built on top of `defineStore()` — fully compatible with `AnyStore`,
 * DevTools, and time-travel debugging out of the box.
 *
 * Pass it directly to `createApp({ stores: [uiStore] })` — `initialize()`
 * runs automatically on app boot.
 *
 * @example
 * ```ts
 * // store/ui.ts
 * import { createThemeStore } from '@liteforge/theme'
 *
 * export const uiStore = createThemeStore({ storageKey: 'my_theme' })
 *
 * // main.ts — initialize() is called automatically
 * await createApp({ root: App, target: '#app', stores: [authStore, uiStore] })
 *   .mount()
 *
 * // In a component
 * const { isDark, toggle } = uiStore
 * <button onclick={toggle}>Toggle theme</button>
 * ```
 */
export function createThemeStore(options: ThemeStoreOptions = {}): ThemeStore {
  const storeName = options.name ?? 'theme';
  const storageKey = options.storageKey ?? 'lf_theme';
  const defaultMode = options.default ?? 'system';

  // Cleanup ref for the media listener + effect — lives outside defineStore
  // so it survives $reset and can be replaced on re-initialize
  let _mediaCleanup: (() => void) | null = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // ── defineStore core ───────────────────────────────────────────────────────
  //
  // `defineStore` gives us signals for `theme` + `systemIsDark`,
  // plus `$name`, `$reset`, `$snapshot`, `$restore`, `$watch`, DevTools
  // integration — all for free. Actions get access to the signal state.
  // We layer `effectiveTheme` and `isDark` computed signals on top after.

  const base = defineStore<ThemeState, Record<string, never>, ThemeActions>(storeName, {
    state: {
      theme: defaultMode,
      systemIsDark: false,
    },
    actions: (state: SignalifiedState<ThemeState>) => ({
      setTheme(mode: ThemeMode): void {
        state.theme.set(mode);
        writeStorage(mode);
        applyToDocument(store.effectiveTheme());
      },
      toggle(): void {
        const next: EffectiveTheme = store.effectiveTheme() === 'dark' ? 'light' : 'dark';
        store.setTheme(next);
      },
      initialize(): void {
        // Restore persisted preference
        const persisted = readStorage();
        if (persisted !== null) {
          state.theme.set(persisted);
        }

        // Read current OS preference
        let mediaQuery: MediaQueryList | null = null;
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          state.systemIsDark.set(mediaQuery.matches);
        }

        // Apply initial data-theme synchronously — no FOUC
        applyToDocument(store.effectiveTheme());

        // Keep data-theme in sync with effectiveTheme signal
        const disposeEffect = effect(() => {
          applyToDocument(store.effectiveTheme());
        });

        // Listen for OS preference changes
        const onMediaChange = (e: MediaQueryListEvent): void => {
          state.systemIsDark.set(e.matches);
        };

        if (mediaQuery) {
          mediaQuery.addEventListener('change', onMediaChange);
        }

        _mediaCleanup = () => {
          disposeEffect();
          mediaQuery?.removeEventListener('change', onMediaChange);
        };
      },
    }),
  });

  // Patch $reset to also tear down the media listener before resetting state
  const originalReset = base.$reset.bind(base);
  base.$reset = (): void => {
    _mediaCleanup?.();
    _mediaCleanup = null;
    originalReset();
  };

  // ── Computed signals layered on top ────────────────────────────────────────

  const effectiveTheme = computed<EffectiveTheme>(() => {
    const t = base.theme();
    if (t !== 'system') return t;
    return base.systemIsDark() ? 'dark' : 'light';
  });

  const isDark = computed<boolean>(() => effectiveTheme() === 'dark');

  // ── Assemble ThemeStore ────────────────────────────────────────────────────

  const store = Object.assign(base, { effectiveTheme, isDark }) as ThemeStore;

  return store;
}
