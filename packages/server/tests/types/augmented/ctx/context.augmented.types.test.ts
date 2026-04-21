// Spec-Vision Compile-Test: with ServerCtxRegistry augmented, handlers see
// the resolved context without any annotation or generic parameter.
//
// IMPORTANT: Augmenting ServerCtxRegistry in this file affects type resolution
// for ALL files that import @liteforge/server in the same TS program. This is
// expected behaviour of declaration merging — we isolate the demo by keeping
// augmentation-dependent assertions in this file only.

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineServerModule } from '../../../../src/server-module.js'

// ─── User-side augmentation (what users write once in src/types.d.ts) ────────
//
// NOTE on test isolation: this augmentation affects type resolution for every
// file in the same TS program. We isolate this file under
// `tests/types/augmented/ctx/` with its own `tsconfig.json` so that other
// augmentation-dependent tests (server, etc.) get their own isolated TS scope.
// In a real project, augmentation goes into `src/types.d.ts` and naturally
// applies project-wide — which is the desired behaviour there.
declare module '../../../../src/types.js' {
  interface ServerCtxRegistry {
    ctx: {
      req: Request
      tenantId: string
      version: string
    }
  }
}

describe('ServerCtxRegistry augmentation (Phase C Spec-Vision)', () => {
  it('handler ctx is typed without any annotation or generic', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input, ctx) => {
          // Positive: no annotation, no generic — ctx is typed from registry
          const tid: string = ctx.tenantId
          const v: string = ctx.version
          const r: Request = ctx.req

          // Negative: non-existent key gives a real TS2339
          // @ts-expect-error — notExisting is not in augmented ctx
          const _bad: string = ctx.notExisting

          // Negative: wrong type on existing key
          // @ts-expect-error — tenantId is string, not number
          const _badType: number = ctx.tenantId

          return { greeting: `Hello ${input.name} from ${tid} v${v}`, url: r.url }
        },
      })
      .build()

    expect(mod._tag).toBe('ServerModule')
    expect(mod.fns['hello']).toBeDefined()
  })
})
