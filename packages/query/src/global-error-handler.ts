/**
 * @liteforge/query — global error handler registry
 *
 * A module-level singleton so that createQuery and createMutation can call
 * the handler without it being threaded through every call site as an argument.
 * Set by queryPlugin on install, cleared on plugin cleanup.
 */

export interface QueryErrorContext {
  /** Whether the error came from a query or a mutation */
  type: 'query' | 'mutation'
  /** Serialized query key — only present for query errors */
  key?: string
}

export type GlobalQueryErrorHandler = (error: Error, context: QueryErrorContext) => void

let _handler: GlobalQueryErrorHandler | null = null

/** @internal Called by queryPlugin during install */
export function setGlobalQueryErrorHandler(handler: GlobalQueryErrorHandler): void {
  _handler = handler
}

/** @internal Called by queryPlugin cleanup */
export function clearGlobalQueryErrorHandler(): void {
  _handler = null
}

/**
 * Fire the global error handler if one is registered.
 * No-op when no handler has been configured.
 */
export function notifyGlobalQueryError(error: Error, context: QueryErrorContext): void {
  if (!_handler) return
  try {
    _handler(error, context)
  } catch (e) {
    console.error('[Query] onError handler threw:', e)
  }
}
