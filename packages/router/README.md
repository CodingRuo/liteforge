# @liteforge/router

Full-featured router for LiteForge with guards, middleware, and lazy loading.

## Installation

```bash
npm install @liteforge/router @liteforge/core @liteforge/runtime
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `@liteforge/runtime >= 0.1.0`

## Overview

`@liteforge/router` provides client-side routing with route guards, middleware, nested routes, lazy loading, and full TypeScript support.

## Basic Usage

```tsx
import { defineRouter, RouterOutlet, Link } from '@liteforge/router'
import { defineApp } from '@liteforge/runtime'

const router = defineRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: UserDetail }
  ]
})

const App = () => (
  <div>
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
    </nav>
    <RouterOutlet />
  </div>
)

defineApp({ router }).mount(App)
```

## API

### defineRouter

Creates a router instance.

```ts
import { defineRouter } from '@liteforge/router'

const router = defineRouter({
  routes: [...],
  
  // Optional settings
  base: '/app',              // Base path for all routes
  hashMode: false,           // Use hash-based routing (#/path)
  scrollBehavior: 'auto',    // 'auto' | 'smooth' | 'none'
  
  // Global guards
  guards: {
    auth: async (ctx) => {
      if (!isLoggedIn()) return '/login'
      return true
    }
  },
  
  // Global middleware
  middleware: [loggerMiddleware]
})
```

### Route Definition

```ts
const routes = [
  // Basic route
  { path: '/', component: Home },
  
  // With name (for programmatic navigation)
  { path: '/about', name: 'about', component: About },
  
  // Dynamic parameters
  { path: '/users/:id', component: UserDetail },
  
  // Optional parameters
  { path: '/posts/:id?', component: Posts },
  
  // Wildcard (catch-all)
  { path: '/docs/*', component: DocsPage },
  
  // With guard
  { path: '/admin', component: Admin, guard: 'auth' },
  
  // Multiple guards
  { path: '/admin', component: Admin, guard: ['auth', 'role:admin'] },
  
  // Nested routes
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      { path: '/', component: DashboardHome },
      { path: '/settings', component: Settings }
    ]
  },
  
  // Route metadata
  {
    path: '/private',
    component: Private,
    meta: { requiresAuth: true, title: 'Private Page' }
  }
]
```

### lazy

Lazy-load components for code splitting.

```ts
import { lazy } from '@liteforge/router'

const routes = [
  {
    path: '/admin',
    component: lazy(() => import('./AdminPanel'), {
      loading: () => <Spinner />,
      error: ({ error, retry }) => <RetryButton onclick={retry} />,
      delay: 200  // Show loading after 200ms
    })
  }
]
```

### Navigation

```tsx
import { use } from '@liteforge/runtime'

const MyComponent = () => {
  const router = use('router')
  
  // Navigate programmatically
  router.navigate('/users/123')
  router.navigate('/users/123', { replace: true })
  router.navigate({ name: 'user', params: { id: '123' } })
  
  // Go back/forward
  router.back()
  router.forward()
  
  // Reactive route data (signals)
  router.path()           // '/users/123'
  router.params()         // { id: '123' }
  router.query()          // { tab: 'posts' }
  router.hash()           // '#section'
  router.route()          // Full matched route object
  
  return <div>Current path: {() => router.path()}</div>
}
```

### Route Helpers

```ts
import { useParam, useParams, usePath, useQuery, useEditParam } from '@liteforge/router'

// Read a single route parameter as a signal
const id = useParam('id')   // () => string | undefined

// Read all route parameters
const params = useParams()  // () => Record<string, string>

// Current path signal
const path = usePath()      // () => string

// Current query string as parsed object
const query = useQuery()    // () => Record<string, string>
```

#### useEditParam

Convenience helper for edit-form routes that carry a numeric `id` parameter:

```ts
import { useEditParam } from '@liteforge/router'

// Route: /patients/:id/edit  OR  /patients/new
const { editId, isEdit } = useEditParam()
// editId: number | null  — null on /new routes or if param is absent/invalid
// isEdit: boolean        — true when editId is a positive finite integer

// Custom param name
const { editId } = useEditParam('patientId')
```

Guards against absent, empty, non-numeric, NaN, zero, and negative values — only positive finite integers produce a non-null `editId`.

### Link and NavLink

```tsx
import { Link, NavLink } from '@liteforge/router'

// Basic link
<Link href="/about">About</Link>

// With query params
<Link href="/search" query={{ q: 'term' }}>Search</Link>

// Replace history instead of push
<Link href="/login" replace>Login</Link>

// NavLink adds 'active' class when matched
<NavLink href="/users" activeClass="nav-active">
  Users
</NavLink>

// Exact matching (default matches partial paths)
<NavLink href="/users" exact>Users</NavLink>
```

### RouterOutlet

Renders the current route's component.

```tsx
import { RouterOutlet } from '@liteforge/router'

const Layout = () => (
  <div>
    <Header />
    <main>
      <RouterOutlet />  {/* Current route renders here */}
    </main>
    <Footer />
  </div>
)

// For nested routes, use additional outlets
const Dashboard = () => (
  <div>
    <Sidebar />
    <RouterOutlet />  {/* Nested route renders here */}
  </div>
)
```

### Guards

Guards control access to routes.

```ts
import { defineGuard, createAuthGuard, createRoleGuard } from '@liteforge/router'

// Custom guard
const premiumGuard = defineGuard('premium', async (ctx) => {
  const user = await getUser()
  if (!user.isPremium) {
    return '/upgrade'  // Redirect
  }
  return true  // Allow
})

// Built-in guards
const authGuard = createAuthGuard({
  isAuthenticated: () => !!token(),
  redirectTo: '/login'
})

const adminGuard = createRoleGuard({
  getCurrentRole: () => user()?.role,
  allowedRoles: ['admin', 'superadmin'],
  redirectTo: '/unauthorized'
})

const router = defineRouter({
  routes: [...],
  guards: {
    auth: authGuard,
    premium: premiumGuard,
    admin: adminGuard
  }
})
```

### Middleware

Middleware runs on every navigation.

```ts
import { defineMiddleware, createLoggerMiddleware } from '@liteforge/router'

// Custom middleware
const analyticsMiddleware = defineMiddleware('analytics', (ctx, next) => {
  trackPageView(ctx.to.path)
  return next()
})

// Built-in middleware
const logger = createLoggerMiddleware({ collapsed: true })
const title = createTitleMiddleware({
  default: 'My App',
  template: (title) => `${title} | My App`
})

const router = defineRouter({
  routes: [...],
  middleware: [logger, title, analyticsMiddleware]
})
```

## Types

```ts
import type {
  Router,
  RouterOptions,
  RouteDefinition,
  MatchedRoute,
  GuardFunction,
  GuardContext,
  MiddlewareFunction,
  NavigateOptions,
  LinkProps
} from '@liteforge/router'
```

## License

MIT
