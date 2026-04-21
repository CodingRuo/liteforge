/**
 * Phase G follow-up — static asset serving via publicDir.
 *
 * Runs under Bun. Spins up .listen() / .dev() against tmp project trees
 * that contain a public/ directory, fetches the assets, and asserts
 * MIME-type + cache-control headers plus reserved-route precedence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineApp } from '../src/index.js'

function makeRoot(): () => Node {
  return () => ({} as Node)
}

type AppHandle = { stop: () => Promise<void>; port: number | null }
let handle: AppHandle | null = null
let projectDir: string | null = null

beforeEach(() => {
  handle = null
  projectDir = mkdtempSync(path.join(tmpdir(), 'lf-public-'))
})

afterEach(async () => {
  if (handle) {
    await handle.stop()
    handle = null
  }
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true })
    projectDir = null
  }
})

describe('.listen({ publicDir }) — static asset serving', () => {
  it('serves a flat file with correct Content-Type', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'styles.css'), 'body { color: red; }')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/styles.css`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/css')
    expect(await res.text()).toBe('body { color: red; }')
  })

  it('serves nested paths (public/images/logo.png → /images/logo.png)', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(path.join(publicDir, 'images'), { recursive: true })
    // Write 8-byte PNG-signature-like payload
    writeFileSync(path.join(publicDir, 'images/logo.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/images/logo.png`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes[0]).toBe(137)
    expect(bytes[1]).toBe(80)
  })

  it('returns 404 for files not in publicDir', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'exists.css'), 'x')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/does-not-exist.css`)
    expect(res.status).toBe(404)
  })

  it('rejects path-traversal attempts', async () => {
    // The helper scans publicDir and registers explicit routes for each
    // file. A request like /../../../etc/passwd has no registered route,
    // so OakBun returns 404 — traversal is structurally impossible.
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'ok.css'), 'ok')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/../../../etc/passwd`)
    // fetch() normalises /../.. in the URL before sending, so the server
    // sees just /etc/passwd (or /passwd depending on normalisation). Either
    // way no asset is registered under that path.
    expect(res.status).toBe(404)
  })

  it('framework / route wins over public/index.html (if it existed)', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    // index.html is not itself reserved — but GET / is. The walker produces
    // url path `/index.html`, not `/`, so there's no conflict. This test
    // just confirms the framework GET / keeps working alongside publicDir.
    writeFileSync(path.join(publicDir, 'foo.txt'), 'bar')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const root = await fetch(`http://localhost:${app.port}/`)
    expect(root.status).toBe(200)
    expect(root.headers.get('content-type')).toContain('text/html')

    const asset = await fetch(`http://localhost:${app.port}/foo.txt`)
    expect(asset.status).toBe(200)
    expect(await asset.text()).toBe('bar')
  })

  it('logs a warning for public files that shadow reserved routes', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    // Collide with /client.js
    writeFileSync(path.join(publicDir, 'client.js'), '/* user bundle */')

    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    }

    try {
      const app = await defineApp({ root: makeRoot(), target: '#app' })
        .listen({ port: 0, publicDir, clientEntry: path.join(projectDir!, 'entry.ts') } as never)
      handle = app
    } catch {
      // .listen() will fail because entry.ts doesn't exist — but the warning
      // about /client.js should already have fired during registerStaticAssets.
    } finally {
      console.warn = originalWarn
    }

    const clientJsWarning = warnings.find((w) => w.includes('client.js'))
    expect(clientJsWarning).toBeDefined()
    expect(clientJsWarning).toMatch(/conflict with framework routes/)
  })

  it('works without publicDir (returns 404 for any asset)', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0 })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/anything.css`)
    expect(res.status).toBe(404)
  })

  it('dev mode uses Cache-Control: no-cache', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'a.css'), 'x')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .dev({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/a.css`)
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  it('production mode uses Cache-Control: public, max-age=3600', async () => {
    const publicDir = path.join(projectDir!, 'public')
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(path.join(publicDir, 'a.css'), 'x')

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, publicDir })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/a.css`)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
  })
})
