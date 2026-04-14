/**
 * @liteforge/router — Component Helpers
 *
 * Convenience functions for accessing router state inside components.
 */

import { use } from '@liteforge/runtime';
import { untrack } from '@liteforge/core';
import type { Signal } from '@liteforge/core';
import type { Router, RouteParams, QueryParams } from './types.js';

/**
 * Returns a **reactive getter** for a single named route parameter.
 *
 * The returned function re-reads `router.params()` on every call, so reading it
 * inside an `effect`, `computed`, or JSX getter will subscribe to param changes.
 *
 * ⚠️  **Loop danger in `setup()`**
 * If you pass the getter directly to `useOne()` / `createQuery()` key in `setup()`,
 * calling `id()` inside the query key function will re-track `router.params` on
 * every query run, creating an infinite refetch loop.
 *
 * ```ts
 * // ✗ BROKEN — infinite loop
 * setup() {
 *   const id = useParam('id');                           // reactive getter
 *   const item = resource.useOne(id);                    // id() tracked → loops
 * }
 *
 * // ✓ CORRECT for one-time reads (setup, load)
 * setup() {
 *   const id = Number(useParams<{ id: string }>().id);  // snapshot, no tracking
 *   const item = resource.useOne(id);
 * }
 *
 * // ✓ CORRECT for reactive derived state
 * component({ use }) {
 *   const id = useParam('id');
 *   const label = computed(() => `Editing #${id() ?? '?'}`);
 * }
 * ```
 */
export function useParam(name: string): () => string | undefined {
  const router = use<Router>('router');
  return () => router.params()[name];
}

/**
 * Returns a **snapshot** of all current route params.
 *
 * The read is wrapped in `untrack()` so calling `useParams()` in `setup()` or
 * `load()` never creates a reactive subscription — it always gives a plain object
 * with the values at the time of the call.
 *
 * Use `useParam()` (reactive getter) when you need the value to update
 * automatically inside effects, computed, or JSX.
 *
 * @example
 * ```ts
 * // ✓ Safe in setup() — plain snapshot, no reactive subscription
 * setup() {
 *   const { id } = useParams<{ id: string }>();
 *   const item = resource.useOne(Number(id));
 *   return { item };
 * }
 * ```
 */
export function useParams<T extends RouteParams = RouteParams>(): T {
  const router = use<Router>('router');
  return untrack(() => router.params()) as T;
}

/**
 * Returns the current path Signal.
 *
 * @example
 * ```ts
 * setup() {
 *   const path = usePath();  // Signal<string>
 *   return { path };
 * }
 * ```
 */
export function usePath(): Signal<string> {
  const router = use<Router>('router');
  return router.path;
}

/**
 * Returns a **snapshot** of the current query string params.
 *
 * The read is wrapped in `untrack()` so calling `useQuery()` in `setup()` or
 * `load()` never creates a reactive subscription.
 *
 * @example
 * ```ts
 * setup() {
 *   const { tab } = useQuery<{ tab?: string }>();
 *   return { tab };
 * }
 * ```
 */
export function useQuery<T extends QueryParams = QueryParams>(): T {
  const router = use<Router>('router');
  return untrack(() => router.query()) as T;
}

/**
 * Returns the parsed numeric ID from a route parameter for edit/create forms.
 * Returns `null` when the param is absent, empty, non-numeric, `NaN`, or `≤ 0`.
 *
 * Internally uses `useParams()` (snapshot) so it is always safe to call in
 * `setup()` without risk of a reactive loop.
 *
 * @param param - Route param name (default: `'id'`)
 *
 * @example
 * ```ts
 * setup() {
 *   const { editId, isEdit } = useEditParam()
 *   // editId: number | null
 *   // isEdit: boolean
 * }
 *
 * // Custom param name:
 * const { editId, isEdit } = useEditParam('invoiceId')
 * ```
 */
export function useEditParam(param = 'id'): { editId: number | null; isEdit: boolean } {
  const raw = useParam(param);
  const raw$ = raw();
  const parsed = raw$ ? Number(raw$) : NaN;
  const editId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return { editId, isEdit: editId !== null };
}

export function useRouter(): Router {
  return use<Router>('router');
}
