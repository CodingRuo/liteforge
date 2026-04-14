/**
 * @liteforge/query
 * 
 * Signals-based data fetching and caching for LiteForge.
 */

// Core functions
export { createQuery } from './query.js';
export { createMutation } from './mutation.js';
export { queryCache, serializeKey } from './cache.js';

// Types
export type {
  // Query types
  QueryKey,
  QueryFetcher,
  CreateQueryOptions,
  QueryResult,

  // Mutation types
  MutationFn,
  CreateMutationOptions,
  MutationResult,
  CacheAccess,

  // Cache types
  CacheEntry,
  QueryCacheInterface,
} from './types.js';

// Plugin
export { queryPlugin } from './plugin.js';
export type { QueryApi, QueryPluginOptions } from './plugin.js';

// Global error handler
export {
  setGlobalQueryErrorHandler,
  clearGlobalQueryErrorHandler,
  notifyGlobalQueryError,
} from './global-error-handler.js';
export type { GlobalQueryErrorHandler, QueryErrorContext } from './global-error-handler.js';

