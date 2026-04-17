/**
 * Router Debug Hooks Tests
 *
 * Tests for navigation and guard debug event emission.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  enableDebug,
  disableDebug,
  resetDebugIdCounter,
} from '@liteforge/core';
import type {
  DebugBus,
  NavigationStartPayload,
  NavigationEndPayload,
  GuardRunPayload,
} from '@liteforge/core';
import {
  defineRouter,
  createMemoryHistory,
  defineGuard,
} from '../src/index.js';
import type { Router } from '../src/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestRouter(guards: ReturnType<typeof defineGuard>[] = []): Router {
  return defineRouter({
    routes: [
      { path: '/', name: 'home', component: () => document.createElement('div') },
      { path: '/public', name: 'public', component: () => document.createElement('div') },
      { path: '/protected', name: 'protected', guard: 'auth', component: () => document.createElement('div') },
      { path: '/admin', name: 'admin', guard: ['auth', 'admin'], component: () => document.createElement('div') },
      { path: '/users/:id', name: 'user', component: () => document.createElement('div') },
      { path: '*', name: 'not-found', component: () => document.createElement('div') },
    ],
    history: createMemoryHistory(),
    guards,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('Router Debug Hooks', () => {
  let bus: DebugBus;
  let router: Router;

  beforeEach(() => {
    disableDebug();
    resetDebugIdCounter();
    bus = enableDebug();
  });

  afterEach(() => {
    router?.destroy();
    disableDebug();
  });

  // ==========================================================================
  // nav:start event
  // ==========================================================================

  describe('nav:start event', () => {
    it('emits nav:start when navigation begins', async () => {
      const events: NavigationStartPayload[] = [];
      bus.on('nav:start', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public');

      expect(events).toHaveLength(1);
      expect(events[0].from).toBe('/');
      expect(events[0].to).toBe('/public');
      expect(events[0].timestamp).toBeGreaterThan(0);
    });

    it('emits nav:start with correct from/to paths', async () => {
      const events: NavigationStartPayload[] = [];
      bus.on('nav:start', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public');
      await router.navigate('/users/123');

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({ from: '/', to: '/public' });
      expect(events[1]).toMatchObject({ from: '/public', to: '/users/123' });
    });

    it('emits nav:start for programmatic navigation via navigate()', async () => {
      const events: NavigationStartPayload[] = [];
      bus.on('nav:start', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public');
      events.length = 0; // Clear initial events

      // Navigate back to home programmatically
      await router.navigate('/');

      expect(events.length).toBe(1);
      expect(events[0].from).toBe('/public');
      expect(events[0].to).toBe('/');
    });
  });

  // ==========================================================================
  // nav:end event
  // ==========================================================================

  describe('nav:end event', () => {
    it('emits nav:end when navigation completes successfully', async () => {
      const events: NavigationEndPayload[] = [];
      bus.on('nav:end', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public');

      expect(events).toHaveLength(1);
      expect(events[0].from).toBe('/');
      expect(events[0].to).toBe('/public');
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
      expect(events[0].timestamp).toBeGreaterThan(0);
    });

    it('emits nav:end when navigation is blocked by guard', async () => {
      const events: NavigationEndPayload[] = [];
      bus.on('nav:end', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => false); // Always block
      router = createTestRouter([authGuard]);

      const result = await router.navigate('/protected');

      expect(result).toBe(false); // Navigation blocked
      expect(events).toHaveLength(1);
      expect(events[0].from).toBe('/');
      expect(events[0].to).toBe('/protected');
      // Duration should still be recorded
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('emits nav:end for redirected navigation', async () => {
      const events: NavigationEndPayload[] = [];
      bus.on('nav:end', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => '/public'); // Redirect to /public
      router = createTestRouter([authGuard]);

      await router.navigate('/protected');

      expect(events).toHaveLength(1);
      // Final destination after redirect
      expect(events[0].to).toBe('/public');
    });

    it('duration is positive and reasonable', async () => {
      const events: NavigationEndPayload[] = [];
      bus.on('nav:end', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public');

      expect(events[0].duration).toBeGreaterThanOrEqual(0);
      expect(events[0].duration).toBeLessThan(1000); // Should be fast in tests
    });

    it('nav:start and nav:end are paired', async () => {
      const starts: NavigationStartPayload[] = [];
      const ends: NavigationEndPayload[] = [];

      bus.on('nav:start', (payload) => starts.push(payload));
      bus.on('nav:end', (payload) => ends.push(payload));

      router = createTestRouter();
      await router.navigate('/public');
      await router.navigate('/users/42');
      await router.navigate('/');

      expect(starts).toHaveLength(3);
      expect(ends).toHaveLength(3);

      // Each start should have a matching end
      for (let i = 0; i < starts.length; i++) {
        expect(starts[i].to).toBe(ends[i].to);
      }
    });
  });

  // ==========================================================================
  // guard:run event
  // ==========================================================================

  describe('guard:run event', () => {
    it('emits guard:run when guard executes', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => true);
      router = createTestRouter([authGuard]);

      await router.navigate('/protected');

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('auth');
      expect(events[0].route).toBe('/protected');
      expect(events[0].result).toBe(true);
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('emits guard:run with result=false when guard blocks', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => false);
      router = createTestRouter([authGuard]);

      await router.navigate('/protected');

      expect(events).toHaveLength(1);
      expect(events[0].result).toBe(false);
    });

    it('emits guard:run with result=false when guard redirects', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => '/login');
      router = createTestRouter([authGuard]);

      await router.navigate('/protected');

      expect(events).toHaveLength(1);
      expect(events[0].result).toBe(false); // Redirect counts as not allowed
    });

    it('emits guard:run for each guard in sequence', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => true);
      const adminGuard = defineGuard('admin', () => true);
      router = createTestRouter([authGuard, adminGuard]);

      await router.navigate('/admin');

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('auth');
      expect(events[1].name).toBe('admin');
    });

    it('stops emitting guard:run after first blocking guard', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const authGuard = defineGuard('auth', () => false); // Blocks
      const adminGuard = defineGuard('admin', () => true);
      router = createTestRouter([authGuard, adminGuard]);

      await router.navigate('/admin');

      // Only auth guard should run since it blocks
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('auth');
      expect(events[0].result).toBe(false);
    });

    it('records guard duration', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const slowGuard = defineGuard('auth', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      });
      router = createTestRouter([slowGuard]);

      await router.navigate('/protected');

      expect(events[0].duration).toBeGreaterThanOrEqual(10);
    });

    it('emits guard:run with result=false when guard throws', async () => {
      const events: GuardRunPayload[] = [];
      bus.on('guard:run', (payload) => events.push(payload));

      const errorGuard = defineGuard('auth', () => {
        throw new Error('Guard error');
      });
      router = createTestRouter([errorGuard]);

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      await router.navigate('/protected');

      console.error = originalError;

      expect(events).toHaveLength(1);
      expect(events[0].result).toBe(false);
    });
  });

  // ==========================================================================
  // Blocked navigation emits nav:end
  // ==========================================================================

  describe('Blocked navigation completes event lifecycle', () => {
    it('guard-blocked navigation still emits nav:end', async () => {
      const starts: NavigationStartPayload[] = [];
      const ends: NavigationEndPayload[] = [];
      const guards: GuardRunPayload[] = [];

      bus.on('nav:start', (payload) => starts.push(payload));
      bus.on('nav:end', (payload) => ends.push(payload));
      bus.on('guard:run', (payload) => guards.push(payload));

      const authGuard = defineGuard('auth', () => false);
      router = createTestRouter([authGuard]);

      const result = await router.navigate('/protected');

      expect(result).toBe(false);
      expect(starts).toHaveLength(1);
      expect(ends).toHaveLength(1); // nav:end MUST fire even when blocked
      expect(guards).toHaveLength(1);
      expect(guards[0].result).toBe(false);
    });

    it('no hanging navigation state after block', async () => {
      const authGuard = defineGuard('auth', () => false);
      router = createTestRouter([authGuard]);

      await router.navigate('/protected');

      // Router should not be in navigating state
      expect(router.isNavigating()).toBe(false);
    });
  });

  // ==========================================================================
  // Zero-cost when debug disabled
  // ==========================================================================

  describe('Zero-cost when debug disabled', () => {
    it('navigation works without debug enabled', async () => {
      disableDebug();

      router = createTestRouter();
      const result = await router.navigate('/public');

      expect(result).toBe(true);
      expect(router.path()).toBe('/public');
    });

    it('guards work without debug enabled', async () => {
      disableDebug();

      const authGuard = defineGuard('auth', () => true);
      router = createTestRouter([authGuard]);

      const result = await router.navigate('/protected');

      expect(result).toBe(true);
      expect(router.path()).toBe('/protected');
    });

    it('blocked navigation works without debug enabled', async () => {
      disableDebug();

      const authGuard = defineGuard('auth', () => false);
      router = createTestRouter([authGuard]);

      const result = await router.navigate('/protected');

      expect(result).toBe(false);
      expect(router.path()).toBe('/'); // Should stay at origin
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('handles rapid navigation', async () => {
      const starts: NavigationStartPayload[] = [];
      const ends: NavigationEndPayload[] = [];

      bus.on('nav:start', (payload) => starts.push(payload));
      bus.on('nav:end', (payload) => ends.push(payload));

      router = createTestRouter();

      // Rapid navigation - some may be queued
      const p1 = router.navigate('/public');
      const p2 = router.navigate('/users/1');
      const p3 = router.navigate('/users/2');

      await Promise.all([p1, p2, p3]);

      // Each navigation should complete
      // Note: Some may be skipped due to pending navigation handling
      expect(starts.length).toBeGreaterThanOrEqual(1);
      expect(ends.length).toBe(starts.length); // Every start has an end
    });

    it('handles navigation with query params', async () => {
      const events: NavigationStartPayload[] = [];
      bus.on('nav:start', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public?foo=bar&baz=qux');

      expect(events[0].to).toBe('/public');
    });

    it('handles navigation with hash', async () => {
      const events: NavigationStartPayload[] = [];
      bus.on('nav:start', (payload) => events.push(payload));

      router = createTestRouter();
      await router.navigate('/public#section');

      expect(events[0].to).toBe('/public');
    });
  });
});
