/**
 * Context-plugin factory — split out from `_lifecycle.ts` so that consumers
 * who only need the context plugin don't pull the full server-side lifecycle
 * into their bundle.
 *
 * Client-safe: only depends on the pure context-resolver helper.
 */

import type { ContextMap } from './context.js'
import { resolveRequestContext } from './context.js'

export interface ContextPlugin {
  readonly name: 'liteforge-context'
  request: (ctx: { req: Request }) => Promise<Record<string, unknown>>
}

export function createContextPlugin<TContext extends ContextMap>(
  declaration: TContext,
): ContextPlugin {
  return {
    name: 'liteforge-context',
    async request(ctx) {
      return resolveRequestContext(declaration, ctx.req) as unknown as Record<string, unknown>
    },
  }
}
