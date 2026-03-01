/**
 * Middleware pipeline for @liteforge/client
 *
 * Middleware wraps the core fetch execution. The first middleware added
 * is the outermost wrapper (compose-style).
 */

import type { Middleware, RequestConfig, ResponseContext } from './types.js';

/**
 * Composes an array of middleware around a core handler.
 *
 * @param middlewares - List of middleware (outermost first)
 * @param core - The innermost handler (executeFetch)
 */
export function createMiddlewarePipeline(
  middlewares: Middleware[],
  core: (config: RequestConfig) => Promise<ResponseContext>,
): (config: RequestConfig) => Promise<ResponseContext> {
  if (middlewares.length === 0) {
    return core;
  }

  // Build the chain from the inside out (right to left)
  let handler: (config: RequestConfig) => Promise<ResponseContext> = core;
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const mw = middlewares[i];
    if (mw === undefined) continue;
    const next = handler;
    handler = (config: RequestConfig) => mw(config, next);
  }
  return handler;
}
