import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveModuleExport,
  isWrappedLazyComponent,
  detectInlineLazyImport,
  wrapInlineLazy,
  processRouteComponent,
  lazy,
  isLazyComponent,
} from '../src/lazy.js';
import { compileRoute, compileRoutes } from '../src/route-matcher.js';
import { defineRouter } from '../src/router.js';
import type { 
  RouteComponent, 
  LazyImportFn, 
  RouteLazyConfig, 
  LazyDefaults,
  RouteDefinition,
} from '../src/types.js';

// Helper to wait for promises
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock component factory
function createMockComponent(name: string): RouteComponent {
  const fn = () => {
    const div = document.createElement('div');
    div.textContent = name;
    div.id = name.toLowerCase();
    return div;
  };
  fn.displayName = name;
  return fn;
}

// Mock module factory
function createMockModule(defaultExport: RouteComponent, namedExports?: Record<string, RouteComponent>) {
  return {
    default: defaultExport,
    ...namedExports,
  };
}

// =============================================================================
// resolveModuleExport
// =============================================================================

describe('resolveModuleExport', () => {
  describe('explicit export name', () => {
    it('resolves named export when specified', () => {
      const AdminDashboard = createMockComponent('AdminDashboard');
      const module = {
        default: createMockComponent('Default'),
        AdminDashboard,
        OtherComponent: createMockComponent('Other'),
      };

      const result = resolveModuleExport(module, 'AdminDashboard');
      expect(result).toBe(AdminDashboard);
    });

    it('throws if named export does not exist', () => {
      const module = {
        default: createMockComponent('Default'),
      };

      expect(() => resolveModuleExport(module, 'NonExistent')).toThrow(
        'Export "NonExistent" not found or not a function'
      );
    });

    it('throws if named export is not a function', () => {
      const module = {
        default: createMockComponent('Default'),
        config: { apiUrl: '/api' },
      };

      expect(() => resolveModuleExport(module, 'config')).toThrow(
        'Export "config" not found or not a function'
      );
    });

    it('lists available exports in error message', () => {
      const module = {
        default: createMockComponent('Default'),
        Helper: createMockComponent('Helper'),
      };

      expect(() => resolveModuleExport(module, 'Missing')).toThrow(
        'Available exports: default, Helper'
      );
    });
  });

  describe('default export', () => {
    it('resolves default export when no export name specified', () => {
      const DefaultComponent = createMockComponent('Default');
      const module = {
        default: DefaultComponent,
        Named: createMockComponent('Named'),
      };

      const result = resolveModuleExport(module);
      expect(result).toBe(DefaultComponent);
    });
  });

  describe('fallback to first function export', () => {
    it('uses first function export when no default', () => {
      const FirstComponent = createMockComponent('First');
      const module = {
        FirstComponent,
        SecondComponent: createMockComponent('Second'),
      };

      const result = resolveModuleExport(module);
      expect(result).toBe(FirstComponent);
    });

    it('skips non-function exports', () => {
      const Component = createMockComponent('Component');
      const module = {
        config: { setting: true },
        Component,
        anotherConfig: 'string',
      };

      const result = resolveModuleExport(module);
      expect(result).toBe(Component);
    });

    it('throws when no component found in module', () => {
      const module = {
        config: { setting: true },
        version: '1.0.0',
      };

      expect(() => resolveModuleExport(module)).toThrow(
        'No component found in lazy-loaded module'
      );
    });
  });
});

// =============================================================================
// isWrappedLazyComponent
// =============================================================================

describe('isWrappedLazyComponent', () => {
  it('returns true for components wrapped with lazy()', () => {
    const LazyComp = lazy(() => Promise.resolve({ default: createMockComponent('Test') }));
    expect(isWrappedLazyComponent(LazyComp)).toBe(true);
  });

  it('returns false for plain functions', () => {
    const plainFn = () => Promise.resolve({ default: createMockComponent('Test') });
    expect(isWrappedLazyComponent(plainFn)).toBe(false);
  });

  it('returns false for inline import functions', () => {
    // Simulate what `() => import('./Comp')` looks like
    const inlineImport = () => Promise.resolve({ default: createMockComponent('Test') });
    expect(isWrappedLazyComponent(inlineImport)).toBe(false);
  });

  it('returns false for static components', () => {
    const staticComp = createMockComponent('Static');
    expect(isWrappedLazyComponent(staticComp)).toBe(false);
  });
});

// =============================================================================
// detectInlineLazyImport
// =============================================================================

describe('detectInlineLazyImport', () => {
  it('returns false for non-functions', () => {
    expect(detectInlineLazyImport(null)).toBe(false);
    expect(detectInlineLazyImport(undefined)).toBe(false);
    expect(detectInlineLazyImport({})).toBe(false);
    expect(detectInlineLazyImport('string')).toBe(false);
    expect(detectInlineLazyImport(123)).toBe(false);
  });

  it('returns false for pre-wrapped lazy components', () => {
    const LazyComp = lazy(() => Promise.resolve({ default: createMockComponent('Test') }));
    expect(detectInlineLazyImport(LazyComp)).toBe(false);
  });

  it('returns false for static components (no import in body)', () => {
    const staticComp = createMockComponent('Static');
    expect(detectInlineLazyImport(staticComp)).toBe(false);
  });

  it('detects functions with import() in body', () => {
    // We can't use actual dynamic import here, but we can create a function
    // whose toString() contains 'import('
    const fakeInlineImport = new Function('return import("./Component.js")') as LazyImportFn;
    expect(detectInlineLazyImport(fakeInlineImport)).toBe(true);
  });

  it('detects functions with import ( in body (with space)', () => {
    const fakeInlineImport = new Function('return import ("./Component.js")') as LazyImportFn;
    expect(detectInlineLazyImport(fakeInlineImport)).toBe(true);
  });

  it('caches detection result', () => {
    const fn = new Function('return import("./Comp.js")') as LazyImportFn;
    
    // First call
    const result1 = detectInlineLazyImport(fn);
    // Second call should use cache
    const result2 = detectInlineLazyImport(fn);
    
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});

// =============================================================================
// wrapInlineLazy
// =============================================================================

describe('wrapInlineLazy', () => {
  it('wraps inline import into lazy component', async () => {
    const MockComponent = createMockComponent('Test');
    const importFn: LazyImportFn = () => Promise.resolve({ default: MockComponent });

    const wrapped = wrapInlineLazy(importFn, undefined, undefined, undefined);

    expect(isLazyComponent(wrapped)).toBe(true);
    expect(wrapped.isLoaded()).toBe(false);

    const result = await wrapped();
    expect(wrapped.isLoaded()).toBe(true);
    expect('default' in result ? result.default : result).toBe(MockComponent);
  });

  it('resolves named export when specified', async () => {
    const AdminPage = createMockComponent('AdminPage');
    const importFn: LazyImportFn = () => Promise.resolve({
      default: createMockComponent('Default'),
      AdminPage,
    });

    const wrapped = wrapInlineLazy(importFn, 'AdminPage', undefined, undefined);
    const result = await wrapped();
    const component = 'default' in result ? result.default : result;
    
    expect(component).toBe(AdminPage);
  });

  it('applies route-level lazy config', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });
    const routeConfig: RouteLazyConfig = {
      delay: 500,
      timeout: 15000,
      minLoadTime: 100,
    };

    const wrapped = wrapInlineLazy(importFn, undefined, routeConfig, undefined);
    
    // Access internal options
    const options = (wrapped as unknown as { __options: { delay: number; timeout: number; minLoadTime: number } }).__options;
    expect(options.delay).toBe(500);
    expect(options.timeout).toBe(15000);
    expect(options.minLoadTime).toBe(100);
  });

  it('applies global lazy defaults', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });
    const globalDefaults: LazyDefaults = {
      delay: 300,
      timeout: 8000,
    };

    const wrapped = wrapInlineLazy(importFn, undefined, undefined, globalDefaults);
    
    const options = (wrapped as unknown as { __options: { delay: number; timeout: number } }).__options;
    expect(options.delay).toBe(300);
    expect(options.timeout).toBe(8000);
  });

  it('route config overrides global defaults', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });
    const globalDefaults: LazyDefaults = {
      delay: 300,
      timeout: 8000,
    };
    const routeConfig: RouteLazyConfig = {
      delay: 100,  // Override global
    };

    const wrapped = wrapInlineLazy(importFn, undefined, routeConfig, globalDefaults);
    
    const options = (wrapped as unknown as { __options: { delay: number; timeout: number } }).__options;
    expect(options.delay).toBe(100);  // Route config wins
    expect(options.timeout).toBe(8000);  // Falls back to global
  });

  it('uses sensible defaults when no config provided', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });

    const wrapped = wrapInlineLazy(importFn, undefined, undefined, undefined);
    
    const options = (wrapped as unknown as { __options: { delay: number; timeout: number } }).__options;
    expect(options.delay).toBe(200);  // Default delay
    expect(options.timeout).toBe(10000);  // Default timeout
  });
});

// =============================================================================
// processRouteComponent
// =============================================================================

describe('processRouteComponent', () => {
  it('returns undefined for undefined component', () => {
    const result = processRouteComponent(undefined, undefined, undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns static component as-is', () => {
    const staticComp = createMockComponent('Static');
    const result = processRouteComponent(staticComp, undefined, undefined, undefined);
    expect(result).toBe(staticComp);
  });

  it('returns pre-wrapped lazy component as-is', () => {
    const LazyComp = lazy(() => Promise.resolve({ default: createMockComponent('Test') }));
    const result = processRouteComponent(LazyComp, undefined, undefined, undefined);
    expect(result).toBe(LazyComp);
  });

  it('wraps inline lazy import', () => {
    const fakeImport = new Function('return import("./Comp.js")') as LazyImportFn;
    // Mock the actual import resolution
    (fakeImport as unknown as { _mockResolve: () => Promise<Record<string, unknown>> })._mockResolve = 
      () => Promise.resolve({ default: createMockComponent('Test') });

    const result = processRouteComponent(fakeImport, undefined, undefined, undefined);
    
    // Should be wrapped in lazy()
    expect(isLazyComponent(result)).toBe(true);
  });

  it('passes export name to wrapper', async () => {
    const AdminComp = createMockComponent('Admin');
    const importFn: LazyImportFn = () => Promise.resolve({
      default: createMockComponent('Default'),
      AdminComp,
    });
    
    // Make it look like an inline import
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Admin.js")',
    });

    const result = processRouteComponent(importFn, 'AdminComp', undefined, undefined);
    
    if (isLazyComponent(result)) {
      const loaded = await result();
      const component = 'default' in loaded ? loaded.default : loaded;
      expect(component).toBe(AdminComp);
    } else {
      throw new Error('Expected lazy component');
    }
  });
});

// =============================================================================
// compileRoute with inline lazy
// =============================================================================

describe('compileRoute with inline lazy', () => {
  it('processes static component', () => {
    const HomePage = createMockComponent('Home');
    const definition: RouteDefinition = {
      path: '/',
      component: HomePage,
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.component).toBe(HomePage);
  });

  it('processes pre-wrapped lazy component', () => {
    const LazyPage = lazy(() => Promise.resolve({ default: createMockComponent('Page') }));
    const definition: RouteDefinition = {
      path: '/page',
      component: LazyPage,
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.component).toBe(LazyPage);
  });

  it('stores export name in compiled route', () => {
    const definition: RouteDefinition = {
      path: '/admin',
      component: createMockComponent('Admin'),
      export: 'AdminDashboard',
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.exportName).toBe('AdminDashboard');
  });

  it('stores loading component in compiled route', () => {
    const LoadingComp = createMockComponent('Loading');
    const definition: RouteDefinition = {
      path: '/page',
      component: createMockComponent('Page'),
      loading: LoadingComp,
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.loadingComponent).toBe(LoadingComp);
  });

  it('stores lazy config in compiled route', () => {
    const lazyConfig: RouteLazyConfig = {
      delay: 500,
      timeout: 15000,
    };
    const definition: RouteDefinition = {
      path: '/page',
      component: createMockComponent('Page'),
      lazy: lazyConfig,
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.lazyConfig).toEqual(lazyConfig);
  });

  it('passes lazyDefaults through compilation', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Test.js")',
    });

    const lazyDefaults: LazyDefaults = {
      delay: 300,
      timeout: 8000,
    };
    const definition: RouteDefinition = {
      path: '/test',
      component: importFn,
    };

    const compiled = compileRoute(definition, null, { 
      guardRegistry: new Map(),
      lazyDefaults,
    });

    // Should be wrapped with the defaults applied
    expect(isLazyComponent(compiled.component)).toBe(true);
    if (isLazyComponent(compiled.component)) {
      const options = (compiled.component as unknown as { __options: { delay: number; timeout: number } }).__options;
      expect(options.delay).toBe(300);
      expect(options.timeout).toBe(8000);
    }
  });

  it('compiles children with same lazyDefaults', () => {
    const childImport: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Child') });
    Object.defineProperty(childImport, 'toString', {
      value: () => '() => import("./Child.js")',
    });

    const lazyDefaults: LazyDefaults = {
      delay: 400,
    };
    const definition: RouteDefinition = {
      path: '/parent',
      component: createMockComponent('Parent'),
      children: [
        { path: '/child', component: childImport },
      ],
    };

    const compiled = compileRoute(definition, null, { 
      guardRegistry: new Map(),
      lazyDefaults,
    });

    const childRoute = compiled.children[0];
    expect(childRoute).toBeDefined();
    expect(isLazyComponent(childRoute?.component)).toBe(true);
  });
});

// =============================================================================
// compileRoutes with inline lazy
// =============================================================================

describe('compileRoutes with lazyDefaults', () => {
  it('passes lazyDefaults to all routes', () => {
    const import1: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Page1') });
    const import2: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Page2') });
    
    Object.defineProperty(import1, 'toString', { value: () => '() => import("./1.js")' });
    Object.defineProperty(import2, 'toString', { value: () => '() => import("./2.js")' });

    const routes: RouteDefinition[] = [
      { path: '/page1', component: import1 },
      { path: '/page2', component: import2 },
    ];

    const lazyDefaults: LazyDefaults = { delay: 250 };
    const compiled = compileRoutes(routes, new Map(), lazyDefaults);

    expect(compiled).toHaveLength(2);
    
    for (const route of compiled) {
      expect(isLazyComponent(route.component)).toBe(true);
      if (isLazyComponent(route.component)) {
        const options = (route.component as unknown as { __options: { delay: number } }).__options;
        expect(options.delay).toBe(250);
      }
    }
  });
});

// =============================================================================
// defineRouter with lazyDefaults
// =============================================================================

describe('defineRouter with lazyDefaults', () => {
  it('passes lazyDefaults to route compilation', () => {
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Test') });
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Test.js")',
    });

    const router = defineRouter({
      routes: [
        { path: '/test', component: importFn },
      ],
      lazyDefaults: {
        delay: 150,
        timeout: 5000,
      },
    });

    // Access compiled routes
    const compiled = (router as unknown as { _compiledRoutes: Array<{ component: unknown }> })._compiledRoutes;
    const testRoute = compiled.find(r => 'component' in r);
    
    expect(testRoute).toBeDefined();
    expect(isLazyComponent(testRoute?.component)).toBe(true);

    router.destroy();
  });

  it('supports mixed static and lazy routes', async () => {
    const HomePage = createMockComponent('Home');
    const importFn: LazyImportFn = () => Promise.resolve({ default: createMockComponent('Dashboard') });
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Dashboard.js")',
    });

    const router = defineRouter({
      routes: [
        { path: '/', component: HomePage },
        { path: '/dashboard', component: importFn },
      ],
    });

    const compiled = (router as unknown as { _compiledRoutes: Array<{ path: string; component: unknown }> })._compiledRoutes;
    
    // Home is static
    const homeRoute = compiled.find(r => r.path === '/');
    expect(homeRoute?.component).toBe(HomePage);
    expect(isLazyComponent(homeRoute?.component)).toBe(false);

    // Dashboard is lazy
    const dashboardRoute = compiled.find(r => r.path === '/dashboard');
    expect(isLazyComponent(dashboardRoute?.component)).toBe(true);

    router.destroy();
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe('edge cases', () => {
  it('handles route without component', () => {
    const definition: RouteDefinition = {
      path: '/redirect',
      redirect: '/home',
    };

    const compiled = compileRoute(definition, null, { guardRegistry: new Map() });
    expect(compiled.component).toBeUndefined();
    expect(compiled.redirect).toBe('/home');
  });

  it('handles empty module gracefully', async () => {
    const importFn: LazyImportFn = () => Promise.resolve({});
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Empty.js")',
    });

    const wrapped = wrapInlineLazy(importFn, undefined, undefined, undefined);
    
    await expect(wrapped()).rejects.toThrow('No component found');
  });

  it('handles module with only non-function exports', async () => {
    const importFn: LazyImportFn = () => Promise.resolve({
      version: '1.0.0',
      config: { debug: true },
    });
    Object.defineProperty(importFn, 'toString', {
      value: () => '() => import("./Config.js")',
    });

    const wrapped = wrapInlineLazy(importFn, undefined, undefined, undefined);
    
    await expect(wrapped()).rejects.toThrow('No component found');
  });
});
