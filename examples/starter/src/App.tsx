/**
 * App Root Component
 *
 * Main application shell with header and RouterOutlet.
 */

import { createComponent, Show } from 'liteforge';
import { Link, RouterOutlet } from 'liteforge/router';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';
import { effect } from 'liteforge';

// =============================================================================
// Component
// =============================================================================

export const App = createComponent({
  name: 'App',
  component() {
    // Keep data-theme in sync with uiStore so all --lf-* tokens react
    effect(() => {
      document.documentElement.dataset.theme = uiStore.effectiveTheme();
    });

    return (
      <div class="app">
        <header class="app-header">
          {Link({
            href: '/',
            children: 'LiteForge',
            class: 'logo',
          })}
          <nav class="main-nav">
            {Link({
              href: '/',
              children: 'Home',
              activeClass: 'active',
              exactActiveClass: 'exact',
            })}
            {Show({
              when: () => authStore.isAuthenticated(),
              fallback: () => Link({
                href: '/login',
                children: 'Login',
                activeClass: 'active',
              }),
              children: () => Link({
                href: '/dashboard',
                children: 'Dashboard',
                activeClass: 'active',
              }),
            })}
          </nav>
          <button
            type="button"
            class="theme-toggle-btn"
            title="Toggle theme"
            onClick={() => uiStore.setTheme(uiStore.effectiveTheme() === 'dark' ? 'light' : 'dark')}
          >
            {() => uiStore.effectiveTheme() === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
        
        <div class="app-content">
          <RouterOutlet />
        </div>
      </div>
    );
  },
});
