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

/**
 * Resolve a context declaration against a concrete request.
 *
 * - Static values pass through unchanged.
 * - Function values are invoked with the request; their return value is awaited.
 *   (Promises are awaited; non-promises are passed through synchronously.)
 *
 * Called once per RPC request (not cached) so resolvers can read per-request
 * state such as headers, cookies, or the authenticated subject.
 */
export async function resolveRequestContext<T extends ContextMap>(
  declaration: T,
  req: Request,
): Promise<ResolveContext<T>> {
  const entries = Object.entries(declaration)
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of entries) {
    if (typeof value === 'function') {
      resolved[key] = await (value as (r: Request) => unknown)(req)
    } else {
      resolved[key] = value
    }
  }

  return resolved as ResolveContext<T>
}
