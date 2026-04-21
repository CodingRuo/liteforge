import type { AppLike } from '../types.js'

export interface DevCommandInput {
  app: AppLike
  port: number
  hostname?: string
  clientEntry: string | null
}

export async function runDev(input: DevCommandInput): Promise<{ stop: () => Promise<void>; port: number | null }> {
  const opts: { port: number; hostname?: string; clientEntry?: string } = {
    port: input.port,
  }
  if (input.hostname !== undefined) opts.hostname = input.hostname
  if (input.clientEntry !== null) opts.clientEntry = input.clientEntry

  const handle = await input.app.dev(opts)
  const host = input.hostname ?? 'localhost'
  console.log(`Dev server at http://${host}:${handle.port ?? input.port}`)
  console.log('  HMR active — save a file under ./src to reload the browser.')
  if (input.clientEntry === null) {
    console.warn(
      '  Warning: no client entry discovered (looked for src/client.ts). ' +
        'Browser-mounting is disabled. Add src/client.ts with `await app.mount()` ' +
        'or pass --client-entry <path>.',
    )
  }
  return handle
}
