import { liteforgeBunPlugin } from './plugin.js'
import type { LiteforgePluginOptions } from './plugin.js'

export interface DevServerOptions {
  entry: string
  outDir: string
  port?: number
  pluginOptions?: LiteforgePluginOptions
}

export function createDevServer(options: DevServerOptions): void {
  const { entry, outDir, port = 3000, pluginOptions = {} } = options
  const plugin = liteforgeBunPlugin(pluginOptions)

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      if (/\.\w+$/.test(url.pathname) && !/\.html?$/.test(url.pathname)) {
        const file = Bun.file(`${outDir}${url.pathname}`)
        if (await file.exists()) {
          return new Response(file)
        }
      }

      await Bun.build({
        entrypoints: [entry],
        outdir: outDir,
        target: 'browser',
        plugins: [plugin],
      })

      return new Response(Bun.file(`${outDir}/index.html`))
    },
  })

  console.log(`LiteForge dev server running at http://localhost:${port}`)
}
