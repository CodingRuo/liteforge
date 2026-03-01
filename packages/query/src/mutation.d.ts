/**
 * @liteforge/query - createMutation
 *
 * Mutations with optimistic updates and automatic cache invalidation.
 */
import type { CreateMutationOptions, MutationResult } from './types.js';
/**
 * Create a mutation handler with cache invalidation support.
 *
 * @param options - Mutation options including fn, invalidate, and callbacks
 * @returns Mutation result with reactive signals
 *
 * @example
 * ```ts
 * const createPost = createMutation({
 *   fn: (data: { title: string; body: string }) =>
 *     fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
 *   invalidate: ['posts'],
 *   onSuccess: (data) => console.log('Created:', data),
 * });
 *
 * // Execute mutation
 * await createPost.mutate({ title: 'Hello', body: 'World' });
 * ```
 */
export declare function createMutation<TData, TVariables = void>(options: CreateMutationOptions<TData, TVariables>): MutationResult<TData, TVariables>;
//# sourceMappingURL=mutation.d.ts.map