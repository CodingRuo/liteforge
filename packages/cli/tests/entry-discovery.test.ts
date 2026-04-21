import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  discoverServerEntry,
  discoverClientEntry,
  discover,
  EntryNotFoundError,
} from '../src/entry-discovery.js'

let projectDir: string | null = null

beforeEach(() => {
  projectDir = mkdtempSync(path.join(tmpdir(), 'lf-cli-discover-'))
})

afterEach(() => {
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true })
    projectDir = null
  }
})

describe('discoverServerEntry', () => {
  it('finds src/app.ts (highest priority)', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/app.ts'), 'export default {}')
    writeFileSync(path.join(projectDir!, 'src/app.tsx'), 'x')
    writeFileSync(path.join(projectDir!, 'app.ts'), 'x')

    const entry = discoverServerEntry({ cwd: projectDir! })
    expect(entry).toBe(path.resolve(projectDir!, 'src/app.ts'))
  })

  it('falls back to src/app.tsx when src/app.ts is missing', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/app.tsx'), 'x')

    const entry = discoverServerEntry({ cwd: projectDir! })
    expect(entry).toBe(path.resolve(projectDir!, 'src/app.tsx'))
  })

  it('falls back to app.ts at project root', () => {
    writeFileSync(path.join(projectDir!, 'app.ts'), 'x')

    const entry = discoverServerEntry({ cwd: projectDir! })
    expect(entry).toBe(path.resolve(projectDir!, 'app.ts'))
  })

  it('falls back to app.tsx at project root', () => {
    writeFileSync(path.join(projectDir!, 'app.tsx'), 'x')

    const entry = discoverServerEntry({ cwd: projectDir! })
    expect(entry).toBe(path.resolve(projectDir!, 'app.tsx'))
  })

  it('--entry flag overrides discovery', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/app.ts'), 'x')
    writeFileSync(path.join(projectDir!, 'custom.ts'), 'x')

    const entry = discoverServerEntry({ cwd: projectDir!, entry: 'custom.ts' })
    expect(entry).toBe(path.resolve(projectDir!, 'custom.ts'))
  })

  it('--entry with absolute path resolves correctly', () => {
    const absolute = path.resolve(projectDir!, 'absolute.ts')
    writeFileSync(absolute, 'x')

    const entry = discoverServerEntry({ cwd: projectDir!, entry: absolute })
    expect(entry).toBe(absolute)
  })

  it('throws EntryNotFoundError when no candidate exists', () => {
    expect(() => discoverServerEntry({ cwd: projectDir! })).toThrow(EntryNotFoundError)
  })

  it('throws when --entry points to a non-existent file', () => {
    expect(() => discoverServerEntry({ cwd: projectDir!, entry: 'no-such-file.ts' })).toThrow(
      /Entry file not found/,
    )
  })
})

describe('discoverClientEntry', () => {
  it('finds src/client.ts (highest priority)', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/client.ts'), 'x')
    writeFileSync(path.join(projectDir!, 'src/client.tsx'), 'x')

    const client = discoverClientEntry({ cwd: projectDir! })
    expect(client).toBe(path.resolve(projectDir!, 'src/client.ts'))
  })

  it('returns null when no client entry exists (opt-in)', () => {
    const client = discoverClientEntry({ cwd: projectDir! })
    expect(client).toBeNull()
  })

  it('--client-entry flag overrides discovery', () => {
    writeFileSync(path.join(projectDir!, 'my-client.ts'), 'x')
    const client = discoverClientEntry({ cwd: projectDir!, clientEntry: 'my-client.ts' })
    expect(client).toBe(path.resolve(projectDir!, 'my-client.ts'))
  })

  it('throws when --client-entry points to a missing file', () => {
    expect(() => discoverClientEntry({ cwd: projectDir!, clientEntry: 'missing.ts' })).toThrow(
      /Client entry file not found/,
    )
  })
})

describe('discover (combined)', () => {
  it('returns both entries when present', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/app.ts'), 'x')
    writeFileSync(path.join(projectDir!, 'src/client.ts'), 'x')

    const result = discover({ cwd: projectDir! })
    expect(result.entry).toBe(path.resolve(projectDir!, 'src/app.ts'))
    expect(result.clientEntry).toBe(path.resolve(projectDir!, 'src/client.ts'))
  })

  it('clientEntry is null when only server entry exists', () => {
    mkdirSync(path.join(projectDir!, 'src'), { recursive: true })
    writeFileSync(path.join(projectDir!, 'src/app.ts'), 'x')

    const result = discover({ cwd: projectDir! })
    expect(result.entry).toBe(path.resolve(projectDir!, 'src/app.ts'))
    expect(result.clientEntry).toBeNull()
  })
})
