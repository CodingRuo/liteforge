// Type-level tests for defineApp chain. Runtime assertion is trivial — the
// real work here is compile-time: the `@ts-expect-error` lines MUST fail to
// compile if the guard is missing, which is verified by `tsc --noEmit`.

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineApp } from '../src/define-app.js'
import { defineServerModule } from '../src/server-module.js'
import type { BaseCtx } from '../src/types.js'

describe('defineApp — chain type-level contracts (Phase B)', () => {
  it('chain returns typed builder, double serverModules() is a compile error', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input, _ctx: BaseCtx) => ({ greeting: `Hello ${input.name}` }),
      })
      .build()

    const b = defineApp({ root: {}, target: '#app' })
      .use({ name: 'router', install() {} })
      .serverModules({ greetings: mod })

    // Second call is blocked at the type level — parameter becomes `never`.
    // @ts-expect-error — .serverModules() may be called at most once
    b.serverModules({ other: mod })

    expect(b).toBeDefined()
  })

  it('app without required ctx field rejects module registration', () => {
    const needsAuth = defineServerModule('auth')
      .serverFn('protected', {
        input: z.object({}),
        handler: async (_input, _ctx: BaseCtx & { userId: string }) => ({ ok: true }),
      })
      .build()

    const b = defineApp({ root: {}, target: '#app', context: { version: '1.0' } })

    // App provides { version: string }, module needs { userId: string } — mismatch.
    // @ts-expect-error — App context does not provide all required fields
    b.serverModules({ auth: needsAuth })

    expect(b).toBeDefined()
  })
})
