# @liteforge/store

## 0.1.1

### Patch Changes

- Batch #21-#28: query callbacks, form useField, Show no-arg children, typed ColumnDef, client refactor

  - **@liteforge/query** (#21): `onSuccess`/`onError` callbacks on `CreateQueryOptions`; (#22) `defaultEnabled` on `QueryPluginOptions`; fix `QueryKey` array serialization
  - **@liteforge/form** (#24): `form.field()` two overloads (typed path vs string), `useField()` composable exported
  - **@liteforge/runtime** (#26): `Show` `children` now accepts `() => Node` (no-arg) in addition to `(value) => Node`
  - **@liteforge/table** (#27): `ColumnDef<T, K>` generic over key type — `cell` value parameter is typed `T[K]` for real fields, `undefined` for virtual columns (`_prefix`)
  - **@liteforge/store** (#25): Declaration Merging JSDoc for typed `use('store:*')` pattern
  - **@liteforge/devtools**: `PanelPosition` gains `'bottom-right'`; `DevToolsStore`/`DevToolsStoreMap` types moved to `types.ts` and properly exported; `stores` config option on `DevToolsConfig`
  - **@liteforge/admin**: `buildAdminRoutes` gains `prefix` and `layout` options
