import { createDevServer } from '@liteforge/bun-plugin/dev'
import { copyFileSync, mkdirSync } from 'node:fs'

const outDir = './dist'
mkdirSync(outDir, { recursive: true })
copyFileSync('./src/styles.css', `${outDir}/styles.css`)
copyFileSync('./index.html', `${outDir}/index.html`)

createDevServer({
  entry: './src/main.tsx',
  outDir,
  port: 3000,
})
