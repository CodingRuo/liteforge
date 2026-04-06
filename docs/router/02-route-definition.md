---
title: "Route Definition"
category: "router"
tags: ["routes", "nested", "lazy", "guards", "redirect", "meta", "preload"]
related: ["createRouter", "Navigation", "Lazy Loading"]
---

# Route Definition

> Define routes, nested layouts, lazy-loaded components, guards, and preloaders.

## Installation

```bash
npm install @liteforge/router
```

## Quick Start

```ts
import { createRouter, lazy } from '@liteforge/router'
import { createAuthGuard } from '@liteforge/router'
import { Home, NotFound } from './pages'

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    {
      path: '/admin',
      component: lazy(() => import('./layouts/AdminLayout')),
      guard: 'auth',
      children: [
        { path: '/', component: lazy(() => import('./pages/Dashboard')) },
        { path: '/users', component: lazy(() => import('./pages/Users')) },
      ],
    },
    { path: '/login', component: lazy(() => import('./pages/Login')) },
    { path: '/:path(.*)', component: NotFound },
  ],
  guards: [createAuthGuard({ isAuthenticated: () => !!currentUser(), loginPath: '/login' })],
})
```

## API Reference

### `RouteDefinition`

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Path pattern. Supports `:param`, `*`, regex groups |
| `component` | `RouteComponent \| LazyComponent` | Component factory or lazy component |
| `children` | `RouteDefinition[]` | Nested routes |
| `name` | `string` | Named route |
| `guard` | `string \| string[]` | Guard name(s) to apply |
| `middleware` | `RouteMiddleware[]` | Route-level middleware |
| `redirect` | `NavigationTarget` | Redirect immediately to this target |
| `meta` | `RouteMeta` | Arbitrary metadata |
| `preload` | `PreloadFunction` | Async data preload before navigation |
| `title` | `string` | Page title (used with `titleTemplate`) |
| `lazy` | `RouteLazyConfig` | Per-route lazy options |

### `lazy(importFn, options?)` → `LazyComponent`

Wrap a dynamic import for use as a route component.

```ts
import { lazy } from '@liteforge/router'

const AdminPage = lazy(() => import('./pages/Admin'))

// With options:
const SlowPage = lazy(() => import('./pages/Slow'), {
  loading: () => <Spinner />,
  error: ({ retry }) => <button onclick={retry}>Retry</button>,
  delay: 200,
})
```

### Built-in guards

| Guard | Factory | Description |
|-------|---------|-------------|
| Auth | `createAuthGuard({ isAuthenticated, loginPath })` | Redirect to login if not authenticated |
| Role | `createRoleGuard({ hasRole, forbidden })` | Require a specific role |
| Confirm | `createConfirmGuard({ message })` | Confirm before leaving |
| Guest | `createGuestGuard({ isAuthenticated, homePath })` | Redirect authenticated users |

### `defineGuard(name, fn)` → `RouteGuard`

Create a named guard that can be referenced by string in route definitions.

```ts
import { defineGuard } from '@liteforge/router'

const authGuard = defineGuard('auth', async ({ to, from, use }) => {
  const token = localStorage.getItem('token')
  if (!token) return { redirect: '/login' }
  return true
})
```

### Built-in middleware

| Factory | Description |
|---------|-------------|
| `createLoggerMiddleware()` | Logs navigations to console |
| `createScrollMiddleware()` | Scroll to top on navigation |
| `createTitleMiddleware(template)` | Update document title |
| `createAnalyticsMiddleware(fn)` | Call analytics on route change |
| `createLoadingMiddleware(signal)` | Toggle loading signal |

## Examples

### Nested routes with layout

```ts
{
  path: '/dashboard',
  component: DashboardLayout,
  children: [
    { path: '/', component: Overview },      // /dashboard
    { path: '/stats', component: Stats },    // /dashboard/stats
  ],
}
```

### Preload data before navigation

```ts
{
  path: '/users/:id',
  component: UserDetail,
  async preload({ to, params, use }) {
    const user = await fetch(`/api/users/${params.id}`).then(r => r.json())
    return user
  },
}
```

## Notes

- Paths are matched in order. Place more specific routes before catch-alls.
- `guard: 'auth'` references a guard registered via `defineGuard('auth', ...)` or `createAuthGuard`.
- `lazy()` components are code-split by Vite automatically.
- `preloadedData` is available on the router signal `router.preloadedData()` after navigation.
