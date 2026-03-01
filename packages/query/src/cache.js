/**
 * @liteforge/query Cache
 *
 * Module-level singleton for query caching.
 */
/**
 * Internal cache storage — kept on window so it survives HMR module re-evaluation.
 * In non-browser environments (SSR, tests) falls back to a plain module-scope Map.
 */
function getOrCreateMap(key) {
    if (typeof window === 'undefined')
        return new Map();
    const w = window;
    if (!w[key])
        w[key] = new Map();
    return w[key];
}
const cacheMap = getOrCreateMap('__LITEFORGE_QUERY_CACHE__');
/**
 * Registered queries for invalidation callbacks.
 * Maps cache key to a Set of refetch functions.
 */
const queryRegistry = getOrCreateMap('__LITEFORGE_QUERY_REGISTRY__');
/**
 * Create the query cache singleton.
 */
function createQueryCache() {
    return {
        get(key) {
            const entry = cacheMap.get(key);
            if (!entry)
                return undefined;
            return entry.data;
        },
        set(key, data) {
            const existing = cacheMap.get(key);
            cacheMap.set(key, {
                data,
                fetchedAt: Date.now(),
                subscribers: existing?.subscribers ?? 0,
                gcTimeout: existing?.gcTimeout,
            });
        },
        invalidate(keyOrPattern) {
            // Check if it's a glob pattern (ends with *)
            if (keyOrPattern.endsWith('*')) {
                const prefix = keyOrPattern.slice(0, -1);
                const keysToInvalidate = [];
                for (const key of cacheMap.keys()) {
                    if (key.startsWith(prefix)) {
                        keysToInvalidate.push(key);
                    }
                }
                // Invalidate all matching keys
                for (const key of keysToInvalidate) {
                    invalidateKey(key);
                }
            }
            else {
                // Single key invalidation
                invalidateKey(keyOrPattern);
            }
        },
        clear() {
            // Clear all GC timeouts
            for (const entry of cacheMap.values()) {
                if (entry.gcTimeout) {
                    clearTimeout(entry.gcTimeout);
                }
            }
            cacheMap.clear();
            // Don't clear queryRegistry - queries are still active
        },
        getAll() {
            return new Map(cacheMap);
        },
        getEntry(key) {
            return cacheMap.get(key);
        },
        updateEntry(key, updater) {
            const entry = cacheMap.get(key);
            if (entry) {
                cacheMap.set(key, updater(entry));
            }
        },
        subscribe(key) {
            const entry = cacheMap.get(key);
            if (entry) {
                // Cancel any pending GC
                if (entry.gcTimeout) {
                    clearTimeout(entry.gcTimeout);
                    entry.gcTimeout = undefined;
                }
                entry.subscribers++;
            }
            else {
                // Create a placeholder entry
                cacheMap.set(key, {
                    data: undefined,
                    fetchedAt: 0,
                    subscribers: 1,
                    gcTimeout: undefined,
                });
            }
        },
        unsubscribe(key, cacheTime) {
            const entry = cacheMap.get(key);
            if (!entry)
                return;
            entry.subscribers = Math.max(0, entry.subscribers - 1);
            // Schedule garbage collection if no subscribers
            if (entry.subscribers === 0 && cacheTime > 0) {
                entry.gcTimeout = setTimeout(() => {
                    const currentEntry = cacheMap.get(key);
                    if (currentEntry && currentEntry.subscribers === 0) {
                        cacheMap.delete(key);
                    }
                }, cacheTime);
            }
            else if (entry.subscribers === 0 && cacheTime === 0) {
                // Immediate cleanup
                cacheMap.delete(key);
            }
        },
        registerQuery(key, refetch) {
            let queries = queryRegistry.get(key);
            if (!queries) {
                queries = new Set();
                queryRegistry.set(key, queries);
            }
            queries.add(refetch);
            // Return unregister function
            return () => {
                const q = queryRegistry.get(key);
                if (q) {
                    q.delete(refetch);
                    if (q.size === 0) {
                        queryRegistry.delete(key);
                    }
                }
            };
        },
    };
}
/**
 * Invalidate a single cache key and trigger refetches.
 */
function invalidateKey(key) {
    const entry = cacheMap.get(key);
    if (entry) {
        // Mark as stale by setting fetchedAt to 0
        entry.fetchedAt = 0;
    }
    // Trigger refetch on all registered queries for this key
    const queries = queryRegistry.get(key);
    if (queries) {
        for (const refetch of queries) {
            // Fire and forget - don't wait for refetch
            refetch().catch(() => {
                // Silently ignore refetch errors during invalidation
            });
        }
    }
}
// ============================================================================
// Export Singleton
// ============================================================================
/**
 * The global query cache singleton.
 */
export const queryCache = createQueryCache();
/**
 * Serialize a query key to a string for cache lookup.
 */
export function serializeKey(key) {
    if (typeof key === 'string') {
        return key;
    }
    return key.map(part => String(part)).join(':');
}
//# sourceMappingURL=cache.js.map