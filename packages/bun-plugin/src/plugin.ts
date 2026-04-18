import type { BunPlugin } from 'bun'
import { transformJsx, resolveTransformOptions } from '@liteforge/transform'
import type { TransformOptions } from '@liteforge/transform'

export type LiteforgePluginOptions = Partial<TransformOptions>

export function liteforgeBunPlugin(options: LiteforgePluginOptions = {}): BunPlugin {
  const resolved = resolveTransformOptions(options)
  return {
    name: 'liteforge',
    setup(build) {
      build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
        const code = await Bun.file(args.path).text()
        const result = transformJsx(code, resolved, false)
        return { contents: result.code, loader: 'js' }
      })
    },
  }
}
