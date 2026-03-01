/**
 * @liteforge/query Cache
 *
 * Module-level singleton for query caching.
 */
import type { CacheEntry, QueryCacheInterface } from './types.js';
declare global {
    interface Window {
        __LITEFORGE_QUERY_CACHE__?: Map<string, CacheEntry>;
        __LITEFORGE_QUERY_REGISTRY__?: Map<string, Set<() => Promise<void>>>;
    }
}
/**
 * The global query cache singleton.
 */
export declare const queryCache: QueryCacheInterface;
/**
 * Serialize a query key to a string for cache lookup.
 */
export declare function serializeKey(key: string | ReadonlyArray<string | number | boolean | null | undefined>): string;
//# sourceMappingURL=cache.d.ts.map