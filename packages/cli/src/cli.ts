#!/usr/bin/env bun
/**
 * LiteForge CLI entry point.
 *
 *   liteforge dev    [--port <n>] [--host <s>] [--entry <path>] [--client-entry <path>]
 *   liteforge build  [--out-dir <path>] [--minify|--no-minify] [--entry <path>] [--client-entry <path>]
 *   liteforge start  [--port <n>] [--host <s>] [--entry <path>] [--client-entry <path>]
 *
 * Dispatches to terminal methods on the app exported by the discovered entry.
 */

import { parseArgs, CliParseError, HELP_TEXT } from './parse-args.js'
import { discover, EntryNotFoundError } from './entry-discovery.js'
import { loadApp, LoadAppError } from './load-app.js'
import { runDev } from './commands/dev.js'
import { runBuild } from './commands/build.js'
import { runStart } from './commands/start.js'
import type { Command } from './types.js'

async function main(argv: string[]): Promise<number> {
  let command: Command
  try {
    command = parseArgs(argv)
  } catch (err) {
    if (err instanceof CliParseError) {
      console.error(err.message)
      if (err.helpRequested) {
        console.error('')
        console.error(HELP_TEXT)
      }
      return 1
    }
    throw err
  }

  // Entry discovery + app load
  const entryOpt = typeof command.flags['entry'] === 'string' ? command.flags['entry'] : undefined
  const clientEntryOpt = typeof command.flags['client-entry'] === 'string'
    ? command.flags['client-entry']
    : undefined

  let entry: string
  let clientEntry: string | null
  try {
    const discovery = discover({
      ...(entryOpt !== undefined ? { entry: entryOpt } : {}),
      ...(clientEntryOpt !== undefined ? { clientEntry: clientEntryOpt } : {}),
    })
    entry = discovery.entry
    clientEntry = discovery.clientEntry
  } catch (err) {
    console.error(err instanceof EntryNotFoundError ? err.message : String(err))
    return 1
  }

  let app
  try {
    app = await loadApp(entry)
  } catch (err) {
    console.error(err instanceof LoadAppError ? err.message : String(err))
    return 1
  }

  // Shared options
  const port = parsePort(command.flags['port']) ?? 3000
  const hostname = typeof command.flags['host'] === 'string' ? command.flags['host'] : undefined

  // Graceful shutdown
  let activeStop: (() => Promise<void>) | null = null
  const sigHandler = async () => {
    if (activeStop) {
      try { await activeStop() } catch { /* best-effort */ }
    }
    process.exit(0)
  }
  process.on('SIGINT', sigHandler)
  process.on('SIGTERM', sigHandler)

  try {
    if (command.name === 'dev') {
      const handle = await runDev({
        app,
        port,
        ...(hostname !== undefined ? { hostname } : {}),
        clientEntry,
      })
      activeStop = handle.stop
      // Keep process alive — dev server runs until SIGINT
      return await new Promise<number>(() => { /* never resolves */ })
    }

    if (command.name === 'start') {
      const handle = await runStart({
        app,
        port,
        ...(hostname !== undefined ? { hostname } : {}),
        clientEntry,
      })
      activeStop = handle.stop
      return await new Promise<number>(() => { /* never resolves */ })
    }

    if (command.name === 'build') {
      if (clientEntry === null) {
        console.error(
          'Cannot build: no client entry found. Provide --client-entry <path> ' +
            'or create src/client.ts.',
        )
        return 1
      }
      const outDir = typeof command.flags['out-dir'] === 'string'
        ? command.flags['out-dir']
        : './dist'
      const minify = command.flags['minify'] !== false
      const result = await runBuild({ app, outDir, minify, clientEntry })
      return result.success ? 0 : 1
    }

    // Should be unreachable — parseArgs validates the command name.
    console.error(`Unhandled command: ${(command as Command).name}`)
    return 1
  } catch (err) {
    console.error('Error running command:')
    console.error(err instanceof Error ? err.message : String(err))
    return 1
  }
}

function parsePort(value: string | boolean | undefined): number | null {
  if (typeof value !== 'string') return null
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n) || n < 0 || n > 65535) return null
  return n
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
