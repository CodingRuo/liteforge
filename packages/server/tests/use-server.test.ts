/**
 * Integration: `use('server')` inside a LiteForge component returns the
 * auto-installed RPC proxy.
 *
 * Simulates the runtime's plugin-install pass by constructing a minimal
 * PluginContext with the same shape as @liteforge/runtime's internal one.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest'
import { composeLiteForgePlugins, defineApp } from '../src/define-app.js'
import { BUILDER_STATE, type BuilderState } from '../src/_internal.js'
import type { PluginContext } from '@liteforge/runtime'

function getState(builder: unknown): BuilderState {
  return (builder as Record<symbol, BuilderState>)[BUILDER_STATE]!
}

function simulatePluginContext(): { ctx: PluginContext; appContext: Record<string, unknown> } {
  const appContext: Record<string, unknown> = {}
  const target = document.createElement('div')
  const ctx: PluginContext = {
    target,
    provide<K extends string, T>(key: K, value: T): void {
      appContext[key] = value
    },
    resolve<T = unknown>(key: string): T | undefined {
      return key in appContext ? (appContext[key] as T) : undefined
    },
  }
  return { ctx, appContext }
}

describe('use("server") via composed plugins', () => {
  it('auto-installs the proxy into the app context', async () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const

    const b = defineApp({ root: {}, target: '#app' })
      .serverModules({ greetings: mod } as never)

    const plugins = composeLiteForgePlugins(getState(b))
    const { ctx, appContext } = simulatePluginContext()

    for (const plugin of plugins) {
      await plugin.install(ctx)
    }

    expect(appContext['server']).toBeDefined()

    const server = appContext['server'] as {
      greetings: { hello: (input: unknown) => Promise<unknown> }
    }
    // Proxy chain — access is lazy, actual fetch happens only on call
    expect(typeof server.greetings).toBe('object')
    expect(typeof server.greetings.hello).toBe('function')
  })

  it('does NOT install "server" in app context if serverModules() was never called', async () => {
    const b = defineApp({ root: {}, target: '#app' }).use({
      name: 'router',
      install() {
        /* no-op */
      },
    })

    const plugins = composeLiteForgePlugins(getState(b))
    const { ctx, appContext } = simulatePluginContext()

    for (const plugin of plugins) {
      await plugin.install(ctx)
    }

    expect(appContext['server']).toBeUndefined()
  })
})
