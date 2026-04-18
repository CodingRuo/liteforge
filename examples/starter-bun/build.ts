import { liteforgeBunPlugin } from '@liteforge/bun-plugin'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const outDir = './dist'
mkdirSync(outDir, { recursive: true })

const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: outDir,
  target: 'browser',
  minify: true,
  plugins: [liteforgeBunPlugin()],
})

if (!result.success) {
  for (const msg of result.logs) console.error(msg)
  process.exit(1)
}

// Copy CSS
copyFileSync('./src/styles.css', `${outDir}/styles.css`)

// Patch index.html: replace /main.js with the actual output filename
const outputFile = result.outputs.find(o => o.path.endsWith('.js'))
const jsFilename = outputFile ? outputFile.path.replace(`${outDir}/`, '/') : '/main.js'

const html = readFileSync('./index.html', 'utf8')
const patched = html.replace('/main.js', jsFilename)
writeFileSync(`${outDir}/index.html`, patched)

console.log(`Build complete → ${outDir}/`)
console.log(`  JS: ${jsFilename}`)
