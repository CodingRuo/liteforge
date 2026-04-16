import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createThemeStore } from '../src/theme-store.js';

function mockMatchMedia(prefersDark: boolean): MediaQueryList {
  return {
    matches: prefersDark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;
}

describe('createThemeStore()', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia(false));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it('defaults to system mode', () => {
    const store = createThemeStore();
    expect(store.theme()).toBe('system');
  });

  it('respects custom default option', () => {
    const store = createThemeStore({ default: 'dark' });
    expect(store.theme()).toBe('dark');
  });

  // ── effectiveTheme ────────────────────────────────────────────────────────

  it('effectiveTheme resolves system to light when OS is light', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia(false));
    const store = createThemeStore();
    store.initialize();
    expect(store.effectiveTheme()).toBe('light');
  });

  it('effectiveTheme resolves system to dark when OS is dark', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia(true));
    const store = createThemeStore();
    store.initialize();
    expect(store.effectiveTheme()).toBe('dark');
  });

  it('effectiveTheme returns the mode directly when not system', () => {
    const store = createThemeStore({ default: 'dark' });
    expect(store.effectiveTheme()).toBe('dark');

    store.setTheme('light');
    expect(store.effectiveTheme()).toBe('light');
  });

  // ── isDark ────────────────────────────────────────────────────────────────

  it('isDark is true when effectiveTheme is dark', () => {
    const store = createThemeStore({ default: 'dark' });
    expect(store.isDark()).toBe(true);
  });

  it('isDark is false when effectiveTheme is light', () => {
    const store = createThemeStore({ default: 'light' });
    expect(store.isDark()).toBe(false);
  });

  // ── setTheme ──────────────────────────────────────────────────────────────

  it('setTheme updates the theme signal', () => {
    const store = createThemeStore();
    store.setTheme('dark');
    expect(store.theme()).toBe('dark');
  });

  it('setTheme persists to localStorage with default key', () => {
    const store = createThemeStore();
    store.setTheme('dark');
    expect(localStorage.getItem('lf_theme')).toBe('dark');
  });

  it('setTheme persists to localStorage with custom storageKey', () => {
    const store = createThemeStore({ storageKey: 'my_app_theme' });
    store.setTheme('light');
    expect(localStorage.getItem('my_app_theme')).toBe('light');
  });

  it('setTheme applies data-theme to <html>', () => {
    const store = createThemeStore({ default: 'dark' });
    store.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setTheme to system applies resolved effective theme to data-theme', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia(true));
    const store = createThemeStore({ default: 'light' });
    store.initialize();
    store.setTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // ── toggle ────────────────────────────────────────────────────────────────

  it('toggle switches from light to dark', () => {
    const store = createThemeStore({ default: 'light' });
    store.toggle();
    expect(store.theme()).toBe('dark');
  });

  it('toggle switches from dark to light', () => {
    const store = createThemeStore({ default: 'dark' });
    store.toggle();
    expect(store.theme()).toBe('light');
  });

  it('toggle from system switches to opposite of effective theme', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia(true)); // OS dark
    const store = createThemeStore({ default: 'system' });
    store.initialize();
    expect(store.effectiveTheme()).toBe('dark');
    store.toggle();
    expect(store.theme()).toBe('light');
    expect(store.effectiveTheme()).toBe('light');
  });

  // ── initialize ────────────────────────────────────────────────────────────

  it('initialize restores persisted theme from localStorage', () => {
    localStorage.setItem('lf_theme', 'dark');
    const store = createThemeStore();
    store.initialize();
    expect(store.theme()).toBe('dark');
  });

  it('initialize ignores unknown localStorage values', () => {
    localStorage.setItem('lf_theme', 'mocha');
    const store = createThemeStore({ default: 'light' });
    store.initialize();
    expect(store.theme()).toBe('light');
  });

  it('initialize applies data-theme synchronously', () => {
    const store = createThemeStore({ default: 'dark' });
    store.initialize();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('initialize attaches media listener', () => {
    const mql = mockMatchMedia(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
    const store = createThemeStore();
    store.initialize();
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('initialize returns cleanup that removes media listener', () => {
    const mql = mockMatchMedia(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
    const store = createThemeStore();
    const cleanup = store.initialize();
    cleanup();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('media change event updates systemIsDark and effectiveTheme', () => {
    const listeners: ((e: MediaQueryListEvent) => void)[] = [];
    const mql = {
      matches: false,
      addEventListener: vi.fn((_, cb) => listeners.push(cb as (e: MediaQueryListEvent) => void)),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql);

    const store = createThemeStore({ default: 'system' });
    store.initialize();
    expect(store.effectiveTheme()).toBe('light');

    // Simulate OS switching to dark
    listeners.forEach(cb => cb({ matches: true } as MediaQueryListEvent));
    expect(store.effectiveTheme()).toBe('dark');
    expect(store.isDark()).toBe(true);
  });

  // ── storageKey isolation ──────────────────────────────────────────────────

  it('two stores with different keys are independent', () => {
    const a = createThemeStore({ storageKey: 'app_a_theme' });
    const b = createThemeStore({ storageKey: 'app_b_theme' });

    a.setTheme('dark');
    b.setTheme('light');

    expect(localStorage.getItem('app_a_theme')).toBe('dark');
    expect(localStorage.getItem('app_b_theme')).toBe('light');
    expect(a.theme()).toBe('dark');
    expect(b.theme()).toBe('light');
  });
});
