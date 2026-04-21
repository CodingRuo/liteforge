/**
 * Server-side lifecycle implementation for defineApp's terminal methods.
 *
 * Split out from `define-app.ts` so Bun's tree-shaker can eliminate all of
 * this code from the client bundle. The user's browser entry only calls
 * `app.mount()`; the method implementations on the builder `await import`
 * this module, which means Bun never pulls it into bundles that don't
 * reach `app.listen/.dev/.build`.
 *
 * Contents — all server-only:
 *   - startServer (listen + dev)
 *   - runBuild (build)
 *   - bundleClient (shared helper)
 *   - HMR: injectHmrSnippet, startDevHmr
 *   - Static/RPC: registerStaticAssets, registerRpcRoutes
 *   - Document helpers: withClientScript, defaultDocumentWithClientScript
 *
 * Imports `oakbun`, `@liteforge/bun-plugin`, and Bun globals — which is
 * exactly why this module is lazy-loaded.
 */

import type { Plugin } from 'oakbun'
import type {
  AnyServerFn,
  AnyServerModule,
  BaseCtx,
  InferServerApi,
  LiteForgeServerPlugin,
  ModulesMap,
} from './types.js'
import type { ContextMap, ResolveContext } from './context.js'
import { resolveRequestContext } from './context.js'
import { corsHeaders, DEFAULT_RPC_PREFIX, handleRpcRequest, RPC_HEADER } from './plugin.js'
import { renderDocument } from './define-document.js'
import type { DocumentDescriptor } from './define-document.js'
import type { BuilderState } from './_internal.js'
import type { AppInstance, BuildOptions, BuildResult } from './define-app.js'

// ─── bundleClient — shared bundling helper ────────────────────────────────────

interface BundleClientOptions {
  clientEntry: string
  target: 'browser' | 'bun' | 'node'
  minify: boolean
  outDir?: string
  contextLabel: string
}

interface BundledClient {
  mainJs: string
  assets: Map<string, string>
  outputPaths: string[]
}

async function bundleClient(options: BundleClientOptions): Promise<BundledClient> {
  const { liteforgeBunPlugin } = await import('@liteforge/bun-plugin')

  const bunGlobal = (globalThis as unknown as {
    Bun?: {
      build: (opts: unknown) => Promise<{
        success: boolean
        outputs: Array<{ path: string; text(): Promise<string> }>
        logs: Array<{ level: string; message: string }>
      }>
    }
  }).Bun
  if (!bunGlobal) {
    throw new Error(`[@liteforge/server] ${options.contextLabel} requires Bun runtime`)
  }

  let buildResult
  try {
    const buildOpts: Record<string, unknown> = {
      entrypoints: [options.clientEntry],
      target: options.target,
      minify: options.minify,
      plugins: [liteforgeBunPlugin()],
      external: options.target === 'browser' ? ['oakbun'] : [],
      // Enable code-splitting so `await import(...)` calls become separate
      // chunks instead of being inlined. Essential for eliminating server-only
      // lifecycle code from the client bundle when the user's entry only
      // ever calls `.mount()`.
      splitting: true,
    }
    if (options.outDir !== undefined) buildOpts['outdir'] = options.outDir
    buildResult = await bunGlobal.build(buildOpts)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(`[@liteforge/server] ${options.contextLabel} failed: ${cause}`)
  }

  if (!buildResult.success) {
    const messages = buildResult.logs
      .filter((l) => l.level === 'error')
      .map((l) => l.message)
      .join('\n  ')
    throw new Error(
      `[@liteforge/server] ${options.contextLabel} failed:\n  ${messages || '(no error logs)'}`,
    )
  }

  const assets = new Map<string, string>()
  const outputPaths: string[] = []
  let mainJs = ''

  for (const output of buildResult.outputs) {
    const path = await import('node:path')
    const basename = path.basename(output.path)
    if (options.outDir !== undefined) {
      outputPaths.push(output.path)
    } else {
      const text = await output.text()
      assets.set(basename, text)
      if (basename.endsWith('.js') && !mainJs) mainJs = text
    }
  }

  return { mainJs, assets, outputPaths }
}

// ─── runBuild — internal implementation for .build() ──────────────────────────

export async function runBuild(
  state: BuilderState,
  options: BuildOptions,
): Promise<BuildResult> {
  const outDir = options.outDir ?? './dist'
  const clientOutDir = `${outDir}/client`
  const target = options.target ?? 'browser'
  const minify = options.minify ?? true

  const path = await import('node:path')
  const fs = await import('node:fs/promises')

  const bundled = await bundleClient({
    clientEntry: options.clientEntry,
    target,
    minify,
    outDir: clientOutDir,
    contextLabel: '.build()',
  })

  // HTML shell — `.build()` always auto-references `/client.js` (relative to outDir).
  const documentDescriptor = state.options.document as DocumentDescriptor | undefined
  const mountId = resolveMountId(state.options.target)
  const html = documentDescriptor
    ? renderDocument(withClientScript(documentDescriptor), { mountId })
    : renderDocument(defaultDocumentWithClientScript(), { mountId })

  await fs.mkdir(clientOutDir, { recursive: true })
  const htmlPath = path.join(clientOutDir, 'index.html')
  await fs.writeFile(htmlPath, html, 'utf-8')

  // Copy static assets from publicDir (if configured + exists).
  // Must run AFTER Bun.build so framework-emitted files win any naming
  // conflicts with user assets — a file in public/ that collides with a
  // bundle output (e.g. public/client.js) is skipped with a warning.
  const publicAssetPaths: string[] = []
  if (options.publicDir !== false) {
    const publicDir = options.publicDir ?? './public'
    const copied = await copyPublicAssets(publicDir, clientOutDir)
    publicAssetPaths.push(...copied)
  }

  const absOutDir = path.resolve(outDir)
  const files: string[] = []
  for (const p of bundled.outputPaths) {
    files.push(path.relative(absOutDir, p))
  }
  files.push(path.relative(absOutDir, htmlPath))
  for (const p of publicAssetPaths) {
    files.push(path.relative(absOutDir, p))
  }

  return {
    outDir: absOutDir,
    files,
    success: true,
  }
}

/**
 * Recursively copy every file under `publicDir` into `destDir`.
 * - Skip files whose destination path already exists (framework outputs win).
 * - Silent no-op if publicDir doesn't exist.
 * - Returns the list of absolute paths that were actually written.
 *
 * Binary-safe via `fs.cp` (which uses streaming copies under the hood).
 */
async function copyPublicAssets(publicDir: string, destDir: string): Promise<string[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const absPublic = path.resolve(publicDir)
  try {
    const stat = await fs.stat(absPublic)
    if (!stat.isDirectory()) return []
  } catch {
    return [] // publicDir doesn't exist — legitimate
  }

  const written: string[] = []
  const conflicts: string[] = []

  async function walk(srcDir: string, relDir: string): Promise<void> {
    const entries = await fs.readdir(srcDir, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name)
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
      const destPath = path.join(destDir, relPath)

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true })
        await walk(srcPath, relPath)
        continue
      }
      if (!entry.isFile()) continue

      // Framework output wins — skip with warning if destination exists.
      try {
        await fs.access(destPath)
        conflicts.push(relPath)
        continue
      } catch {
        // Destination doesn't exist, proceed with copy
      }

      await fs.mkdir(path.dirname(destPath), { recursive: true })
      // fs.cp is streaming + binary-safe; fallback to copyFile for older Bun.
      await fs.copyFile(srcPath, destPath)
      written.push(destPath)
    }
  }

  await walk(absPublic, '')

  if (conflicts.length > 0) {
    console.warn(
      `[@liteforge/server] ${conflicts.length} file(s) in ${publicDir} conflict with build output — framework output wins:\n  ` +
        conflicts.join('\n  '),
    )
  }

  return written
}

// ─── Document client-script injection ─────────────────────────────────────────

function withClientScript(doc: DocumentDescriptor): DocumentDescriptor {
  const existing = doc.config.head?.scripts ?? []
  const alreadyHasClientScript = existing.some(
    (s) => s.src === '/client.js' && s.type === 'module',
  )
  if (alreadyHasClientScript) return doc

  return {
    _tag: 'LiteForgeDocument',
    config: {
      ...doc.config,
      head: {
        ...doc.config.head,
        scripts: [...existing, { src: '/client.js', type: 'module' }],
      },
    },
  }
}

function defaultDocumentWithClientScript(): DocumentDescriptor {
  return {
    _tag: 'LiteForgeDocument',
    config: {
      head: {
        scripts: [{ src: '/client.js', type: 'module' }],
      },
    },
  }
}

// ─── startServer — .listen() + .dev() ─────────────────────────────────────────

export interface StartServerOptions {
  port: number
  hostname?: string
  devMode?: boolean
  watchDir?: string
  clientEntry?: string
  publicDir?: string
}

const DEFAULT_PUBLIC_DIR = './public'
const RESERVED_ROUTES = new Set(['/', '/client.js', '/__liteforge_hmr__'])
const RESERVED_PREFIX = '/api/'
const HMR_WS_PATH = '/__liteforge_hmr__'

export async function startServer<
  TContext extends ContextMap,
  TModules extends ModulesMap,
>(
  state: BuilderState,
  options: StartServerOptions,
): Promise<AppInstance<TContext, TModules>> {
  const { createApp: createOakBunApp } = await import('oakbun')
  const oakbun = createOakBunApp()
  for (const p of state.oakbunPlugins) {
    ;(oakbun as unknown as { plugin: (p: unknown) => void }).plugin(p)
  }

  if (state.options.context) {
    const contextDeclaration = state.options.context
    const extensionPlugin: Plugin<BaseCtx, Record<string, unknown>> = {
      name: 'liteforge-context',
      request: async (ctx) => {
        const resolved = await resolveRequestContext(contextDeclaration, ctx.req)
        return { ...ctx, ...resolved } as BaseCtx & Record<string, unknown>
      },
    }
    ;(oakbun as unknown as { plugin: (p: unknown) => void }).plugin(extensionPlugin)
  }

  await registerStaticAssets(
    oakbun,
    options.publicDir ?? DEFAULT_PUBLIC_DIR,
    options.devMode ?? false,
  )

  if (state.modulesMap) {
    registerRpcRoutes(oakbun, state.modulesMap)
  }

  const clientBundle: { current: BundledClient | null } = { current: null }
  if (options.clientEntry) {
    clientBundle.current = await bundleClient({
      clientEntry: options.clientEntry,
      target: 'browser',
      minify: !options.devMode,
      contextLabel: options.devMode ? '.dev()' : '.listen()',
    })
  }

  let devControl: { stop: () => Promise<void>; port: number } | null = null
  if (options.devMode) {
    devControl = await startDevHmr({
      watchDir: options.watchDir ?? 'src',
      ...(options.clientEntry !== undefined
        ? {
            onChange: async () => {
              try {
                clientBundle.current = await bundleClient({
                  clientEntry: options.clientEntry!,
                  target: 'browser',
                  minify: false,
                  contextLabel: '.dev() rebuild',
                })
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`[@liteforge/server] rebuild failed:\n  ${msg}`)
              }
            },
          }
        : {}),
    })
  }

  const documentDescriptor = state.options.document as DocumentDescriptor | undefined
  const mountId = resolveMountId(state.options.target)
  const capturedDevControl = devControl
  const effectiveDocument: DocumentDescriptor | undefined = options.clientEntry
    ? documentDescriptor
      ? withClientScript(documentDescriptor)
      : defaultDocumentWithClientScript()
    : documentDescriptor

  ;(oakbun as unknown as {
    get: (path: string, handler: (ctx: { req: Request }) => Response | Promise<Response>) => void
  }).get('/', (ctx: { req: Request }) => {
    let html = effectiveDocument
      ? renderDocument(effectiveDocument, { mountId })
      : renderDocument({ _tag: 'LiteForgeDocument', config: {} }, { mountId })

    if (options.devMode && capturedDevControl) {
      const host = new URL(ctx.req.url).hostname
      const hmrWsUrl = `ws://${host}:${capturedDevControl.port}${HMR_WS_PATH}`
      html = injectHmrSnippet(html, hmrWsUrl)
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  })

  if (options.clientEntry) {
    const bundleRouter = oakbun as unknown as {
      get: (path: string, handler: (ctx: { req: Request }) => Response) => void
    }
    bundleRouter.get('/client.js', () => {
      const bundle = clientBundle.current
      if (!bundle) return new Response('Client bundle not ready', { status: 503 })
      return new Response(bundle.mainJs, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      })
    })

    // Code-splitting (`splitting: true` in bundleClient) emits additional
    // chunk-*.js files for dynamic imports. In the in-memory bundle they
    // live under their basename in `bundle.assets`. Register each as its
    // own GET route so the browser can fetch them on demand.
    const currentBundle = clientBundle.current
    if (currentBundle) {
      for (const [basename, content] of currentBundle.assets) {
        if (basename === 'client.js') continue // already served above
        const frozenContent = content
        bundleRouter.get(`/${basename}`, () => {
          return new Response(frozenContent, {
            status: 200,
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'no-cache',
            },
          })
        })
      }
    }
  }

  const bunServer = (oakbun as unknown as {
    listen: (port: number) => { port: number; stop: () => Promise<void> | void }
  }).listen(options.port)

  return {
    unmount: () => { /* no-op — server-only mode */ },
    use: <T>(_key: string) => undefined as unknown as T,
    stop: async () => {
      await bunServer.stop()
      if (devControl) await devControl.stop()
    },
    port: bunServer.port,
    $server: undefined as unknown as InferServerApi<LiteForgeServerPlugin<TModules>>,
    $ctx: undefined as unknown as BaseCtx & ResolveContext<TContext>,
  }
}

// ─── HMR client snippet ───────────────────────────────────────────────────────

function injectHmrSnippet(html: string, wsUrl: string): string {
  const snippet = `<script type="module">
(() => {
  const url = ${JSON.stringify(wsUrl)};
  let retry = 0;
  function connect() {
    const ws = new WebSocket(url);
    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'reload') window.location.reload();
      } catch {}
    });
    ws.addEventListener('close', () => {
      retry = Math.min(retry + 1, 5);
      setTimeout(connect, 200 * retry);
    });
  }
  connect();
})();
</script>`
  return html.replace('</body>', `${snippet}\n  </body>`)
}

// ─── Dev HMR: WebSocket broadcast + file watcher ─────────────────────────────

interface DevHmrOptions {
  watchDir: string
  onChange?: () => Promise<void> | void
}

async function startDevHmr(
  options: DevHmrOptions,
): Promise<{ stop: () => Promise<void>; port: number }> {
  const { watch } = await import('node:fs')
  const path = await import('node:path')

  const clients = new Set<unknown>()

  const bunGlobal = (globalThis as unknown as {
    Bun?: {
      serve: (opts: unknown) => { port: number; stop: () => Promise<void> | void }
    }
  }).Bun
  if (!bunGlobal) {
    throw new Error('[@liteforge/server] .dev() requires Bun runtime')
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const broadcastReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      if (options.onChange) {
        try {
          await options.onChange()
        } catch {
          return
        }
      }
      const msg = JSON.stringify({ type: 'reload' })
      for (const ws of clients) {
        try {
          ;(ws as { send: (data: string) => void }).send(msg)
        } catch { /* ignore broken clients */ }
      }
    }, 100)
  }

  const wsServer = bunGlobal.serve({
    port: 0,
    fetch(req: Request, server: { upgrade: (r: Request) => boolean }) {
      const url = new URL(req.url)
      if (url.pathname === HMR_WS_PATH && server.upgrade(req)) {
        return
      }
      return new Response('HMR channel', { status: 404 })
    },
    websocket: {
      open(ws: unknown) { clients.add(ws) },
      close(ws: unknown) { clients.delete(ws) },
      message() { /* client → server not used */ },
    },
  })

  const resolvedWatchDir = path.resolve(options.watchDir)
  const watcher = watch(
    resolvedWatchDir,
    { recursive: true },
    (event, filename) => {
      if (!filename) return
      if (event === 'change' || event === 'rename') broadcastReload()
    },
  )

  return {
    port: wsServer.port,
    stop: async () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher.close()
      await (wsServer as unknown as { stop: (closeActive?: boolean) => Promise<void> | void })
        .stop(true)
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveMountId(target: string | HTMLElement): string {
  if (typeof target !== 'string') return 'app'
  return target.startsWith('#') ? target.slice(1) : target
}

async function registerStaticAssets(
  oakbun: unknown,
  publicDir: string,
  devMode: boolean,
): Promise<void> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const absPublic = path.resolve(publicDir)
  let exists = false
  try {
    const stat = await fs.stat(absPublic)
    exists = stat.isDirectory()
  } catch {
    exists = false
  }
  if (!exists) return

  const register = oakbun as {
    get: (p: string, handler: () => Response | Promise<Response>) => void
  }
  const cacheControl = devMode ? 'no-cache' : 'public, max-age=3600'
  const conflicts: string[] = []

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      const urlPath = `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        await walk(abs, urlPath)
        continue
      }
      if (!entry.isFile()) continue

      if (RESERVED_ROUTES.has(urlPath) || urlPath.startsWith(RESERVED_PREFIX)) {
        conflicts.push(urlPath)
        continue
      }

      const filePath = abs
      register.get(urlPath, async () => {
        const Bun = (globalThis as {
          Bun?: { file: (p: string) => { type: string; exists: () => Promise<boolean> } }
        }).Bun
        if (!Bun) {
          return new Response('Bun runtime required', { status: 500 })
        }
        const file = Bun.file(filePath)
        if (!(await file.exists())) {
          return new Response('Not Found', { status: 404 })
        }
        return new Response(file as unknown as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'Cache-Control': cacheControl,
          },
        })
      })
    }
  }

  await walk(absPublic, '')

  if (conflicts.length > 0) {
    console.warn(
      `[@liteforge/server] ${conflicts.length} file(s) in ${publicDir} conflict with framework routes — framework routes take precedence:\n  ` +
        conflicts.map((c) => `${publicDir}${c}`).join('\n  '),
    )
  }
}

function registerRpcRoutes(oakbun: unknown, modulesMap: ModulesMap): void {
  const register = oakbun as {
    post: (path: string, handler: (ctx: { req: Request; [k: string]: unknown }) => Promise<Response>) => void
    options: (path: string, handler: (ctx: { req: Request }) => Promise<Response>) => void
  }

  for (const [moduleKey, mod] of Object.entries(modulesMap)) {
    const module = mod as AnyServerModule
    for (const [fnName, fn] of Object.entries(module.fns)) {
      const routePath = `${DEFAULT_RPC_PREFIX}/${moduleKey}/${fnName}`
      const serverFn = fn as AnyServerFn

      register.options(routePath, async (ctx) => {
        const headers = corsHeaders(ctx.req, [])
        return new Response(null, { status: 204, headers })
      })

      register.post(routePath, async (ctx) => {
        const req = ctx.req
        const headers = corsHeaders(req, [])
        if (!req.headers.get(RPC_HEADER)) {
          return new Response(JSON.stringify({ error: `Missing ${RPC_HEADER} header` }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...headers },
          })
        }
        return handleRpcRequest(req, serverFn, ctx, headers)
      })
    }
  }
}

