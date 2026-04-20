import { describe, it, expect } from 'bun:test'
import { liteforgeBunPlugin } from '../src/index.js'
import path from 'node:path'

const fixturesDir = path.join(import.meta.dir, 'fixtures')

describe('liteforgeBunPlugin — Bun.build integration', () => {
  it('builds a .tsx fixture without errors', async () => {
    const result = await Bun.build({
      entrypoints: [path.join(fixturesDir, 'simple.tsx')],
      outdir: path.join(fixturesDir, 'out'),
      target: 'browser',
      plugins: [liteforgeBunPlugin()],
    })

    expect(result.success).toBe(true)
    expect(result.logs.filter(l => l.level === 'error')).toHaveLength(0)
  })

  it('output contains h() calls, not JSX syntax', async () => {
    const result = await Bun.build({
      entrypoints: [path.join(fixturesDir, 'simple.tsx')],
      outdir: path.join(fixturesDir, 'out'),
      target: 'browser',
      plugins: [liteforgeBunPlugin()],
    })

    expect(result.success).toBe(true)
    const output = result.outputs[0]
    expect(output).toBeDefined()
    const text = await output!.text()

    expect(text).toMatch(/h\(["']div["']/)
    expect(text).not.toMatch(/<div/)
  })

  it('output contains no TypeScript annotations', async () => {
    const result = await Bun.build({
      entrypoints: [path.join(fixturesDir, 'typed.tsx')],
      outdir: path.join(fixturesDir, 'out'),
      target: 'browser',
      plugins: [liteforgeBunPlugin()],
    })

    expect(result.success).toBe(true)
    const output = result.outputs[0]
    expect(output).toBeDefined()
    const text = await output!.text()

    expect(text).not.toMatch(/: string/)
    expect(text).not.toMatch(/: number/)
    expect(text).not.toMatch(/\(e: Event\)/)
  })

  it('output contains no React.createElement calls', async () => {
    const result = await Bun.build({
      entrypoints: [path.join(fixturesDir, 'simple.tsx')],
      outdir: path.join(fixturesDir, 'out'),
      target: 'browser',
      plugins: [liteforgeBunPlugin()],
    })

    expect(result.success).toBe(true)
    const output = result.outputs[0]
    const text = await output!.text()

    expect(text).not.toMatch(/React\.createElement/)
    expect(text).not.toMatch(/\bjsx\(/)
  })
})
