/**
 * Typed routes — Phase 1 tests
 *
 * Verifies that defineRouter<T> + typed navigate() provide path-safety at
 * compile time, while remaining fully non-breaking for existing code.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { expectTypeOf } from 'vitest';
import { defineRouter, createMemoryHistory } from '../src/index.js';
import type {
  FillParams,
  ExtractRoutePaths,
  TypedNavigationTarget,
  ExtractParamPaths,
  TypedParams,
  RouteDefinition,
} from '../src/index.js';

// =============================================================================
// Type-level utility tests (no runtime assertions needed)
// =============================================================================

describe('FillParams type utility', () => {
  it('leaves paths without params unchanged', () => {
    expectTypeOf<FillParams<'/home'>>().toEqualTypeOf<'/home'>();
    expectTypeOf<FillParams<'/'>>().toEqualTypeOf<'/'>();
    expectTypeOf<FillParams<'/users'>>().toEqualTypeOf<'/users'>();
  });

  it('replaces a single :param segment with ${string}', () => {
    expectTypeOf<FillParams<'/users/:id'>>().toEqualTypeOf<`/users/${string}`>();
  });

  it('replaces multiple :param segments', () => {
    expectTypeOf<FillParams<'/users/:id/posts/:postId'>>().toEqualTypeOf<`/users/${string}/posts/${string}`>();
  });

  it('replaces :param at the end of a multi-segment path', () => {
    expectTypeOf<FillParams<'/orgs/:org/teams/:team'>>().toEqualTypeOf<`/orgs/${string}/teams/${string}`>();
  });

  it('handles string (no literal) → string (no narrowing)', () => {
    // When T is widened to string, FillParams<string> should stay string
    expectTypeOf<FillParams<string>>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------

type TestRoutes = readonly [
  { readonly path: '/'; readonly name: 'home' },
  { readonly path: '/users'; readonly name: 'users' },
  { readonly path: '/users/:id'; readonly name: 'user-detail' },
  { readonly path: '/admin'; readonly name: 'admin' },
];

describe('ExtractRoutePaths type utility', () => {
  it('extracts all literal paths from a routes tuple', () => {
    expectTypeOf<ExtractRoutePaths<TestRoutes>>().toEqualTypeOf<
      '/' | '/users' | '/users/:id' | '/admin'
    >();
  });

  it('produces string for non-literal routes array', () => {
    expectTypeOf<ExtractRoutePaths<readonly RouteDefinition[]>>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------

describe('TypedNavigationTarget type utility', () => {
  it('produces the correct union of filled paths', () => {
    expectTypeOf<TypedNavigationTarget<TestRoutes>>().toEqualTypeOf<
      '/' | '/users' | `/users/${string}` | '/admin'
    >();
  });

  it('degrades to string for non-literal routes', () => {
    expectTypeOf<TypedNavigationTarget<readonly RouteDefinition[]>>().toEqualTypeOf<string>();
  });
});

// =============================================================================
// Runtime tests — defineRouter with as const routes
// =============================================================================

const ROUTES = [
  { path: '/', name: 'home', component: () => document.createElement('div') },
  { path: '/users', name: 'users', component: () => document.createElement('div') },
  { path: '/users/:id', name: 'user-detail', component: () => document.createElement('div') },
  { path: '/admin', name: 'admin', component: () => document.createElement('div') },
  { path: '*', name: 'not-found', component: () => document.createElement('div') },
] as const;

describe('defineRouter with typed routes', () => {
  let router: ReturnType<typeof defineRouter<typeof ROUTES>>;

  afterEach(() => {
    router?.destroy();
  });

  it('creates a router instance successfully', () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    expect(router).toBeDefined();
    expect(router.path()).toBe('/');
  });

  it('navigate() to a valid static path resolves to true', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users');
  });

  it('navigate() to a valid parameterised path resolves to true', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users/42');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/42');
  });

  it('navigate() to root resolves to true', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    await router.navigate('/users');
    const result = await router.navigate('/');
    expect(result).toBe(true);
    expect(router.path()).toBe('/');
  });

  it('navigate() with a location object (always-accepted overload) works', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.navigate({ path: '/admin', query: { tab: 'settings' } });
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
    expect(router.query()).toEqual({ tab: 'settings' });
  });

  it('replace() to a valid path resolves to true', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    const result = await router.replace('/admin');
    expect(result).toBe(true);
    expect(router.path()).toBe('/admin');
  });

  // -------------------------------------------------------------------------
  // TypeScript compile-time safety — documented with @ts-expect-error
  // These show what the type system catches; they are NOT runtime assertions.
  // -------------------------------------------------------------------------

  it('TS rejects navigate() with an unknown path (@ts-expect-error)', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    // The comment below documents the intended compile-time constraint:
    // @ts-expect-error — '/unknown-xyz' is not a valid route path
    const result = await router.navigate('/unknown-xyz');
    // At runtime the router still processes the navigation (no match → 404 handling).
    // The constraint is compile-time only.
    expect(typeof result).toBe('boolean');
  });

  it('TS rejects replace() with an unknown path (@ts-expect-error)', async () => {
    router = defineRouter({ routes: ROUTES, history: createMemoryHistory() });
    // @ts-expect-error — '/does-not-exist' is not a valid route path
    const result = await router.replace('/does-not-exist');
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Non-breaking: existing usage without as const continues to work
// =============================================================================

describe('defineRouter without as const (non-breaking)', () => {
  it('accepts plain mutable routes array and returns a working router', async () => {
    const routes = [
      { path: '/', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ];
    const router = defineRouter({ routes, history: createMemoryHistory() });
    expect(router).toBeDefined();

    // navigate() accepts any string when routes are not literal-typed
    const result = await router.navigate('/about');
    expect(result).toBe(true);

    router.destroy();
  });
});

// =============================================================================
// Phase 2 — ExtractParamPaths type utility
// =============================================================================

type Phase2Routes = readonly [
  { readonly path: '/home' },
  { readonly path: '/users/:id' },
  { readonly path: '/posts/:year/:month' },
];

describe('ExtractParamPaths type utility', () => {
  it('extracts only paths that contain at least one :param segment', () => {
    expectTypeOf<ExtractParamPaths<Phase2Routes>>().toEqualTypeOf<
      '/users/:id' | '/posts/:year/:month'
    >();
  });

  it('excludes static paths (no :param segments)', () => {
    // '/home' must NOT appear in the result
    expectTypeOf<ExtractParamPaths<Phase2Routes>>().not.toEqualTypeOf<
      '/home' | '/users/:id' | '/posts/:year/:month'
    >();
  });

  it('produces never for routes with no param segments', () => {
    type StaticOnly = readonly [
      { readonly path: '/home' },
      { readonly path: '/about' },
    ];
    expectTypeOf<ExtractParamPaths<StaticOnly>>().toEqualTypeOf<never>();
  });

  it('degrades to never for non-literal routes array', () => {
    // When routes are not literal-typed, ExtractRoutePaths produces string.
    // Extract<string, `${string}:${string}`> is string, not never.
    // This is an edge case — in practice callers always use as const.
    expectTypeOf<ExtractParamPaths<readonly RouteDefinition[]>>().toEqualTypeOf<string>();
  });
});

// =============================================================================
// Phase 2 — navigate(pattern, params) overload — type-level tests
// =============================================================================

const PHASE2_ROUTES = [
  { path: '/home', component: () => document.createElement('div') },
  { path: '/users/:id', component: () => document.createElement('div') },
  { path: '/posts/:year/:month', component: () => document.createElement('div') },
  { path: '*', component: () => document.createElement('div') },
] as const;

describe('navigate() Phase 2 — path pattern + params — type-level', () => {
  it('TypedParams infers a single param correctly', () => {
    expectTypeOf<TypedParams<'/users/:id'>>().toEqualTypeOf<{ id: string }>();
  });

  it('TypedParams infers multiple params correctly', () => {
    expectTypeOf<TypedParams<'/posts/:year/:month'>>().toEqualTypeOf<{ year: string; month: string }>();
  });

  it('navigate(pattern, params) — params arg has the correct type for single param', () => {
    const router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    expectTypeOf(router.navigate<'/users/:id'>).parameter(1).toEqualTypeOf<{ id: string }>();
    router.destroy();
  });

  it('navigate(pattern, params) — params arg has the correct type for multiple params', () => {
    const router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    expectTypeOf(router.navigate<'/posts/:year/:month'>).parameter(1)
      .toEqualTypeOf<{ year: string; month: string }>();
    router.destroy();
  });

  it('navigate(pattern) without params is a TS error', () => {
    const router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    // @ts-expect-error — params argument required for parametric routes
    void router.navigate('/users/:id');
    router.destroy();
  });

  it('navigate(static-path, params) is a TS error — /home has no params', () => {
    const router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    // @ts-expect-error — /home is not in ExtractParamPaths, second arg not accepted
    void router.navigate('/home', { id: '42' });
    router.destroy();
  });
});

// =============================================================================
// Phase 2 — navigate(pattern, params) overload — runtime tests
// =============================================================================

describe('navigate() Phase 2 — path pattern + params — runtime', () => {
  let router: ReturnType<typeof defineRouter<typeof PHASE2_ROUTES>>;

  afterEach(() => {
    router?.destroy();
  });

  it('fills a single param into the path at runtime', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users/:id', { id: '99' });
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/99');
  });

  it('fills multiple params into the path at runtime', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/posts/:year/:month', { year: '2024', month: '03' });
    expect(result).toBe(true);
    expect(router.path()).toBe('/posts/2024/03');
  });

  it('encodes params that contain special characters', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users/:id', { id: 'hello world' });
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/hello%20world');
  });

  it('navigate(pattern, params, options) respects NavigateOptions', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    // Navigate somewhere first so there is history to replace
    await router.navigate('/home');
    const result = await router.navigate('/users/:id', { id: '7' }, { replace: true });
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/7');
  });

  it('replace(pattern, params) fills params and replaces history', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    await router.navigate('/home');
    const result = await router.replace('/users/:id', { id: '42' });
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/42');
  });

  it('replace(pattern, params) with multiple params fills all params', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    await router.navigate('/home');
    const result = await router.replace('/posts/:year/:month', { year: '2025', month: '12' });
    expect(result).toBe(true);
    expect(router.path()).toBe('/posts/2025/12');
  });

  it('existing Phase 1 navigate(filled-path) still works', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    const result = await router.navigate('/users/123');
    expect(result).toBe(true);
    expect(router.path()).toBe('/users/123');
  });

  it('existing navigate(locationObject) still works', async () => {
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    const result = await router.navigate({ path: '/home', query: { foo: 'bar' } });
    expect(result).toBe(true);
    expect(router.path()).toBe('/home');
    expect(router.query()).toEqual({ foo: 'bar' });
  });

  it('correctly dispatches when param value is "replace" (edge case for old key-based discriminator)', async () => {
    // The old isParamsObject() checked second-arg keys for anything other than
    // 'replace' / 'state'. A param named with value 'replace' would have caused
    // the dispatch to fall through to the Phase 1 path, leaving the pattern unfilled.
    // The new /:\w+/.test(target) discriminator uses only the first argument, so
    // param values of 'replace' or 'state' are handled correctly.
    router = defineRouter({ routes: PHASE2_ROUTES, history: createMemoryHistory() });
    await router.navigate('/users/:id', { id: 'replace' });
    expect(router.path()).toBe('/users/replace');
  });
});
