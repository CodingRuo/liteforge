import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadApp, LoadAppError } from '../src/load-app.js'

let projectDir: string | null = null

beforeEach(() => {
  projectDir = mkdtempSync(path.join(tmpdir(), 'lf-cli-load-'))
})

afterEach(() => {
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true })
    projectDir = null
  }
})

async function writeModule(relPath: string, content: string): Promise<string> {
  const full = path.join(projectDir!, relPath)
  writeFileSync(full, content)
  return full
}

describe('loadApp', () => {
  it('returns the default export when it looks like a LiteForge app', async () => {
    const entry = await writeModule(
      'ok.mjs',
      `export default {
        dev: async () => ({ port: 0, stop: async () => {} }),
        listen: async () => ({ port: 0, stop: async () => {} }),
        build: async () => ({ outDir: '', files: [], success: true }),
      }`,
    )
    const app = await loadApp(entry)
    expect(typeof app.dev).toBe('function')
    expect(typeof app.listen).toBe('function')
    expect(typeof app.build).toBe('function')
  })

  it('falls back to named `app` export when no default', async () => {
    const entry = await writeModule(
      'named.mjs',
      `export const app = {
        dev: async () => ({ port: 0, stop: async () => {} }),
        listen: async () => ({ port: 0, stop: async () => {} }),
        build: async () => ({ outDir: '', files: [], success: true }),
      }`,
    )
    const app = await loadApp(entry)
    expect(typeof app.dev).toBe('function')
  })

  it('throws LoadAppError when default export is missing the app shape', async () => {
    const entry = await writeModule('bad.mjs', `export default { foo: 1 }`)
    await expect(loadApp(entry)).rejects.toThrow(LoadAppError)
    await expect(loadApp(entry)).rejects.toThrow(/Entry file does not export a LiteForge app/)
  })

  it('throws LoadAppError when there is no default and no named app', async () => {
    const entry = await writeModule('empty.mjs', `export const other = 1`)
    await expect(loadApp(entry)).rejects.toThrow(LoadAppError)
  })

  it('wraps underlying import errors with context', async () => {
    const entry = path.join(projectDir!, 'does-not-exist.mjs')
    await expect(loadApp(entry)).rejects.toThrow(LoadAppError)
    await expect(loadApp(entry)).rejects.toThrow(/Failed to import entry file/)
  })

  it('rejects a default export that is a function (not an app object)', async () => {
    const entry = await writeModule('fn.mjs', `export default function () {}`)
    await expect(loadApp(entry)).rejects.toThrow(LoadAppError)
  })
})
