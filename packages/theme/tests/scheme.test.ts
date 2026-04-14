import { describe, it, expect, beforeEach, vi } from 'vitest';
import { colorScheme, resetColorScheme } from '../src/scheme.js';

describe('colorScheme()', () => {
  beforeEach(() => {
    resetColorScheme();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    // Reset matchMedia mock to light (default)
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
  });

  it('returns light by default when no preference stored', () => {
    const scheme = colorScheme();
    expect(scheme()).toBe('light');
  });

  it('returns dark when prefers-color-scheme: dark', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const scheme = colorScheme();
    expect(scheme()).toBe('dark');
  });

  it('reads persisted value from localStorage', () => {
    localStorage.setItem('lf-theme', 'dark');
    const scheme = colorScheme();
    expect(scheme()).toBe('dark');
  });

  it('localStorage takes precedence over prefers-color-scheme', () => {
    localStorage.setItem('lf-theme', 'light');
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, // OS says dark
    } as MediaQueryList);
    const scheme = colorScheme();
    expect(scheme()).toBe('light');
  });

  it('sets data-theme on <html> on init', () => {
    colorScheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('updates data-theme on <html> when scheme changes', () => {
    const scheme = colorScheme();
    scheme.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists value to localStorage when changed', () => {
    const scheme = colorScheme();
    scheme.set('dark');
    expect(localStorage.getItem('lf-theme')).toBe('dark');
  });

  it('toggles between light and dark', () => {
    const scheme = colorScheme();
    expect(scheme()).toBe('light');
    scheme.update(s => (s === 'dark' ? 'light' : 'dark'));
    expect(scheme()).toBe('dark');
    scheme.update(s => (s === 'dark' ? 'light' : 'dark'));
    expect(scheme()).toBe('light');
  });

  it('returns the same singleton on repeated calls', () => {
    const a = colorScheme();
    const b = colorScheme();
    expect(a).toBe(b);
  });

  it('ignores unknown localStorage values and falls back to light', () => {
    localStorage.setItem('lf-theme', 'system');
    const scheme = colorScheme();
    expect(scheme()).toBe('light');
  });
});
