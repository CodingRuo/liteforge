# @liteforge/query

## 0.1.1

### Patch Changes

- fix: eliminate loading flash — stale-while-revalidate + HMR cache persistence

  **@liteforge/query:**

  - Query cache now persists on `window` and survives Vite HMR module re-evaluation (previously every HMR cycle reset the cache, forcing fresh fetches)
  - Signals initialize directly from cache at `createQuery()` time — no more flash of `data=undefined` before cache is read
  - Background revalidation: when stale data exists (on focus, HMR rerender, polling), `isLoading` stays `false` and fresh data replaces stale data silently — classic stale-while-revalidate behavior

  **@liteforge/runtime:**

  - HMR debounce timer moved to `window.__LITEFORGE_HMR_TIMER__` so it survives module re-evaluation
  - `fullRerender()` sets a cooldown flag to suppress the second Vite HMR wave triggered during remount
