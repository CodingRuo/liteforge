/**
 * @liteforge/query
 *
 * Signals-based data fetching and caching for LiteForge.
 */
export { createQuery } from './query.js';
export { createMutation } from './mutation.js';
export { queryCache, serializeKey } from './cache.js';
export type { QueryKey, QueryFetcher, CreateQueryOptions, QueryResult, MutationFn, CreateMutationOptions, MutationResult, CacheAccess, CacheEntry, QueryCacheInterface, } from './types.js';
export { queryPlugin } from './plugin.js';
export type { QueryApi, QueryPluginOptions } from './plugin.js';
import type { QueryApi } from './plugin.js';
declare module '@liteforge/runtime' {
    interface PluginRegistry {
        query: QueryApi;
    }
}
//# sourceMappingURL=index.d.ts.map