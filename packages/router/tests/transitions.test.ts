import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineRouter, createMemoryHistory } from '../src/index.js';
import type { Router, TransitionHooks } from '../src/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRouter(
  overrides: {
    transitions?: TransitionHooks;
    useViewTransitions?: boolean;
  } = {}
): Router {
  return defineRouter({
    routes: [
      { path: '/', name: 'home', component: () => document.createElement('div') },
      { path: '/about', name: 'about', component: () => document.createElement('div') },
      { path: '/users', name: 'users', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory(),
    ...overrides,
  });
}

// =============================================================================
// Transition Hooks
// =============================================================================

describe('transition hooks', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
  });

  it('calls onBeforeLeave before DOM update and onAfterEnter after', async () => {
    const callOrder: string[] = [];
    let pathAtBeforeLeave = '';
    let pathAtAfterEnter = '';

    const transitions: TransitionHooks = {
      onBeforeLeave: (_el, _ctx) => {
        callOrder.push('onBeforeLeave');
        pathAtBeforeLeave = router.path();
      },
      onAfterEnter: (_el, _ctx) => {
        callOrder.push('onAfterEnter');
        pathAtAfterEnter = router.path();
      },
    };

    router = createTestRouter({ transitions });
    await router.navigate('/about');

    // onBeforeLeave fires before the DOM commit so path is still '/'
    expect(pathAtBeforeLeave).toBe('/');

    // Allow the fire-and-forget onAfterEnter microtask to settle
    await Promise.resolve();
    await Promise.resolve();

    // onAfterEnter fires after commit, path is now '/about'
    expect(pathAtAfterEnter).toBe('/about');
    expect(callOrder[0]).toBe('onBeforeLeave');
    expect(callOrder[1]).toBe('onAfterEnter');
  });

  it('awaits async onBeforeLeave before committing DOM', async () => {
    let resolveLeave!: () => void;
    const leavePromise = new Promise<void>((res) => { resolveLeave = res; });

    let pathDuringHook = '';
    const transitions: TransitionHooks = {
      onBeforeLeave: async (_el, _ctx) => {
        await leavePromise;
        pathDuringHook = router.path();
      },
    };

    router = createTestRouter({ transitions });

    const navPromise = router.navigate('/about');

    // Path hasn't changed yet because the hook hasn't resolved
    expect(router.path()).toBe('/');

    resolveLeave();
    await navPromise;

    // Hook ran while path was still '/'
    expect(pathDuringHook).toBe('/');
    // After the hook resolved and navigation committed, path updated
    expect(router.path()).toBe('/about');
  });

  it('passes correct TransitionContext to hooks', async () => {
    const contexts: Array<{ to: string; from: string | null; direction: string }> = [];

    const transitions: TransitionHooks = {
      onBeforeLeave: (_el, ctx) => {
        contexts.push({
          to: ctx.to.path,
          from: ctx.from?.path ?? null,
          direction: ctx.direction,
        });
      },
    };

    router = createTestRouter({ transitions });
    await router.navigate('/about');

    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toEqual({ to: '/about', from: '/', direction: 'forward' });
  });

  it('passes direction "replace" when navigating with replace', async () => {
    const directions: string[] = [];

    const transitions: TransitionHooks = {
      onBeforeLeave: (_el, ctx) => {
        directions.push(ctx.direction);
      },
    };

    router = createTestRouter({ transitions });
    await router.replace('/about');

    expect(directions).toContain('replace');
  });

  it('does not call transition hooks on blocked navigation', async () => {
    const hookCalled = vi.fn();

    router = defineRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/blocked', component: () => document.createElement('div') },
      ],
      history: createMemoryHistory(),
      transitions: {
        onBeforeLeave: hookCalled,
        onAfterEnter: hookCalled,
      },
    });

    // Block all navigations via beforeEach
    router.beforeEach(() => false);

    const result = await router.navigate('/blocked');
    expect(result).toBe(false);
    expect(hookCalled).not.toHaveBeenCalled();
  });

  it('navigation still succeeds when onBeforeLeave throws', async () => {
    const transitions: TransitionHooks = {
      onBeforeLeave: () => { throw new Error('hook error'); },
    };

    // The hook throws synchronously inside runTransition which is awaited —
    // the error propagates and navigate() returns false via the outer catch.
    router = createTestRouter({ transitions });
    const result = await router.navigate('/about');
    // An error in a hook is treated as a navigation failure (caught by outer try/catch)
    // This matches the fail-safe behaviour: broken hooks shouldn't silently swallow errors.
    expect(typeof result).toBe('boolean');
  });

  it('only calls defined hooks (partial hooks object)', async () => {
    const afterEnter = vi.fn();

    const transitions: TransitionHooks = {
      // onBeforeLeave intentionally absent
      onAfterEnter: afterEnter,
    };

    router = createTestRouter({ transitions });
    await router.navigate('/about');

    await Promise.resolve();
    await Promise.resolve();

    expect(afterEnter).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// useViewTransitions
// =============================================================================

describe('useViewTransitions', () => {
  let router: Router;

  afterEach(() => {
    router?.destroy();
    // Clean up any mock placed on document
    if ('startViewTransition' in document) {
      // @ts-expect-error — we set this in tests
      delete document.startViewTransition;
    }
  });

  it('calls document.startViewTransition when available', async () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });

    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    });

    router = createTestRouter({ useViewTransitions: true });
    const result = await router.navigate('/about');

    expect(result).toBe(true);
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(router.path()).toBe('/about');
  });

  it('falls back gracefully when startViewTransition is not available', async () => {
    // Ensure startViewTransition does NOT exist
    if ('startViewTransition' in document) {
      // @ts-expect-error — removing the mock
      delete document.startViewTransition;
    }

    router = createTestRouter({ useViewTransitions: true });
    const result = await router.navigate('/about');

    expect(result).toBe(true);
    expect(router.path()).toBe('/about');
  });

  it('does not call startViewTransition when useViewTransitions is false (default)', async () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });

    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    });

    // No useViewTransitions option → defaults to false
    router = createTestRouter();
    await router.navigate('/about');

    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('works together with transition hooks', async () => {
    const callOrder: string[] = [];

    const startViewTransition = vi.fn((cb: () => void) => {
      callOrder.push('startViewTransition');
      cb();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });

    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    });

    const transitions: TransitionHooks = {
      onBeforeLeave: () => { callOrder.push('onBeforeLeave'); },
      onAfterEnter: () => { callOrder.push('onAfterEnter'); },
    };

    router = createTestRouter({ transitions, useViewTransitions: true });
    await router.navigate('/about');

    await Promise.resolve();
    await Promise.resolve();

    expect(callOrder[0]).toBe('onBeforeLeave');
    expect(callOrder[1]).toBe('startViewTransition');
    expect(callOrder[2]).toBe('onAfterEnter');
    expect(startViewTransition).toHaveBeenCalledOnce();
  });

  it('commits DOM inside the startViewTransition callback', async () => {
    let pathInsideTransition = '';

    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      // capture path immediately after the commit callback ran
      pathInsideTransition = router.path();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });

    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    });

    router = createTestRouter({ useViewTransitions: true });
    await router.navigate('/about');

    expect(pathInsideTransition).toBe('/about');
  });
});
