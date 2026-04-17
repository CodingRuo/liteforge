import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineApp, defineComponent, clearContext } from '../src/index.js';
import type { LiteForgePlugin } from '../src/index.js';

describe('Plugin System', () => {
  let container: HTMLElement;

  beforeEach(() => {
    clearContext();
    if (typeof window !== 'undefined' && '$lf' in window) {
      delete (window as unknown as Record<string, unknown>).$lf;
    }
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  const makeRoot = () =>
    defineComponent({ component: () => document.createTextNode('App') });

  // ──────────────────────────────────────────────────────────────────────────
  // AppBuilder shape
  // ──────────────────────────────────────────────────────────────────────────

  describe('AppBuilder', () => {
    it('returns an object with .use() and .mount()', () => {
      const builder = defineApp({ root: makeRoot(), target: container });
      expect(typeof builder.use).toBe('function');
      expect(typeof builder.mount).toBe('function');
      // Also implements Thenable
      expect(typeof builder.then).toBe('function');
    });

    it('.use() is chainable — returns the builder', () => {
      const plugin: LiteForgePlugin = {
        name: 'a',
        install: vi.fn(),
      };
      const builder = defineApp({ root: makeRoot(), target: container });
      const returned = builder.use(plugin);
      expect(returned).toBe(builder);
      // Need to mount so no pending promise leaks
      return returned.mount().then((app) => app.unmount());
    });

    it('await defineApp(...) without .mount() works via .then() — backward compat', async () => {
      const app = await defineApp({ root: makeRoot(), target: container });
      expect(app).toBeDefined();
      expect(typeof app.unmount).toBe('function');
      app.unmount();
    });

    it('.use() after .mount() throws', async () => {
      const builder = defineApp({ root: makeRoot(), target: container });
      const app = await builder.mount();
      const latePlugin: LiteForgePlugin = { name: 'late', install: vi.fn() };
      expect(() => builder.use(latePlugin)).toThrow('.use() after .mount()');
      app.unmount();
    });

    it('.mount() a second time throws', async () => {
      const builder = defineApp({ root: makeRoot(), target: container });
      const app = await builder.mount();
      expect(() => builder.mount()).toThrow('.mount() has already been called');
      app.unmount();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Plugin install order & duplicate check
  // ──────────────────────────────────────────────────────────────────────────

  describe('install order and duplicate names', () => {
    it('calls install() in registration order', async () => {
      const order: string[] = [];

      const a: LiteForgePlugin = { name: 'a', install: () => { order.push('a'); } };
      const b: LiteForgePlugin = { name: 'b', install: () => { order.push('b'); } };
      const c: LiteForgePlugin = { name: 'c', install: () => { order.push('c'); } };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(a)
        .use(b)
        .use(c)
        .mount();

      expect(order).toEqual(['a', 'b', 'c']);
      app.unmount();
    });

    it('throws on duplicate plugin name BEFORE any install() runs', async () => {
      const installA = vi.fn();
      const installB = vi.fn();

      const a: LiteForgePlugin = { name: 'dup', install: installA };
      const b: LiteForgePlugin = { name: 'dup', install: installB };

      await expect(
        defineApp({ root: makeRoot(), target: container })
          .use(a)
          .use(b)
          .mount(),
      ).rejects.toThrow('Duplicate plugin name: "dup"');

      // Neither install should have been called
      expect(installA).not.toHaveBeenCalled();
      expect(installB).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // provide() / resolve() / use()
  // ──────────────────────────────────────────────────────────────────────────

  describe('provide() and resolve()', () => {
    it('plugin.provide() makes value accessible via app.use()', async () => {
      const api = { hello: 'world' };

      const plugin: LiteForgePlugin = {
        name: 'test',
        install(ctx) { ctx.provide('test', api); },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(plugin)
        .mount();

      expect(app.use<typeof api>('test')).toBe(api);
      app.unmount();
    });

    it('plugin.provide() makes value accessible inside components via use()', async () => {
      let capturedValue: unknown;

      const plugin: LiteForgePlugin = {
        name: 'svc',
        install(ctx) { ctx.provide('svc', { value: 42 }); },
      };

      const App = defineComponent({
        component: ({ use }) => {
          capturedValue = use<{ value: number }>('svc').value;
          return document.createTextNode('ok');
        },
      });

      const app = await defineApp({ root: App, target: container })
        .use(plugin)
        .mount();

      expect(capturedValue).toBe(42);
      app.unmount();
    });

    it('resolve() reads values provided by earlier plugins', async () => {
      let resolvedValue: unknown;

      const first: LiteForgePlugin = {
        name: 'first',
        install(ctx) { ctx.provide('shared', 'hello'); },
      };
      const second: LiteForgePlugin = {
        name: 'second',
        install(ctx) { resolvedValue = ctx.resolve('shared'); },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(first)
        .use(second)
        .mount();

      expect(resolvedValue).toBe('hello');
      app.unmount();
    });

    it('resolve() returns undefined for unregistered keys', async () => {
      let resolvedValue: unknown = 'SENTINEL';

      const plugin: LiteForgePlugin = {
        name: 'reader',
        install(ctx) { resolvedValue = ctx.resolve('nonexistent'); },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(plugin)
        .mount();

      expect(resolvedValue).toBeUndefined();
      app.unmount();
    });

    it('plugin-to-plugin: query reads optional toast (undefined when absent)', async () => {
      let toastResolved: unknown = 'SENTINEL';

      const queryLike: LiteForgePlugin = {
        name: 'query',
        install(ctx) {
          toastResolved = ctx.resolve('toast');
          ctx.provide('query', { cache: null });
        },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(queryLike)
        .mount();

      expect(toastResolved).toBeUndefined();
      app.unmount();
    });

    it('plugin-to-plugin: query reads toast when toast is registered first', async () => {
      let toastResolved: unknown;

      const toastPlugin: LiteForgePlugin = {
        name: 'toast',
        install(ctx) { ctx.provide('toast', { error: vi.fn() }); },
      };
      const queryLike: LiteForgePlugin = {
        name: 'query',
        install(ctx) {
          toastResolved = ctx.resolve('toast');
          ctx.provide('query', { cache: null });
        },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(toastPlugin)
        .use(queryLike)
        .mount();

      expect(toastResolved).toBeDefined();
      expect(typeof (toastResolved as { error: unknown }).error).toBe('function');
      app.unmount();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  describe('cleanup on destroy', () => {
    it('cleanup functions are called in reverse order on unmount', async () => {
      const order: string[] = [];

      const a: LiteForgePlugin = {
        name: 'a',
        install: () => () => { order.push('cleanup-a'); },
      };
      const b: LiteForgePlugin = {
        name: 'b',
        install: () => () => { order.push('cleanup-b'); },
      };
      const c: LiteForgePlugin = {
        name: 'c',
        install: () => () => { order.push('cleanup-c'); },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(a)
        .use(b)
        .use(c)
        .mount();

      app.unmount();
      expect(order).toEqual(['cleanup-c', 'cleanup-b', 'cleanup-a']);
    });

    it('plugin that throws during install cleans up previous plugins', async () => {
      const cleanupA = vi.fn();

      const a: LiteForgePlugin = {
        name: 'a',
        install: () => cleanupA,
      };
      const b: LiteForgePlugin = {
        name: 'b',
        install: () => { throw new Error('b failed'); },
      };

      await expect(
        defineApp({ root: makeRoot(), target: container })
          .use(a)
          .use(b)
          .mount(),
      ).rejects.toThrow('b failed');

      expect(cleanupA).toHaveBeenCalledTimes(1);
    });
  });


  // ──────────────────────────────────────────────────────────────────────────
  // PluginContext target
  // ──────────────────────────────────────────────────────────────────────────

  describe('PluginContext.target', () => {
    it('context.target is the resolved HTMLElement', async () => {
      let capturedTarget: HTMLElement | null = null;

      const plugin: LiteForgePlugin = {
        name: 'targetCheck',
        install(ctx) { capturedTarget = ctx.target; },
      };

      const app = await defineApp({ root: makeRoot(), target: container })
        .use(plugin)
        .mount();

      expect(capturedTarget).toBe(container);
      app.unmount();
    });
  });
});
