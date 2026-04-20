/**
 * Internal-only exports. Not re-exported from `index.ts`.
 *
 * Used by test files that need to inspect builder state without adding
 * `__getState` to the public `FullstackAppBuilder` surface.
 */

import type { LiteForgePlugin } from '@liteforge/runtime'
import type { ModulesMap } from './types.js'
import type { OakBunPluginLike } from './define-app.js'

/** Symbol-keyed accessor for builder internals. Test-only. */
export const BUILDER_STATE = Symbol.for('@liteforge/server.builder-state')

export interface BuilderState {
  options: {
    root: object | (() => Node)
    target: string | HTMLElement
    document?: unknown
    context?: Record<string, unknown>
  }
  oakbunPlugins: OakBunPluginLike[]
  liteforgePlugins: LiteForgePlugin[]
  modulesMap: ModulesMap | null
  serverModulesCalled: boolean
}
