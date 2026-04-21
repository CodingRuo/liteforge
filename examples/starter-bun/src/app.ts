/**
 * App declaration.
 *
 * Pure `export default defineApp(...)` — the CLI (`@liteforge/cli`) handles
 * dev / build / start dispatch. Run via:
 *
 *   bun run dev     → liteforge dev   (HMR dev server)
 *   bun run build   → liteforge build (production bundle in ./dist)
 *   bun run start   → liteforge start (production server)
 *
 * The CLI auto-discovers this file (src/app.ts) and src/client.ts.
 */

import { defineApp, defineDocument } from '@liteforge/server'
import { routerPlugin, defineRouter, createBrowserHistory } from '@liteforge/router'
import { toastPlugin } from '@liteforge/toast'
import { AppShell } from './AppShell.js'
import { HomePage } from './pages/Home.js'
import { AboutPage } from './pages/About.js'
import { greetingsModule } from './server/greetings.server.js'

export const app = defineApp({
  root: AppShell,
  target: '#app',
  document: defineDocument({
    lang: 'en',
    head: {
      title: 'LiteForge Starter',
      description: 'Fullstack Bun starter with typed RPC',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      links: [{ rel: 'stylesheet', href: '/styles.css' }],
    },
  }),
})
  .serverModules({ greetings: greetingsModule })
  // Lazy factory — createBrowserHistory() reads `window`, which doesn't exist
  // server-side. The factory is only evaluated by .mount() on the client.
  .use(() => routerPlugin(defineRouter({
    history: createBrowserHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/about', component: AboutPage },
    ],
  })))
  .use(toastPlugin({ position: 'bottom-right' }))

export default app
