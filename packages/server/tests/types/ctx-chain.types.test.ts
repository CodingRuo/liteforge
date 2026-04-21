// Type-level Chain-Stability for the $ctx phantom carrier.
// Three orderings (context/use/serverModules permutations) must produce the
// same $ctx type. Compile-check by project tsc; runtime assertion is minimal.

import { describe, it, expect } from 'vitest'
import { defineApp } from '../../src/define-app.js'
import type { AppInstance } from '../../src/define-app.js'
import { defineServerModule } from '../../src/server-module.js'
import { z } from 'zod'

describe('$ctx phantom carrier — chain-order stability', () => {
  const mod = defineServerModule('greetings')
    .serverFn('hello', {
      input: z.object({ name: z.string() }),
      handler: async (input) => ({ greeting: `Hello ${input.name}` }),
    })
    .build()

  const router = { name: 'router', install() {} }

  it('Fall 1: context → use → serverModules', () => {
    const app = defineApp({
      root: {},
      target: '#app',
      context: {
        tenantId: (req: Request) => 'tenant-' + req.headers.get('x-tenant'),
        version: '1.0',
      },
    })
      .use(router)
      .serverModules({ greetings: mod })

    // Assertion at the type level — the returned builder's AppInstance generic
    // carries TContext through the chain unchanged.
    type Resolved = Awaited<ReturnType<typeof app.mount>>
    const _assertA: Resolved extends AppInstance<{ tenantId: (req: Request) => string; version: string }, any>
      ? true
      : false = true
    expect(_assertA).toBe(true)
  })

  it('Fall 2: context → serverModules → use', () => {
    const app = defineApp({
      root: {},
      target: '#app',
      context: {
        tenantId: (req: Request) => 'tenant-' + req.headers.get('x-tenant'),
        version: '1.0',
      },
    })
      .serverModules({ greetings: mod })
      .use(router)

    type Resolved = Awaited<ReturnType<typeof app.mount>>
    const _assertB: Resolved extends AppInstance<{ tenantId: (req: Request) => string; version: string }, any>
      ? true
      : false = true
    expect(_assertB).toBe(true)
  })

  it('Fall 3: kein context → $ctx = BaseCtx-Fallback', () => {
    const app = defineApp({ root: {}, target: '#app' })
      .use(router)
      .serverModules({ greetings: mod })

    type Resolved = Awaited<ReturnType<typeof app.mount>>
    // TContext is `Record<never, never>` → `$ctx` is `BaseCtx & {}` = `BaseCtx`
    const _assertC: Resolved extends AppInstance<Record<never, never>, any>
      ? true
      : false = true
    expect(_assertC).toBe(true)
  })
})
