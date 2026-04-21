/**
 * defineApp — High-Level Fullstack Facade
 *
 * Superset over `defineApp` from `@liteforge/runtime`: adds `.plugin()` for OakBun
 * plugins, `.serverModules()` for RPC modules, and server-aware terminal methods
 * (`.listen()`, `.build()`, `.dev()`).
 *
 * Server-side lifecycle code (startServer, runBuild, HMR, OakBun/Bun.build
 * integration) lives in `./_lifecycle.js` and is pulled in lazily via
 * `await import(...)` inside the terminal methods. This keeps the client
 * bundle free of server-only code — Bun's tree-shaker can drop the dynamic
 * import entirely when the client never calls `.listen/.dev/.build`.
 *
 * Layer boundary: `plugin.ts` / `client.ts` remain dependency-free. This
 * file depends on `@liteforge/runtime` (client-safe) and is allowed to
 * touch `oakbun` only through the lazy lifecycle module.
 */

import type { Plugin } from 'oakbun'
import type { AppInstance as RuntimeAppInstance, ComponentFactory, LiteForgePlugin } from '@liteforge/runtime'
import { defineApp as runtimeDefineApp } from '@liteforge/runtime'
import type { AnyServerModule, BaseCtx, InferServerApi, LiteForgeServerPlugin, ModulesMap } from './types.js'
import type { ContextMap, ResolveContext } from './context.js'
import type { DocumentDescriptor } from './define-document.js'
import { serverClientPlugin as createServerClient, type ServerClientOptions } from './client.js'
import { BUILDER_STATE, type BuilderState } from './_internal.js'

// ─── OakBun plugin shape ──────────────────────────────────────────────────────
export type OakBunPluginLike = Plugin<any, object>

// ─── App config ───────────────────────────────────────────────────────────────

export interface AppConfig<TContext extends ContextMap = ContextMap> {
  root: object | (() => Node)
  target: string | HTMLElement
  document?: DocumentDescriptor
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

// ─── AppInstance — carries $server and $ctx phantom-types ────────────────────

export interface AppInstance<
  TContext extends ContextMap = Record<never, never>,
  TModules extends ModulesMap = Record<never, never>,
> {
  unmount(): void
  use: RuntimeAppInstance['use']
  stop(): Promise<void>
  readonly port: number | null
  readonly $server: InferServerApi<LiteForgeServerPlugin<TModules>>
  readonly $ctx: BaseCtx & ResolveContext<TContext>
}

// ─── Terminal method option types ────────────────────────────────────────────

export interface ListenOptions {
  port: number
  hostname?: string
  clientEntry?: string
  publicDir?: string
}

export interface DevOptions {
  port: number
  hostname?: string
  clientEntry?: string
  watchDir?: string
  publicDir?: string
}

// ─── .build() types ───────────────────────────────────────────────────────────

export interface BuildOptions {
  clientEntry: string
  outDir?: string
  minify?: boolean
  target?: 'browser' | 'bun' | 'node'
  /**
   * Static asset directory whose contents are copied into `outDir` after
   * bundling. Defaults to `'./public'`. Pass `false` to skip copying
   * (useful for projects that manage assets themselves).
   */
  publicDir?: string | false
}

export interface BuildResult {
  outDir: string
  files: string[]
  success: boolean
}

// ─── FullstackAppBuilder ─────────────────────────────────────────────────────

export interface FullstackAppBuilder<
  TContext extends ContextMap = ContextMap,
  TModules extends ModulesMap = Record<never, never>,
  TServerModulesCalled extends boolean = false,
> {
  plugin(plugin: OakBunPluginLike): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  use(plugin: LiteForgePlugin | (() => LiteForgePlugin)): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  serverModules<TMap extends ModulesMap>(
    modules: ServerModulesInput<AppServerCtx<TContext>, TMap, TServerModulesCalled>,
  ): FullstackAppBuilder<TContext, TMap, true>

  mount(): Promise<AppInstance<TContext, TModules>>
  listen(port: number): Promise<AppInstance<TContext, TModules>>
  listen(options: ListenOptions): Promise<AppInstance<TContext, TModules>>
  build(options: BuildOptions): Promise<BuildResult>
  dev(options: DevOptions): Promise<AppInstance<TContext, TModules>>

  readonly $server: InferServerApi<LiteForgeServerPlugin<TModules>>
  readonly $ctx: BaseCtx & ResolveContext<TContext>
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

    use(plugin: LiteForgePlugin | (() => LiteForgePlugin)) {
      state.liteforgePlugins.push(plugin)
      return builder
    },

    serverModules(modules: ModulesMap) {
      state.modulesMap = modules
      state.serverModulesCalled = true
      return builder
    },

    async mount() {
      // Client-safe path — delegates to @liteforge/runtime's defineApp
      // without touching the server-side lifecycle module.
      const runtimeBuilder = runtimeDefineApp({
        root: state.options.root as ComponentFactory<object> | (() => Node),
        target: state.options.target,
      })

      const composedPlugins = composeLiteForgePlugins(state)
      for (const p of composedPlugins) {
        runtimeBuilder.use(p)
      }

      const runtimeInstance = await runtimeBuilder.mount()
      return wrapRuntimeInstance(runtimeInstance)
    },

    async listen(portOrOptions: number | ListenOptions) {
      const { startServer } = await import('./_lifecycle.js')
      const opts: ListenOptions =
        typeof portOrOptions === 'number' ? { port: portOrOptions } : portOrOptions
      return startServer(state, {
        port: opts.port,
        ...(opts.hostname !== undefined ? { hostname: opts.hostname } : {}),
        ...(opts.clientEntry !== undefined ? { clientEntry: opts.clientEntry } : {}),
        ...(opts.publicDir !== undefined ? { publicDir: opts.publicDir } : {}),
      })
    },

    async build(options: BuildOptions) {
      const { runBuild } = await import('./_lifecycle.js')
      return runBuild(state, options)
    },

    async dev(options: DevOptions) {
      const { startServer } = await import('./_lifecycle.js')
      return startServer(state, {
        port: options.port,
        devMode: true,
        ...(options.hostname !== undefined ? { hostname: options.hostname } : {}),
        ...(options.watchDir !== undefined ? { watchDir: options.watchDir } : {}),
        ...(options.clientEntry !== undefined ? { clientEntry: options.clientEntry } : {}),
        ...(options.publicDir !== undefined ? { publicDir: options.publicDir } : {}),
      })
    },
  }

  return builder as unknown as FullstackAppBuilder<TContext>
}

// ─── Re-exports consumed via this module ─────────────────────────────────────
export type { AnyServerModule }

// ─── Typeof-Helpers: ServerOf / CtxOf ─────────────────────────────────────────

export type ServerOf<T> = T extends { readonly $server: infer S } ? S : never
export type CtxOf<T> = T extends { readonly $ctx: infer C } ? C : never

// ─── Runtime-Instance wrapper ─────────────────────────────────────────────────

function wrapRuntimeInstance<
  TContext extends ContextMap,
  TModules extends ModulesMap,
>(
  runtime: RuntimeAppInstance,
  serverControl?: { stop: () => Promise<void>; port: number },
): AppInstance<TContext, TModules> {
  return {
    unmount: runtime.unmount,
    use: runtime.use,
    stop: serverControl ? serverControl.stop : async () => { /* no server to stop */ },
    port: serverControl?.port ?? null,
    $server: undefined as unknown as InferServerApi<LiteForgeServerPlugin<TModules>>,
    $ctx: undefined as unknown as BaseCtx & ResolveContext<TContext>,
  }
}

// ─── serverClientPlugin auto-install (Q3-B) ──────────────────────────────────

const SERVER_PLUGIN_NAME = 'liteforge-server-client'

export function createServerClientLiteForgePlugin<TMap extends ModulesMap>(
  _modulesMap: TMap,
  options?: ServerClientOptions,
): LiteForgePlugin {
  const client = createServerClient<InferServerApi<LiteForgeServerPlugin<TMap>>>(options ?? {})
  const proxy = client.useServer()

  return {
    name: SERVER_PLUGIN_NAME,
    install(ctx) {
      ctx.provide('server', proxy)
    },
  }
}

// ─── Plugin composition (client-safe) ─────────────────────────────────────────

export function composeLiteForgePlugins(
  state: BuilderState,
  options?: ServerClientOptions,
): LiteForgePlugin[] {
  const plugins: LiteForgePlugin[] = state.liteforgePlugins.map((entry) =>
    typeof entry === 'function' ? entry() : entry,
  )
  if (state.serverModulesCalled && state.modulesMap !== null) {
    plugins.push(createServerClientLiteForgePlugin(state.modulesMap, options))
  }
  return plugins
}

export function composeLiteForgePluginsForServer(state: BuilderState): LiteForgePlugin[] {
  return state.liteforgePlugins.filter(
    (entry): entry is LiteForgePlugin => typeof entry !== 'function',
  )
}

// ─── Context-plugin re-exports ───────────────────────────────────────────────
// Sourced from `./context-plugin.js` (not `./_lifecycle.js`) so that these
// re-exports don't drag the full server-side lifecycle into the client bundle.

export { createContextPlugin } from './context-plugin.js'
export type { ContextPlugin } from './context-plugin.js'
