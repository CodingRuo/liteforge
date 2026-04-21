/**
 * Phase F.4 — defineApp.build() integration tests.
 *
 * Runs under Bun (uses Bun.build). Uses a tmp dir for isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineApp, defineDocument } from '../src/index.js'

function makeRoot(): () => Node {
  return () => ({} as Node)
}

let projectDir: string | null = null

beforeEach(() => {
  projectDir = mkdtempSync(path.join(tmpdir(), 'lf-build-'))
  mkdirSync(path.join(projectDir, 'src'), { recursive: true })
})

afterEach(() => {
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true })
    projectDir = null
  }
})

describe('.build() — client bundle', () => {
  it('emits a JS bundle to <outDir>/client/ from a .tsx entry', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(
      clientEntry,
      `export function main() { const x: number = 42; return x }\n`,
    )

    const outDir = path.join(projectDir!, 'dist')
    const app = defineApp({ root: makeRoot(), target: '#app' })
    const result = await app.build({ clientEntry, outDir })

    expect(result.success).toBe(true)
    expect(result.outDir).toBe(path.resolve(outDir))
    expect(result.files.length).toBeGreaterThan(0)
    expect(result.files.some((f) => f.endsWith('.js'))).toBe(true)
    expect(result.files.some((f) => f === path.join('client', 'index.html'))).toBe(true)

    // Bundle must contain the function body (verifies Bun.build actually ran)
    const jsFile = result.files.find((f) => f.endsWith('.js'))!
    const jsContent = readFileSync(path.join(outDir, jsFile), 'utf-8')
    expect(jsContent).toContain('42')
  })

  it('passes liteforgeBunPlugin and the right externals to Bun.build', async () => {
    // JSX-transform correctness is covered by @liteforge/bun-plugin's own
    // integration tests (tests/plugin.integration.test.ts) — we only assert
    // here that .build() wires up Bun.build with the expected config.
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const originalBuild = Bun.build
    const calls: Array<Record<string, unknown>> = []
    ;(Bun as unknown as { build: typeof Bun.build }).build = (async (
      opts: Parameters<typeof Bun.build>[0],
    ) => {
      calls.push(opts as unknown as Record<string, unknown>)
      return originalBuild(opts)
    }) as typeof Bun.build

    try {
      await defineApp({ root: makeRoot(), target: '#app' })
        .build({ clientEntry, outDir: path.join(projectDir!, 'dist'), minify: true })
    } finally {
      ;(Bun as unknown as { build: typeof Bun.build }).build = originalBuild
    }

    expect(calls).toHaveLength(1)
    const opts = calls[0] as {
      plugins: Array<{ name: string }>
      external: string[]
      minify: boolean
      target: string
    }
    expect(opts.plugins.some((p) => p.name === 'liteforge')).toBe(true)
    expect(opts.external).toContain('oakbun')
    expect(opts.minify).toBe(true)
    expect(opts.target).toBe('browser')
  })

  it('omits oakbun from external when target is not browser', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const originalBuild = Bun.build
    const calls: Array<Record<string, unknown>> = []
    ;(Bun as unknown as { build: typeof Bun.build }).build = (async (
      opts: Parameters<typeof Bun.build>[0],
    ) => {
      calls.push(opts as unknown as Record<string, unknown>)
      return originalBuild(opts)
    }) as typeof Bun.build

    try {
      await defineApp({ root: makeRoot(), target: '#app' })
        .build({ clientEntry, outDir: path.join(projectDir!, 'dist'), target: 'bun' })
    } finally {
      ;(Bun as unknown as { build: typeof Bun.build }).build = originalBuild
    }

    const opts = calls[0] as { external: string[]; target: string }
    expect(opts.target).toBe('bun')
    expect(opts.external).not.toContain('oakbun')
  })
})

describe('.build() — HTML shell emission', () => {
  it('writes the rendered HTML shell into <outDir>/client/index.html', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const outDir = path.join(projectDir!, 'dist')
    const doc = defineDocument({
      lang: 'de',
      head: { title: 'Build Test', description: 'F.4' },
    })

    await defineApp({ root: makeRoot(), target: '#app', document: doc })
      .build({ clientEntry, outDir })

    const html = readFileSync(path.join(outDir, 'client/index.html'), 'utf-8')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="de">')
    expect(html).toContain('<title>Build Test</title>')
    expect(html).toContain('<meta name="description" content="F.4">')
    expect(html).toContain('<div id="app"></div>')
  })

  it('writes a default HTML shell when no document is configured', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const outDir = path.join(projectDir!, 'dist')
    await defineApp({ root: makeRoot(), target: '#app' })
      .build({ clientEntry, outDir })

    const html = readFileSync(path.join(outDir, 'client/index.html'), 'utf-8')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<div id="app"></div>')
  })
})

describe('.build() — minify option', () => {
  it('produces a smaller bundle with minify: true vs minify: false', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(
      clientEntry,
      `export function computeTotal(items) {\n` +
      `  const initialValue = 0\n` +
      `  const accumulator = (sum, item) => sum + item.price * item.quantity\n` +
      `  return items.reduce(accumulator, initialValue)\n` +
      `}\n`,
    )

    const app = defineApp({ root: makeRoot(), target: '#app' })

    const outMin = path.join(projectDir!, 'dist-min')
    const resultMin = await app.build({ clientEntry, outDir: outMin, minify: true })
    const minJs = readFileSync(path.join(outMin, resultMin.files.find((f) => f.endsWith('.js'))!), 'utf-8')

    const outUnMin = path.join(projectDir!, 'dist-unmin')
    const resultUnMin = await app.build({ clientEntry, outDir: outUnMin, minify: false })
    const unMinJs = readFileSync(path.join(outUnMin, resultUnMin.files.find((f) => f.endsWith('.js'))!), 'utf-8')

    expect(minJs.length).toBeLessThan(unMinJs.length)
  })
})

describe('.build() — error handling', () => {
  it('throws with a helpful message when the entry file has a syntax error', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export function broken(\n`) // unclosed paren

    const outDir = path.join(projectDir!, 'dist')
    const app = defineApp({ root: makeRoot(), target: '#app' })

    await expect(app.build({ clientEntry, outDir })).rejects.toThrow(
      /\.build\(\) failed/,
    )
  })

  it('throws when the entry file does not exist', async () => {
    const clientEntry = path.join(projectDir!, 'src/does-not-exist.tsx')
    const outDir = path.join(projectDir!, 'dist')
    const app = defineApp({ root: makeRoot(), target: '#app' })

    await expect(app.build({ clientEntry, outDir })).rejects.toThrow()
  })
})

describe('.build() — publicDir copy', () => {
  it('copies flat files from publicDir into <outDir>/client/', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'styles.css'), 'body { color: red; }')

    const outDir = path.join(projectDir!, 'dist')
    const result = await defineApp({ root: makeRoot(), target: '#app' })
      .build({ clientEntry, outDir, publicDir })

    expect(result.success).toBe(true)
    const copied = path.join(outDir, 'client/styles.css')
    expect(readFileSync(copied, 'utf-8')).toBe('body { color: red; }')
    expect(result.files.some((f) => f.endsWith('styles.css'))).toBe(true)
  })

  it('copies nested directories (public/images/logo.png → dist/client/images/logo.png)', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(path.join(publicDir, 'images'), { recursive: true })
    const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
    writeFileSync(path.join(publicDir, 'images/logo.png'), pngBytes)

    const outDir = path.join(projectDir!, 'dist')
    await defineApp({ root: makeRoot(), target: '#app' })
      .build({ clientEntry, outDir, publicDir })

    const copied = readFileSync(path.join(outDir, 'client/images/logo.png'))
    // Binary round-trip must be byte-identical
    expect(Array.from(copied)).toEqual(Array.from(pngBytes))
  })

  it('skips copy silently when publicDir does not exist', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const outDir = path.join(projectDir!, 'dist')
    const result = await defineApp({ root: makeRoot(), target: '#app' })
      .build({ clientEntry, outDir, publicDir: path.join(projectDir!, 'no-public-dir') })

    expect(result.success).toBe(true)
    // Build still succeeds; only bundle + index.html present
    expect(result.files.some((f) => f.endsWith('.js'))).toBe(true)
    expect(result.files.some((f) => f === path.join('client', 'index.html'))).toBe(true)
  })

  it('defaults to ./public if publicDir is omitted', async () => {
    // Write publicDir as ./public relative to cwd inside projectDir by using
    // a subproject layout: run with absolute paths but pass no publicDir opt.
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    // Create ./public in projectDir, then `cd` so default './public' resolves here
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *')

    const outDir = path.join(projectDir!, 'dist')
    const origCwd = process.cwd()
    try {
      process.chdir(projectDir!)
      await defineApp({ root: makeRoot(), target: '#app' })
        .build({ clientEntry, outDir })
      expect(readFileSync(path.join(outDir, 'client/robots.txt'), 'utf-8')).toBe('User-agent: *')
    } finally {
      process.chdir(origCwd)
    }
  })

  it('skips publicDir copy entirely when publicDir: false', async () => {
    const clientEntry = path.join(projectDir!, 'src/main.tsx')
    writeFileSync(clientEntry, `export const x = 1\n`)

    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'should-not-copy.txt'), 'x')

    const outDir = path.join(projectDir!, 'dist')
    await defineApp({ root: makeRoot(), target: '#app' })
      .build({ clientEntry, outDir, publicDir: false })

    // File should not exist in output
    expect(() => readFileSync(path.join(outDir, 'client/should-not-copy.txt'))).toThrow()
  })

  it('logs a warning and keeps framework output when public file conflicts with bundle output', async () => {
    // Use `client.tsx` as entry so Bun.build emits `client.js` — which
    // matches the public file name and triggers the conflict-skip path.
    const clientEntry = path.join(projectDir!, 'src/client.tsx')
    writeFileSync(clientEntry, `export const x = 42\n`)

    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'client.js'), '// user override that must NOT overwrite framework bundle')

    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    }

    const outDir = path.join(projectDir!, 'dist')
    try {
      await defineApp({ root: makeRoot(), target: '#app' })
        .build({ clientEntry, outDir, publicDir })
    } finally {
      console.warn = originalWarn
    }

    // Framework client.js bundle is intact (contains bundled source marker)
    const clientJs = readFileSync(path.join(outDir, 'client/client.js'), 'utf-8')
    expect(clientJs).toContain('42') // from entry
    expect(clientJs).not.toContain('user override that must NOT overwrite')

    const conflictWarning = warnings.find((w) => w.includes('client.js'))
    expect(conflictWarning).toBeDefined()
    expect(conflictWarning).toMatch(/conflict with build output/)
  })
})
