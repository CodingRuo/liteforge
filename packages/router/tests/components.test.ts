import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@liteforge/core';
import { defineComponent, pushContext, popContext, clearContext } from '@liteforge/runtime';
import { defineRouter, createMemoryHistory, RouterOutlet, Link, lazy } from '../src/index.js';
import type { Router, RouteDefinition } from '../src/types.js';

// Helper to wait for async updates
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to wait for MutationObserver
const waitForMutation = () => new Promise(resolve => setTimeout(resolve, 10));

// =============================================================================
// Test Setup
// =============================================================================

function createTestRouter(routes: RouteDefinition[], initialPath = '/'): Router {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return defineRouter({ routes, history });
}

function setupContext(router: Router, extra: Record<string, unknown> = {}): void {
  pushContext({ router, ...extra });
}

// =============================================================================
// RouterOutlet Tests
// =============================================================================

describe('RouterOutlet', () => {
  let router: Router;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    clearContext();
  });

  afterEach(() => {
    router?.destroy();
    container.remove();
    clearContext();
  });

  it('renders current route component', async () => {
    router = createTestRouter([
      { 
        path: '/', 
        component: () => {
          const div = document.createElement('div');
          div.textContent = 'Home';
          div.id = 'home';
          return div;
        },
      },
    ]);

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();

    expect(container.querySelector('#home')).not.toBeNull();
    expect(container.textContent).toContain('Home');
  });

  it('swaps component when route changes', async () => {
    router = createTestRouter([
      { 
        path: '/', 
        component: () => {
          const div = document.createElement('div');
          div.id = 'home';
          div.textContent = 'Home';
          return div;
        },
      },
      { 
        path: '/about', 
        component: () => {
          const div = document.createElement('div');
          div.id = 'about';
          div.textContent = 'About';
          return div;
        },
      },
    ]);

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();
    expect(container.querySelector('#home')).not.toBeNull();

    await router.navigate('/about');
    await waitForMutation();

    expect(container.querySelector('#home')).toBeNull();
    expect(container.querySelector('#about')).not.toBeNull();
    expect(container.textContent).toContain('About');
  });

  it('passes params as props to route component', async () => {
    let receivedParams: Record<string, string> = {};

    router = createTestRouter([
      { 
        path: '/users/:id', 
        component: ({ params }: { params: Record<string, string> }) => {
          receivedParams = params;
          const div = document.createElement('div');
          div.textContent = `User ${params.id}`;
          return div;
        },
      },
    ], '/users/42');

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();

    expect(receivedParams).toEqual({ id: '42' });
    expect(container.textContent).toContain('User 42');
  });

  it('passes query as props to route component', async () => {
    let receivedQuery: Record<string, string | string[]> = {};

    router = createTestRouter([
      { 
        path: '/search', 
        component: ({ query }: { query: Record<string, string | string[]> }) => {
          receivedQuery = query;
          const div = document.createElement('div');
          div.textContent = `Search: ${query.q}`;
          return div;
        },
      },
    ], '/search?q=test');

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();

    expect(receivedQuery).toEqual({ q: 'test' });
  });

  it('renders fallback when no route matches', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
    ], '/nonexistent');

    setupContext(router);
    const outlet = RouterOutlet({
      fallback: () => {
        const div = document.createElement('div');
        div.id = 'fallback';
        div.textContent = 'Not Found';
        return div;
      },
    });
    container.appendChild(outlet);

    await waitForMutation();

    expect(container.querySelector('#fallback')).not.toBeNull();
    expect(container.textContent).toContain('Not Found');
  });

  it('renders nothing when no match and no fallback', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
    ], '/nonexistent');

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();

    // Should only have the comment placeholder
    expect(container.children.length).toBe(0);
  });

  it('works with defineComponent factories', async () => {
    const TestComponent = defineComponent({
      props: {
        params: { type: Object, default: () => ({}) },
      },
      component: ({ props }) => {
        const div = document.createElement('div');
        div.id = 'factory-component';
        div.textContent = `ID: ${(props.params as Record<string, string>).id || 'none'}`;
        return div;
      },
    });

    router = createTestRouter([
      { path: '/users/:id', component: TestComponent },
    ], '/users/123');

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();

    expect(container.querySelector('#factory-component')).not.toBeNull();
  });

  it('throws error when router not in context', () => {
    clearContext();
    expect(() => RouterOutlet()).toThrow('RouterOutlet requires a router in context');
  });
});

// =============================================================================
// Nested RouterOutlet Tests
// =============================================================================

describe('Nested RouterOutlet', () => {
  let router: Router;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    clearContext();
  });

  afterEach(() => {
    router?.destroy();
    container.remove();
    clearContext();
  });

  it('renders child route at correct depth', async () => {
    // Create layout that contains a nested outlet
    const AdminLayout = () => {
      const div = document.createElement('div');
      div.id = 'admin-layout';
      
      const header = document.createElement('h1');
      header.textContent = 'Admin';
      div.appendChild(header);

      const outlet = RouterOutlet();
      div.appendChild(outlet);

      return div;
    };

    router = createTestRouter([
      {
        path: '/admin',
        component: AdminLayout,
        children: [
          {
            path: '/users',
            component: () => {
              const div = document.createElement('div');
              div.id = 'admin-users';
              div.textContent = 'Admin Users';
              return div;
            },
          },
        ],
      },
    ], '/admin/users');

    setupContext(router);
    const outlet = RouterOutlet();
    container.appendChild(outlet);

    await waitForMutation();
    await waitForMutation(); // Extra wait for nested outlet

    expect(container.querySelector('#admin-layout')).not.toBeNull();
    expect(container.querySelector('#admin-users')).not.toBeNull();
    expect(container.textContent).toContain('Admin');
    expect(container.textContent).toContain('Admin Users');
  });
});

// =============================================================================
// Link Tests
// =============================================================================

describe('Link', () => {
  let router: Router;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    clearContext();
  });

  afterEach(() => {
    router?.destroy();
    container.remove();
    clearContext();
  });

  it('renders an anchor element with correct href', () => {
    router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
    setupContext(router);

    const link = Link({ href: '/about', children: 'About' });
    
    expect(link.tagName).toBe('A');
    expect(link.href).toContain('/about');
  });

  it('click triggers router.navigate()', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ]);
    setupContext(router);

    const link = Link({ href: '/about', children: 'About' });
    container.appendChild(link);

    // Simulate click
    link.click();
    await tick();

    expect(router.path()).toBe('/about');
  });

  it('prevents default on click', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ]);
    setupContext(router);

    const link = Link({ href: '/about', children: 'About' });
    container.appendChild(link);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    
    link.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does NOT prevent default with meta key', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
    ]);
    setupContext(router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const link = Link({ href: '/about', children: 'About' });
    container.appendChild(link);

    const event = new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true,
      metaKey: true,
    });
    
    link.dispatchEvent(event);
    await tick();

    // Navigation should not have been called
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does NOT prevent default with ctrl key', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
    ]);
    setupContext(router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const link = Link({ href: '/about', children: 'About' });
    container.appendChild(link);

    const event = new MouseEvent('click', { 
      bubbles: true, 
      cancelable: true,
      ctrlKey: true,
    });
    
    link.dispatchEvent(event);
    await tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does NOT prevent default with target="_blank"', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
    ]);
    setupContext(router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const link = Link({ href: '/about', children: 'About', target: '_blank' });
    container.appendChild(link);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    await tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('adds activeClass when path matches (prefix)', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
      { path: '/users/:id', component: () => document.createElement('div') },
    ], '/users/42');
    setupContext(router);

    const link = Link({ href: '/users', children: 'Users', activeClass: 'nav-active' });
    container.appendChild(link);

    await tick();

    expect(link.classList.contains('nav-active')).toBe(true);
  });

  it('adds exactActiveClass when path matches exactly', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
    ], '/users');
    setupContext(router);

    const link = Link({ 
      href: '/users', 
      children: 'Users', 
      activeClass: 'nav-active',
      exactActiveClass: 'nav-exact',
    });
    container.appendChild(link);

    await tick();

    expect(link.classList.contains('nav-active')).toBe(true);
    expect(link.classList.contains('nav-exact')).toBe(true);
  });

  it('removes active classes when navigating away', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/users', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ], '/users');
    setupContext(router);

    const link = Link({ 
      href: '/users', 
      children: 'Users', 
      activeClass: 'nav-active',
      exactActiveClass: 'nav-exact',
    });
    container.appendChild(link);

    await tick();
    expect(link.classList.contains('nav-active')).toBe(true);

    await router.navigate('/about');
    await tick();

    expect(link.classList.contains('nav-active')).toBe(false);
    expect(link.classList.contains('nav-exact')).toBe(false);
  });

  it('replace option uses replaceState', async () => {
    router = createTestRouter([
      { path: '/', component: () => document.createElement('div') },
      { path: '/about', component: () => document.createElement('div') },
    ]);
    setupContext(router);
    const replaceSpy = vi.spyOn(router, 'replace');

    const link = Link({ href: '/about', children: 'About', replace: true });
    container.appendChild(link);

    link.click();
    await tick();

    expect(replaceSpy).toHaveBeenCalledWith('/about');
  });

  it('accepts string children', () => {
    router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
    setupContext(router);

    const link = Link({ href: '/about', children: 'About Us' });
    
    expect(link.textContent).toBe('About Us');
  });

  it('accepts Node children', () => {
    router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
    setupContext(router);

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = '→';

    const link = Link({ href: '/about', children: icon });
    
    expect(link.querySelector('.icon')).not.toBeNull();
    expect(link.textContent).toBe('→');
  });

  it('applies custom class attribute', () => {
    router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
    setupContext(router);

    const link = Link({ href: '/about', children: 'About', class: 'btn btn-primary' });
    
    expect(link.className).toContain('btn');
    expect(link.className).toContain('btn-primary');
  });

  it('applies additional attrs', () => {
    router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
    setupContext(router);

    const link = Link({ 
      href: '/about', 
      children: 'About',
      attrs: { 'data-testid': 'about-link', 'aria-label': 'Go to about' },
    });
    
    expect(link.getAttribute('data-testid')).toBe('about-link');
    expect(link.getAttribute('aria-label')).toBe('Go to about');
  });

  it('throws error when router not in context', () => {
    clearContext();
    expect(() => Link({ href: '/about', children: 'About' })).toThrow('Link requires a router in context');
  });

  describe('href validation', () => {
    beforeEach(() => {
      router = createTestRouter([{ path: '/', component: () => document.createElement('div') }]);
      setupContext(router);
    });

    it('throws when href is undefined', () => {
      expect(() => Link({ href: undefined as unknown as string, children: 'X' }))
        .toThrow('LiteForge: <Link href> must be a non-empty string. Got: undefined')
    })

    it('throws when href is null', () => {
      expect(() => Link({ href: null as unknown as string, children: 'X' }))
        .toThrow('LiteForge: <Link href> must be a non-empty string. Got: null')
    })

    it('throws when href is empty string', () => {
      expect(() => Link({ href: '', children: 'X' }))
        .toThrow('LiteForge: <Link href> must be a non-empty string. Got: ""')
    })

    it('error message hints at reactive sources', () => {
      expect(() => Link({ href: undefined as unknown as string, children: 'X' }))
        .toThrow('signal or async source')
    })
  });

  describe('exact prop', () => {
    it('without exact: activeClass applied on prefix match', async () => {
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: () => document.createElement('div') },
        { path: '/dashboard/settings', component: () => document.createElement('div') },
      ], '/dashboard/settings');
      setupContext(router);

      const link = Link({ 
        href: '/dashboard', 
        children: 'Dashboard',
        activeClass: 'nav-active',
      });
      container.appendChild(link);

      await tick();

      // Without exact, activeClass should be applied (prefix match)
      expect(link.classList.contains('nav-active')).toBe(true);
    });

    it('with exact={true}: activeClass NOT applied on prefix match', async () => {
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: () => document.createElement('div') },
        { path: '/dashboard/settings', component: () => document.createElement('div') },
      ], '/dashboard/settings');
      setupContext(router);

      const link = Link({ 
        href: '/dashboard', 
        children: 'Dashboard',
        activeClass: 'nav-active',
        exact: true,
      });
      container.appendChild(link);

      await tick();

      // With exact, activeClass should NOT be applied (not an exact match)
      expect(link.classList.contains('nav-active')).toBe(false);
    });

    it('with exact={true}: activeClass applied on exact match', async () => {
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: () => document.createElement('div') },
        { path: '/dashboard/settings', component: () => document.createElement('div') },
      ], '/dashboard');
      setupContext(router);

      const link = Link({ 
        href: '/dashboard', 
        children: 'Dashboard',
        activeClass: 'nav-active',
        exact: true,
      });
      container.appendChild(link);

      await tick();

      // With exact, activeClass should be applied (exact match)
      expect(link.classList.contains('nav-active')).toBe(true);
    });

    it('exactActiveClass behavior unchanged by exact prop', async () => {
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: () => document.createElement('div') },
        { path: '/dashboard/settings', component: () => document.createElement('div') },
      ], '/dashboard/settings');
      setupContext(router);

      const link = Link({ 
        href: '/dashboard', 
        children: 'Dashboard',
        activeClass: 'nav-active',
        exactActiveClass: 'nav-exact',
        exact: true,
      });
      container.appendChild(link);

      await tick();

      // exactActiveClass should NOT be applied (not exact match)
      expect(link.classList.contains('nav-exact')).toBe(false);
      // activeClass should NOT be applied (exact mode, not exact match)
      expect(link.classList.contains('nav-active')).toBe(false);
    });

    it('exact prop updates activeClass reactively on navigation', async () => {
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: () => document.createElement('div') },
        { path: '/dashboard/settings', component: () => document.createElement('div') },
      ], '/dashboard');
      setupContext(router);

      const link = Link({ 
        href: '/dashboard', 
        children: 'Dashboard',
        activeClass: 'nav-active',
        exact: true,
      });
      container.appendChild(link);

      await tick();

      // Initially exact match - activeClass applied
      expect(link.classList.contains('nav-active')).toBe(true);

      // Navigate to child route
      await router.navigate('/dashboard/settings');
      await tick();

      // No longer exact match - activeClass removed
      expect(link.classList.contains('nav-active')).toBe(false);

      // Navigate back to exact match
      await router.navigate('/dashboard');
      await tick();

      // Exact match again - activeClass applied
      expect(link.classList.contains('nav-active')).toBe(true);
    });
  });

  describe('preload prop', () => {
    it('triggers prefetch on mouseenter when preload={true} with lazy route', async () => {
      const mockComponent = () => {
        const div = document.createElement('div');
        div.textContent = 'Dashboard';
        return div;
      };
      const loader = vi.fn(() => Promise.resolve({ default: mockComponent }));
      const LazyDashboard = lazy(loader);

      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: LazyDashboard },
      ]);
      setupContext(router);

      const link = Link({ href: '/dashboard', children: 'Dashboard', preload: true });
      container.appendChild(link);

      // Trigger mouseenter
      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await tick();

      expect(loader).toHaveBeenCalled();
      expect(LazyDashboard.isLoaded()).toBe(true);
    });

    it('triggers prefetch on mouseenter when preload is a LazyComponent', async () => {
      const mockComponent = () => {
        const div = document.createElement('div');
        div.textContent = 'Admin';
        return div;
      };
      const loader = vi.fn(() => Promise.resolve({ default: mockComponent }));
      const LazyAdmin = lazy(loader);

      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
      ]);
      setupContext(router);

      const link = Link({ href: '/admin', children: 'Admin', preload: LazyAdmin });
      container.appendChild(link);

      // Trigger mouseenter
      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await tick();

      expect(loader).toHaveBeenCalled();
      expect(LazyAdmin.isLoaded()).toBe(true);
    });

    it('only triggers prefetch once on multiple hovers', async () => {
      const mockComponent = () => {
        const div = document.createElement('div');
        div.textContent = 'Dashboard';
        return div;
      };
      const loader = vi.fn(() => Promise.resolve({ default: mockComponent }));
      const LazyDashboard = lazy(loader);

      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/dashboard', component: LazyDashboard },
      ]);
      setupContext(router);

      const link = Link({ href: '/dashboard', children: 'Dashboard', preload: true });
      container.appendChild(link);

      // Trigger mouseenter multiple times
      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await tick();

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('does not trigger prefetch for non-lazy routes', async () => {
      const regularComponent = () => document.createElement('div');
      
      router = createTestRouter([
        { path: '/', component: () => document.createElement('div') },
        { path: '/about', component: regularComponent },
      ]);
      setupContext(router);

      // This should not throw - just silently do nothing
      const link = Link({ href: '/about', children: 'About', preload: true });
      container.appendChild(link);

      link.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await tick();

      // Should not throw and path should still be /
      expect(router.path()).toBe('/');
    });
  });
});
