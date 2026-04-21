// Type-level tests for late-binding ctx inference.
// The `@ts-expect-error` lines are verified by direct tsc invocation; within
// the project tsconfig tests/ is excluded, so these assertions are validated
// by running tsc on this file directly (or via the CI check).

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineServerModule } from '../../src/server-module.js'
import type { BaseCtx } from '../../src/types.js'

// Type-level identity-check utility.
// IsExact<A, B> is `true` only when A and B are mutually assignable
// without the `any` escape hatch (rules out `ctx: any` leaks).
type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

describe('ServerCtxRegistry late-binding (Phase C)', () => {
  it('without augmentation, handler ctx is exactly BaseCtx (no any/unknown leak)', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input, ctx) => {
          // ── Positive: BaseCtx fields are present ─────────────────────────
          const r: Request = ctx.req

          // ── Negative: non-BaseCtx fields are absent ──────────────────────
          // @ts-expect-error — no augmentation, tenantId is not on BaseCtx
          const _bad: string = ctx.tenantId

          // ── Anti-leak: ctx is EXACTLY BaseCtx, not `any` and not `unknown`
          // If ctx were `any`, _isExact would be `false` (any ≠ BaseCtx).
          // If ctx were `unknown`, _isExact would be `false` (unknown ≠ BaseCtx).
          const _isExact: IsExact<typeof ctx, BaseCtx> = true
          expect(_isExact).toBe(true)

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
