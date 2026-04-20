/**
 * Context utilities for defineApp.
 *
 * Supports static values and request-time resolvers:
 *   context: {
 *     version: '1.0',                             // static
 *     tenantId: (req: Request) => resolveTenant() // resolver
 *   }
 *
 * `ResolveContext<T>` maps the declared shape to its resolved runtime shape
 * so that handlers see `ctx.tenantId: string`, not the original function type.
 */

export type ContextMap = Record<string, unknown>

export type ResolveContext<T extends ContextMap> = {
  [K in keyof T]: T[K] extends (req: Request) => infer R ? Awaited<R> : T[K]
}
