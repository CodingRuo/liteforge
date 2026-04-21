import type { AppLike } from '../types.js'

export interface BuildCommandInput {
  app: AppLike
  outDir: string
  minify: boolean
  clientEntry: string
}

export async function runBuild(input: BuildCommandInput): Promise<{ success: boolean }> {
  const result = await input.app.build({
    clientEntry: input.clientEntry,
    outDir: input.outDir,
    minify: input.minify,
  })
  console.log(`Built → ${result.outDir}`)
  for (const file of result.files) {
    console.log(`  ${file}`)
  }
  return { success: result.success }
}
