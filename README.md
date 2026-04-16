# LiteForge

A signals-based frontend framework with no virtual DOM, zero external dependencies, and TypeScript-first APIs.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Status: Powering Real-World SaaS

LiteForge is the engine behind Kontor, a comprehensive accounting and invoicing SaaS. It's not just a UI library — it's a framework built to handle complex state, secure routing, and heavy data-loading requirements in production.

**The Full Stack Experience**

LiteForge was designed to work seamlessly with OakBun, a native Bun-powered backend framework. Together, they provide a unified development experience from the database to the DOM, focusing on type-safety, performance, and developer happiness.

---

## Why LiteForge?

- **No Virtual DOM** — Direct, surgical DOM updates via Signals and Effects
- **Zero-Flicker Architecture** — Components render only when async data is fully loaded
- **Fine-Grained Reactivity** — Automatic dependency tracking, no manual subscriptions
- **JSX Syntax** — Familiar developer experience with build-time optimization
- **Plugin System** — First-class `AppBuilder.use()` API for router, modals, queries and more
- **Type-Safe by Default** — Full TypeScript, strict mode, no `any` in public APIs
- **Zero External Dependencies** — Every package has zero runtime deps

---

## Quick Start

```bash
npm install liteforge @liteforge/vite-plugin
```

**vite.config.ts**

```ts
import { defineConfig } from 'vite'
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()]
})
```

**main.tsx** — composing the full app

```tsx
import './styles.css';
import { createApp } from '@liteforge/runtime';
import { routerPlugin } from '@liteforge/router';
import { queryPlugin } from '@liteforge/query';
import { clientPlugin, queryIntegration } from '@liteforge/client';
import { devtoolsPlugin } from '@liteforge/devtools';
import { router } from './router.js';
import { authStore, uiStore } from './store/auth.js';
import { App } from './App.jsx';

uiStore.initialize();

await createApp({ root: App, target: '#app', stores: [authStore, uiStore] })
  .use(routerPlugin(router))
  .use(
    queryPlugin({
      defaultEnabled: () => !!authStore.token(),
      defaultRefetchOnFocus: false,
      defaultStaleTime: 30_000,
      defaultRetry: 1,
      defaultRetryDelay: 500,
    })
  )
  .use(
    clientPlugin({
      baseUrl: '/api',
      query: queryIntegration(),
      interceptors: [
        {
          onRequest: (config) => ({
            ...config,
            headers: {
              ...config.headers,
              'Content-Type': 'application/json',
              ...(authStore.token()
                ? { Authorization: `Bearer ${authStore.token()}` }
                : {}),
            },
          }),
          onResponseError: (error) => {
            if (error.status === 401) {
              authStore.logout();
              router.navigate('/login');
            }
            throw error;
          },
        },
      ],
    })
  )
  .use(devtoolsPlugin({ position: 'bottom' }));
```

---

## Building a Component

Components support async `load()`, typed props, reactive `setup()`, placeholder and error states — with no hooks, no context tricks, just functions.

```tsx
import { createComponent, use } from 'liteforge';
import { signal } from '@liteforge/core';

interface UserProps {
  userId: string;
}

export const UserDetail = createComponent<UserProps>({
  name: 'UserDetail',

  setup({ props }) {
    // Signals defined here live for the lifetime of the component
    const editMode = signal(false);
    return { editMode };
  },

  async load({ props }) {
    // Runs on every mount — ideal for detail views
    const user = await fetch(`/api/users/${props.userId}`).then(r => r.json());
    return { user };
  },

  placeholder: () => <div class="skeleton" />,

  error: ({ error, retry }) => (
    <div>
      <p>Failed to load user</p>
      <button onclick={retry}>Retry</button>
    </div>
  ),

  component({ props, data, setup }) {
    const { t } = use('i18n');

    return (
      <div>
        <h1>{data.user.name}</h1>
        <p>{data.user.email}</p>
        <button onclick={() => setup.editMode.set(true)}>
          {() => t('edit')}
        </button>
      </div>
    );
  },

  mounted({ el }) {
    el.classList.add('fade-in');
  },
});
```

---

## Routing with Guards

```tsx
import { createRouter, type RouteGuard } from '@liteforge/router';
import { authStore } from './store/auth.js';

const authGuard: RouteGuard = ({ to, redirect }) => {
  if (!authStore.isLoggedIn()) return redirect('/login');
};

export const router = createRouter({
  history: 'browser',
  scrollBehavior: 'top',
  routes: [
    { path: '/login', component: () => import('./pages/Login.jsx') },

    {
      path: '/dashboard',
      component: () => import('./layouts/AppLayout.jsx'),
      guard: authGuard,
      children: [
        { path: '/', component: () => import('./pages/Dashboard.jsx') },
        { path: '/users', component: () => import('./pages/Users.jsx') },
        { path: '/users/:id', component: () => import('./pages/UserDetail.jsx') },
        {
          path: '/settings',
          component: () => import('./layouts/SettingsLayout.jsx'),
          children: [
            { path: '/general', component: () => import('./pages/Settings/General.jsx') },
            { path: '/billing', component: () => import('./pages/Settings/Billing.jsx') },
          ],
        },
      ],
    },

    { path: '*', component: () => import('./pages/NotFound.jsx') },
  ],
});
```

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [liteforge](packages/liteforge) | 0.7.15 | Umbrella — re-exports `@liteforge/core` + `@liteforge/runtime` |
| [@liteforge/core](packages/core) | 0.1.1 | Reactive primitives: `signal`, `computed`, `effect`, `batch` |
| [@liteforge/runtime](packages/runtime) | 0.8.0 | Components, lifecycle, control flow, plugin system |
| [@liteforge/store](packages/store) | 0.1.1 | State management with registry and time-travel |
| [@liteforge/router](packages/router) | 0.12.2 | Routing with guards, lazy loading, typed routes, view transitions |
| [@liteforge/query](packages/query) | 5.0.0 | Data fetching with caching and mutations |
| [@liteforge/form](packages/form) | 0.3.0 | Form management with Zod validation |
| [@liteforge/table](packages/table) | 2.2.3 | Data tables with sorting, filtering, pagination |
| [@liteforge/calendar](packages/calendar) | 0.4.1 | Scheduling calendar with drag & drop and 4 views |
| [@liteforge/client](packages/client) | 7.0.0 | TypeScript-first HTTP client with interceptors and CRUD resources |
| [@liteforge/modal](packages/modal) | 5.0.0 | Modal system with focus trap, transitions, and promise presets |
| [@liteforge/toast](packages/toast) | 4.0.0 | Imperative toast notifications with four variants and custom icons |
| [@liteforge/tooltip](packages/tooltip) | 0.4.0 | Portal-based tooltips with auto-positioning and delay |
| [@liteforge/i18n](packages/i18n) | 4.0.0 | Signals-based i18n with lazy locales, interpolation, and pluralization |
| [@liteforge/vite-plugin](packages/vite-plugin) | 0.5.1 | JSX transform and build optimization |
| [@liteforge/devtools](packages/devtools) | 5.0.0 | Debug panel with 5 tabs and time-travel |

---

## Architecture

```
liteforge         — umbrella (re-exports core + runtime)
│
core  (no deps)
├── runtime       — components, JSX, control flow, plugin system
│
plugins (each installed via .use()):
├── store         — global state
├── router        — client-side routing
├── query         — data fetching
├── form          — form management
├── table         — data tables
├── calendar      — scheduling calendar
├── client        — HTTP client
├── modal         — modal system
├── toast         — toast notifications
├── tooltip       — tooltip system
└── i18n          — internationalization

vite-plugin       — standalone build transform
devtools          — depends on core + store
```

---

## Core Concepts

### Signals

```ts
import { signal, computed, effect } from 'liteforge'

const count = signal(0)
const doubled = computed(() => count() * 2)

effect(() => {
  console.log(`Count: ${count()}, doubled: ${doubled()}`)
})

count.set(5)             // → "Count: 5, doubled: 10"
count.update(n => n + 1)
```

### Store

```ts
import { defineStore } from '@liteforge/store'

const userStore = defineStore('users', {
  state: { currentUser: null, list: [] },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
  }),
  actions: (state) => ({
    async fetchUsers() {
      state.list.set(await fetch('/api/users').then(r => r.json()))
    },
  }),
})
```

### Query

```ts
import { createQuery, createMutation } from '@liteforge/query'

const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
})

users.data()       // Signal<User[]>
users.isLoading()  // Signal<boolean>
users.refetch()

const addUser = createMutation({
  fn: (data) => api.createUser(data),
  invalidate: ['users'],
})
```

### HTTP Client

```ts
import { createClient } from '@liteforge/client'

const client = createClient({ baseUrl: 'https://api.example.com' })

// Low-level
const todo = await client.get<Todo>('/todos/1')

// Resource-based CRUD
const posts = client.resource<Post>('posts')
await posts.getList({ page: 1, pageSize: 20 })
await posts.getOne(42)
await posts.create({ title: 'Hello', body: '...' })
await posts.update(42, { title: 'Updated' })
await posts.delete(42)

// Interceptors
client.addInterceptor({
  onRequest: (config) => ({
    ...config,
    headers: { ...config.headers, Authorization: `Bearer ${token}` },
  }),
  onResponseError: (error) => {
    if (error.status === 401) redirect('/login');
    throw error;
  },
})
```

### Modal

```ts
import { createModal, confirm, alert } from '@liteforge/modal'

// Declarative
const dialog = createModal({
  title: 'Edit User',
  content: () => <EditUserForm />,
})
dialog.open()

// Promise presets
const confirmed = await confirm({ title: 'Delete?', message: 'This cannot be undone.' })
await alert({ title: 'Done', message: 'User deleted.' })
```

### Toast

```ts
import { toast } from '@liteforge/toast'

toast.success('Saved successfully')
toast.error('Something went wrong')
toast.warning('Unsaved changes')
toast.info('New version available')

// With per-toast options
toast.success('User created', { duration: 4000, closable: true })
```

### Tooltip

```ts
import { tooltip } from '@liteforge/tooltip'

// Imperative — attach to any element
const cleanup = tooltip(buttonEl, {
  content: 'Save changes',
  position: 'top',             // 'top' | 'bottom' | 'left' | 'right'
  delay: 300,
  showWhen: () => !isMobile(), // reactive guard
})

// Declarative — JSX component
import { Tooltip } from '@liteforge/tooltip'

<Tooltip content="Save changes" position="top">
  <button>Save</button>
</Tooltip>
```

### Internationalization

```ts
// main.tsx
import { i18nPlugin } from '@liteforge/i18n';

await createApp({ root: App, target: '#app' })
  .use(i18nPlugin({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    load: async (locale) => {
      const mod = await import(`./locales/${locale}.js`);
      return mod.default;
    },
    persist: true,
  }))
  .mount();
```

```ts
// locales/en.ts
export default {
  greeting: 'Hello, {name}!',
  nav: { home: 'Home', settings: 'Settings' },
  items: '{count} item | {count} items',
} satisfies TranslationTree;
```

```tsx
const MyPage = createComponent({
  component({ use }) {
    const { t, locale, setLocale } = use('i18n');

    return (
      <div>
        <p>{() => t('greeting', { name: 'World' })}</p>
        <p>{() => t('nav.home')}</p>
        <button onclick={() => setLocale('de')}>Deutsch</button>
      </div>
    );
  },
});
```

### Control Flow

```tsx
import { Show, For, Switch, Match } from 'liteforge'

// Conditional rendering — child is unmounted and effects disposed on false
<Show when={() => user()}>
  {(u) => <UserCard user={u} />}
</Show>

// keepAlive — hide via display:none, effects stay alive
<Show when={() => isPanelOpen()} keepAlive>
  {() => <LivePanel />}
</Show>

// List rendering with keyed reconciliation
<For each={() => items()} key={(item) => item.id}>
  {(item) => <li>{() => item().name}</li>}
</For>

// Switch / Match
<Switch fallback={<NotFound />}>
  <Match when={() => status() === 'loading'}>{() => <Spinner />}</Match>
  <Match when={() => status() === 'error'}>{() => <ErrorView />}</Match>
</Switch>
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Run all tests
pnpm test

# Type check all packages
pnpm typecheck:all

# Start the demo app
pnpm --filter starter dev
```

---

## Bundle Sizes

| Setup | Size (gzip) |
|-------|-------------|
| Minimal (core only) | ~6kb |
| Core + Runtime | ~18kb |
| Core + Runtime + Store + Router | ~43kb |
| Full stack (+ query + client + modal + toast + tooltip) | ~65kb |

---

## Status

> **LiteForge is in active development.** APIs may change between minor versions. I use it in my own production projects, but if you adopt it today, expect some rough edges.

LiteForge is a personal framework born from real frustration with React's re-rendering model and Vue's adapter overhead. I built it because I wanted a tool that works the way I think — signals that directly update the DOM, no virtual DOM diffing, no magic.

**What works well today:** Core reactivity, routing, state management, forms, data tables, calendar, HTTP client, modals, toast, i18n, and a full plugin system — all battle-tested in production.

**What's still maturing:** Documentation, edge cases in complex layouts, and the ecosystem around it.

If you find it useful, feel free to use it. If you find a bug, I'd appreciate an issue. PRs are welcome but please open an issue first.

---

## Built with AI

I want to be transparent: LiteForge was developed with significant AI assistance. I used Claude (Anthropic) as a development partner throughout the entire process — from architecture decisions to implementation, testing, and documentation.

- I designed the API, made all architecture decisions, and defined what the framework should do
- AI helped write implementation code, tests, and documentation based on my specifications
- Every feature was reviewed, tested, and validated by me in real browser environments
- The framework reflects my opinions and preferences as a developer, not generic AI output

I believe AI-assisted development is the future of how software gets built. Being upfront about it is more honest than pretending otherwise.

---

## About

LiteForge is built and maintained by [SchildW3rk](https://schildw3rk.dev) — a one-person software studio from Salzburg, Austria.

## License

MIT — see [LICENSE](LICENSE) for details.
