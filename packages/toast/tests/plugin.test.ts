import { describe, it, expect, beforeEach } from 'vitest';
import { toastPlugin } from '../src/plugin.js';
import { clearToasts, toastConfig } from '../src/store.js';
import { resetStylesInjection } from '../src/styles.js';

function makeContext(target: HTMLElement) {
  const provided = new Map<string, unknown>();
  return {
    target,
    provide(key: string, value: unknown) { provided.set(key, value); },
    resolve(key: string) { return provided.get(key); },
    provided,
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  clearToasts();
  resetStylesInjection();
  toastConfig.set({ duration: 4000, pauseOnHover: true, closable: true });
});

describe('toastPlugin', () => {
  it('has name "toast"', () => {
    const plugin = toastPlugin();
    expect(plugin.name).toBe('toast');
  });

  it('install() provides toast API', () => {
    const plugin = toastPlugin();
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    plugin.install(ctx as never);
    expect(ctx.provided.get('toast')).toBeDefined();
  });

  it('install() inserts container next to app target', () => {
    const plugin = toastPlugin();
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    plugin.install(ctx as never);
    const root = document.getElementById('liteforge-toast-root');
    expect(root).not.toBeNull();
  });

  it('cleanup removes the container', () => {
    const plugin = toastPlugin();
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    const cleanup = plugin.install(ctx as never);
    expect(document.getElementById('liteforge-toast-root')).not.toBeNull();
    if (typeof cleanup === 'function') cleanup();
    expect(document.getElementById('liteforge-toast-root')).toBeNull();
  });

  it('applies position option', () => {
    const plugin = toastPlugin({ position: 'top-center' });
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    plugin.install(ctx as never);
    const container = document.querySelector('.lf-toast-container--top-center');
    expect(container).not.toBeNull();
  });

  it('applies duration config override', () => {
    const plugin = toastPlugin({ duration: 2000 });
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    plugin.install(ctx as never);
    expect(toastConfig().duration).toBe(2000);
  });

  it('applies closable config override', () => {
    const plugin = toastPlugin({ closable: false });
    const target = document.getElementById('app')!;
    const ctx = makeContext(target);
    plugin.install(ctx as never);
    expect(toastConfig().closable).toBe(false);
  });
});
