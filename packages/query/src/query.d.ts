/**
 * @liteforge/query - createQuery
 *
 * Reactive data fetching with caching, retries, and automatic refetching.
 */
import type { CreateQueryOptions, QueryResult } from './types.js';
/**
 * Create a reactive query with automatic caching and refetching.
 *
 * @param options - Query options including key, fetcher, and configuration
 * @returns Query result with reactive signals
 *
 * @example
 * ```ts
 * // Simple query
 * const users = createQuery({
 *   key: 'users',
 *   fn: () => fetch('/api/users').then(r => r.json())
 * });
 *
 * // Reactive key based on signal
 * const userId = signal(1);
 * const user = createQuery({
 *   key: () => ['user', userId()],
 *   fn: () => fetch(`/api/users/${userId()}`).then(r => r.json()),
 *   staleTime: 5000
 * });
 * ```
 */
export declare function createQuery<T>(options: CreateQueryOptions<T>): QueryResult<T>;
//# sourceMappingURL=query.d.ts.map