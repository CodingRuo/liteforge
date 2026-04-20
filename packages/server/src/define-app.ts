/**
 * defineApp — High-Level Fullstack Facade
 *
 * Superset over `defineApp` from `@liteforge/runtime`: adds `.plugin()` for OakBun
 * plugins, `.serverModules()` for RPC modules, and server-aware terminal methods
 * (`.listen()`, `.build()`, `.dev()`).
 *
 * Phase B: builder chain implemented. Terminal methods throw until Phase F.
 *
 * Layer boundary: this file may import from `@liteforge/runtime` and `oakbun`.
 * The low-level `plugin.ts` / `client.ts` remain dependency-free.
 */

import type { Plugin } from 'oakbun'
import type { LiteForgePlugin } from '@liteforge/runtime'
import type { AnyServerModule, BaseCtx, InferServerApi, LiteForgeServerPlugin, ModulesMap } from './types.js'
import type { ContextMap, ResolveContext } from './context.js'
import type { DocumentDescriptor } from './define-document.js'
import { BUILDER_STATE, type BuilderState } from './_internal.js'

// ─── OakBun plugin shape ──────────────────────────────────────────────────────
// Public surface accepts any OakBun Plugin. Generic parameters are erased here
// because the concrete ctx extension of each plugin is opaque to the facade.
export type OakBunPluginLike = Plugin<any, object>

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

export type AppServerCtx<TContext extends ContextMap> = BaseCtx & ResolveContext<TContext>

// ─── Required-context inference (Q1 resolution pattern) ──────────────────────

type RequiredCtxOfFn<F> = F extends { readonly _ctx: infer C } ? C : never

type RequiredCtxOfModule<M> = M extends { readonly fns: infer TFns }
  ? { [K in keyof TFns]: RequiredCtxOfFn<TFns[K]> }[keyof TFns]
  : never

type RequiredCtxOfMap<TMap> = {
  [K in keyof TMap]: RequiredCtxOfModule<TMap[K]>
}[keyof TMap]

export interface ServerModulesContextError<TRequired, TProvided> {
  readonly _error: 'App context does not provide all required fields'
  readonly _required: TRequired
  readonly _provided: TProvided
}

type ServerModulesGuard<TAppCtx, TMap extends ModulesMap> =
  TAppCtx extends RequiredCtxOfMap<TMap>
    ? TMap
    : ServerModulesContextError<RequiredCtxOfMap<TMap>, TAppCtx>

type ServerModulesInput<
  TAppCtx,
  TMap extends ModulesMap,
  TAlreadyCalled extends boolean,
> = TAlreadyCalled extends true ? never : ServerModulesGuard<TAppCtx, TMap>

// ─── AppInstance — carries the $server phantom-type (Option E) ───────────────

export interface AppInstance<TModules extends ModulesMap = Record<never, never>> {
  unmount(): void

  /**
   * Phantom-type carrier for `use('server')`. Undefined at runtime.
   *
   * Bind into `PluginRegistry` once per project:
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

// ─── FullstackAppBuilder ─────────────────────────────────────────────────────

export interface FullstackAppBuilder<
  TContext extends ContextMap = ContextMap,
  TModules extends ModulesMap = Record<never, never>,
  TServerModulesCalled extends boolean = false,
> {
  plugin(plugin: OakBunPluginLike): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  use(plugin: LiteForgePlugin): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  serverModules<TMap extends ModulesMap>(
    modules: ServerModulesInput<AppServerCtx<TContext>, TMap, TServerModulesCalled>,
  ): FullstackAppBuilder<TContext, TMap, true>

  mount(): Promise<AppInstance<TModules>>
  listen(port: number): Promise<AppInstance<TModules>>
  build(options: { outDir: string }): Promise<void>
  dev(options: { port: number }): Promise<AppInstance<TModules>>
}

// ─── defineApp ───────────────────────────────────────────────────────────────

export function defineApp<TContext extends ContextMap = Record<never, never>>(
  config: AppConfig<TContext>,
): FullstackAppBuilder<TContext> {
  const state: BuilderState = {
    options: {
      root: config.root,
      target: config.target,
      ...(config.document !== undefined ? { document: config.document } : {}),
      ...(config.context !== undefined ? { context: config.context as Record<string, unknown> } : {}),
    },
    oakbunPlugins: [],
    liteforgePlugins: [],
    modulesMap: null,
    serverModulesCalled: false,
  }

  const builder = {
    [BUILDER_STATE]: state,

    plugin(plugin: OakBunPluginLike) {
      state.oakbunPlugins.push(plugin)
      return builder
    },

    use(plugin: LiteForgePlugin) {
      state.liteforgePlugins.push(plugin)
      return builder
    },

    serverModules(modules: ModulesMap) {
      state.modulesMap = modules
      state.serverModulesCalled = true
      return builder
    },

    mount() {
      throw new Error('[@liteforge/server] .mount() not implemented yet (Phase F)')
    },
    listen(_port: number) {
      throw new Error('[@liteforge/server] .listen() not implemented yet (Phase F)')
    },
    build(_options: { outDir: string }) {
      throw new Error('[@liteforge/server] .build() not implemented yet (Phase F)')
    },
    dev(_options: { port: number }) {
      throw new Error('[@liteforge/server] .dev() not implemented yet (Phase F)')
    },
  }

  return builder as unknown as FullstackAppBuilder<TContext>
}

// ─── Re-exports consumed via this module ─────────────────────────────────────
export type { AnyServerModule }
