import type { AppLike } from '../types.js'

export interface StartCommandInput {
  app: AppLike
  port: number
  hostname?: string
  clientEntry: string | null
}

export async function runStart(input: StartCommandInput): Promise<{ stop: () => Promise<void>; port: number | null }> {
  const opts: { port: number; hostname?: string; clientEntry?: string } = {
    port: input.port,
  }
  if (input.hostname !== undefined) opts.hostname = input.hostname
  if (input.clientEntry !== null) opts.clientEntry = input.clientEntry

  const handle = await input.app.listen(opts)
  const host = input.hostname ?? 'localhost'
  console.log(`Production server at http://${host}:${handle.port ?? input.port}`)
  return handle
}
