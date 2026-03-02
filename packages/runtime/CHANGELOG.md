# @liteforge/runtime

## 0.2.2

### Patch Changes

- fix: relax generic constraints and fix JSX component prop passing

  **@liteforge/runtime**

  - `createComponent<TProps>()` now accepts any interface as props type — no longer requires an index signature (`Record<string, unknown>`). Typed props with optional properties work correctly under `exactOptionalPropertyTypes: true`.
  - Added `ComponentFactoryInternal` export for internal lifecycle access (used by `h()`, `app.ts`, `control-flow.ts`)
  - `ComponentFactory` call signature returns `Node` (= `JSX.Element`) for proper JSX tag usage

  **@liteforge/vite-plugin**

  - JSX props on PascalCase (component) tags are no longer wrapped in getter functions. Only HTML element props get getter-wrapped for signal reactivity. This fixes runtime errors like `props.rows.map is not a function` when passing arrays or objects as component props.

  **@liteforge/router**

  - `RouteComponent` and `LazyComponent` type constraints relaxed to `object` (consistent with runtime change)

  **@liteforge/table**

  - `cell` and `headerCell` column definition return type widened to `Node | Element`

## 0.2.1

### Patch Changes

- fix: eliminate loading flash — stale-while-revalidate + HMR cache persistence

  **@liteforge/query:**

  - Query cache now persists on `window` and survives Vite HMR module re-evaluation (previously every HMR cycle reset the cache, forcing fresh fetches)
  - Signals initialize directly from cache at `createQuery()` time — no more flash of `data=undefined` before cache is read
  - Background revalidation: when stale data exists (on focus, HMR rerender, polling), `isLoading` stays `false` and fresh data replaces stale data silently — classic stale-while-revalidate behavior

  **@liteforge/runtime:**

  - HMR debounce timer moved to `window.__LITEFORGE_HMR_TIMER__` so it survives module re-evaluation
  - `fullRerender()` sets a cooldown flag to suppress the second Vite HMR wave triggered during remount

## 0.2.0

### Minor Changes

- b41d056: feat(hmr): component registry architecture for reliable hot module replacement

  Replaces the signal-driven HMR approach with a simpler component registry:

  - Every `createComponent()` call registers its definition in a `componentRegistry` Map
  - On Vite HMR, the module is re-evaluated → registry updated with latest code
  - `fullRerender()` tears down and remounts the app; all factories read the latest
    definition at call-time, including `setup()`, `component()`, `mounted()` etc.
  - Stores and router survive every re-render as module-level singletons
  - Layout edits now update instantly without a page reload
  - `setup()`-defined values (table columns, signals) update correctly after HMR
  - Removed ~370 lines of complexity: instance tracking, outlet transplanting,
    layout detection, `HotComponentState`, `createHotComponent`, `clearHotComponents`
  - `fullRerender()` is debounced 50 ms and preserves scroll position

  **Breaking (internal):** `HMRHandler` no longer has a `components` field.
  The `HMRInstance` type alias has been removed. The `HMRHandler.handleUpdate`
  method was renamed from `.update()` in the vite-plugin generated code.

- 20f3b24: Component-level HMR with state preservation

  - Components hot-replace without full page reload
  - `setup()` signals preserve their values (form inputs, toggles, counters)
  - Global stores preserve state (singleton registry pattern)
  - Router keeps current route
  - Scroll position maintained
  - DevTools stays open

  Implementation:

  - Vite plugin injects `__hmrId` into `createComponent()` calls
  - Runtime tracks mounted instances and re-renders with new component function
  - `setup()` result (signals) passed to new render, preserving reactivity

## 0.1.1

### Patch Changes

- 754b399: Add HMR (Hot Module Replacement) support

  Browser now auto-reloads when saving `.tsx`/`.jsx` files during development. This is Level 1 HMR - it triggers a page reload to pick up changes immediately, eliminating the need for manual browser refresh.

  **vite-plugin changes:**

  - HMR boundary code now includes a callback that notifies the global `__LITEFORGE_HMR__` handler
  - Module ID is passed to identify which module was updated
  - Source maps use empty mappings to preserve Vite's module graph

  **runtime changes:**

  - New `hmr.ts` module with `HMRHandler` interface and global registry
  - `initHMR()` initializes the HMR handler on `window.__LITEFORGE_HMR__`
  - `createApp()` integrates with HMR for potential full-app re-render

  Future work (Level 2 HMR): Component-level updates that preserve signal state.
