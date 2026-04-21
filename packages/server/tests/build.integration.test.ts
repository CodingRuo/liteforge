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
