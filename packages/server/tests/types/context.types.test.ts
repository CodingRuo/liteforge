// Type-level tests for late-binding ctx inference.
// The `@ts-expect-error` lines are verified by direct tsc invocation; within
// the project tsconfig tests/ is excluded, so these assertions are validated
// by running tsc on this file directly (or via the CI check).

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineServerModule } from '../../src/server-module.js'
import type { BaseCtx } from '../../src/types.js'

describe('ServerCtxRegistry late-binding (Phase C)', () => {
  it('without augmentation, handler ctx is BaseCtx (fallback)', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input, ctx) => {
          const r: Request = ctx.req
          // @ts-expect-error — no augmentation, tenantId is not on BaseCtx
          const _bad: string = ctx.tenantId
          return { greeting: `Hello ${input.name}`, url: r.url }
        },
      })
      .build()
    expect(mod._tag).toBe('ServerModule')
  })

  it('explicit TCtx generic overrides the default', () => {
    const mod = defineServerModule('auth')
      .serverFn('me', {
        input: z.object({}),
        handler: async (_input, ctx: BaseCtx & { userId: string }) => {
          const u: string = ctx.userId
          return { userId: u }
        },
      })
      .build()
    expect(mod.fns['me']).toBeDefined()
  })
})
