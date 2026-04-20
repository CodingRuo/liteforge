/**
 * defineApp — High-Level Fullstack Facade
 *
 * Superset over `defineApp` from `@liteforge/runtime`: adds `.plugin()` for OakBun
 * plugins, `.serverModules()` for RPC modules, and server-aware terminal methods
 * (`.listen()`, `.build()`, `.dev()`).
 *
 * Phase A: types-only contract. Implementation lands in Phase B–F.
 *
 * Layer boundary: this file may import from `@liteforge/runtime` and `oakbun`.
 * The low-level `plugin.ts` / `client.ts` remain dependency-free.
 */

import type { LiteForgePlugin } from '@liteforge/runtime'
import type { AnyServerModule, InferServerApi, LiteForgeServerPlugin, ModulesMap } from './types.js'
import type { ContextMap, ResolveContext } from './context.js'
import type { DocumentDescriptor } from './define-document.js'

// ─── OakBun plugin shape (structural, no runtime import) ──────────────────────
// OakBun's BunPlugin type is imported as `import type` only — no runtime cost.
// Using a structural shape here keeps tests/mocks lightweight.
export interface OakBunPluginLike {
  readonly name: string
}

// ─── App config ───────────────────────────────────────────────────────────────

export interface AppConfig<TContext extends ContextMap = ContextMap> {
  /** Root component to render. */
  root: object | (() => Node)

  /** Mount target selector or element. */
  target: string | HTMLElement

  /** Optional static document shell (rendered by `.listen()`/`.build()`/`.dev()`). */
  document?: DocumentDescriptor

  /** Request-scoped context. Values may be static or `(req) => T` resolvers. */
  context?: TContext
}

// ─── Server context derivation ────────────────────────────────────────────────
// What a ServerFn handler sees as `ctx`.
// BaseCtx is the minimum (req: Request); resolved context is merged on top.
export interface BaseCtx {
  req: Request
}

export type AppServerCtx<TContext extends ContextMap> = BaseCtx & ResolveContext<TContext>

// ─── Required-context inference (Q1 resolution pattern) ───────────────────────
// Walks a ModulesMap and collects the union of `TCtx` constraints from every fn.
// Used by `.serverModules()` to verify app context compatibility at compile time.

type RequiredCtxOfFn<F> = F extends { readonly _ctx: infer C } ? C : never

type RequiredCtxOfModule<M> = M extends { readonly fns: infer TFns }
  ? { [K in keyof TFns]: RequiredCtxOfFn<TFns[K]> }[keyof TFns]
  : never

type RequiredCtxOfMap<TMap> = {
  [K in keyof TMap]: RequiredCtxOfModule<TMap[K]>
}[keyof TMap]

// Descriptive failure shape surfaced when an app doesn't provide required ctx fields.
export interface ServerModulesContextError<TRequired, TProvided> {
  readonly _error: 'App context does not provide all required fields'
  readonly _required: TRequired
  readonly _provided: TProvided
}

// Compile-time check: does `TAppCtx` satisfy `TRequired`?
type ServerModulesGuard<TAppCtx, TMap extends ModulesMap> =
  TAppCtx extends RequiredCtxOfMap<TMap>
    ? TMap
    : ServerModulesContextError<RequiredCtxOfMap<TMap>, TAppCtx>

// ─── Double-call block for `.serverModules()` (edge-case fix) ─────────────────
// Once the builder enters `TServerModulesCalled = true`, a second call is typed
// `(m: never)` — a compile error at the call site rather than a silent replace.
type ServerModulesInput<
  TAppCtx,
  TMap extends ModulesMap,
  TAlreadyCalled extends boolean,
> = TAlreadyCalled extends true ? never : ServerModulesGuard<TAppCtx, TMap>

// ─── AppInstance — carries the $server phantom-type (Option E) ────────────────

export interface AppInstance<TModules extends ModulesMap = Record<never, never>> {
  /** Unmount the app. Stops the server (if `.listen()`/`.dev()` was used). */
  unmount(): void

  /**
   * Phantom-type carrier for `use('server')`. Undefined at runtime.
   *
   * Consumers bind this into `PluginRegistry` via a one-time declaration:
   * ```ts
   * declare module '@liteforge/runtime' {
   *   interface PluginRegistry {
   *     server: typeof app['$server']
   *   }
   * }
   * ```
   */
  readonly $server: InferServerApi<LiteForgeServerPlugin<TModules>>
}

// ─── FullstackAppBuilder ──────────────────────────────────────────────────────

export interface FullstackAppBuilder<
  TContext extends ContextMap = ContextMap,
  TModules extends ModulesMap = Record<never, never>,
  TServerModulesCalled extends boolean = false,
> {
  /** Register an OakBun backend plugin. Chainable. */
  plugin(plugin: OakBunPluginLike): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>

  /** Register a LiteForge client plugin. Chainable. */
  use(plugin: LiteForgePlugin): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>

  /**
   * Register RPC modules. May be called at most once.
   *
   * Emits a compile error if any module's handler declares a `ctx` constraint
   * the app doesn't satisfy (see {@link ServerModulesContextError}).
   * Calling `.serverModules()` a second time is a compile error.
   */
  serverModules<TMap extends ModulesMap>(
    modules: ServerModulesInput<AppServerCtx<TContext>, TMap, TServerModulesCalled>,
  ): FullstackAppBuilder<TContext, TMap, true>

  /** Mount the app in the DOM. SPA-only — does not start a server. */
  mount(): Promise<AppInstance<TModules>>

  /** Start the production server on the given port. */
  listen(port: number): Promise<AppInstance<TModules>>

  /** Produce a deployable bundle in `outDir`. Does not start a server. */
  build(options: { outDir: string }): Promise<void>

  /** Start the development server (rebuild-on-request + RPC routes). */
  dev(options: { port: number }): Promise<AppInstance<TModules>>
}

// ─── defineApp ────────────────────────────────────────────────────────────────

export declare function defineApp<TContext extends ContextMap = Record<never, never>>(
  config: AppConfig<TContext>,
): FullstackAppBuilder<TContext>

// ─── Re-exports consumed via this module ──────────────────────────────────────
// AnyServerModule is re-referenced so the `_ctx` probe in RequiredCtxOfFn matches
// the shape from `./types.ts`. No runtime export.
export type { AnyServerModule }
