/**
 * Minimal argv parsing — no external dependency.
 *
 * Supports:
 *   - First positional token is the command (`dev`/`build`/`start`)
 *   - Long flags: `--port 3000`, `--port=3000`, `--minify`, `--no-minify`
 *   - Short flags are not supported (keep it predictable)
 */

import type { Command, CommandName } from './types.js'

const KNOWN_COMMANDS: Set<string> = new Set(['dev', 'build', 'start'])

export class CliParseError extends Error {
  constructor(message: string, public readonly helpRequested: boolean = false) {
    super(message)
    this.name = 'CliParseError'
  }
}

export function parseArgs(argv: string[]): Command {
  if (argv.length === 0) {
    throw new CliParseError('No command specified. Usage: liteforge <dev|build|start> [flags]', true)
  }

  const [rawCommand, ...rest] = argv
  if (!rawCommand || !KNOWN_COMMANDS.has(rawCommand)) {
    throw new CliParseError(
      `Unknown command: ${rawCommand}. Expected one of: dev, build, start.`,
      true,
    )
  }

  const flags: Record<string, string | boolean | undefined> = {}
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!
    if (!token.startsWith('--')) {
      throw new CliParseError(`Unexpected positional argument: ${token}`)
    }
    const stripped = token.slice(2)
    // --flag=value shape
    const eq = stripped.indexOf('=')
    if (eq !== -1) {
      const key = stripped.slice(0, eq)
      const value = stripped.slice(eq + 1)
      flags[key] = value
      continue
    }
    // --no-flag → explicit false
    if (stripped.startsWith('no-')) {
      flags[stripped.slice(3)] = false
      continue
    }
    // --flag value or --flag (boolean)
    const next = rest[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[stripped] = next
      i++
    } else {
      flags[stripped] = true
    }
  }

  return { name: rawCommand as CommandName, flags }
}

export const HELP_TEXT = [
  'LiteForge CLI',
  '',
  'Usage:',
  '  liteforge dev    [--port <n>] [--host <s>] [--entry <path>] [--client-entry <path>]',
  '  liteforge build  [--out-dir <path>] [--minify|--no-minify] [--entry <path>] [--client-entry <path>]',
  '  liteforge start  [--port <n>] [--host <s>] [--entry <path>] [--client-entry <path>]',
  '',
  'Commands:',
  '  dev     Start the development server with HMR',
  '  build   Produce a production bundle in --out-dir (default: ./dist)',
  '  start   Start the production server (alias for running after build)',
  '',
  'Flags:',
  '  --entry <path>         Server entry (default: src/app.ts or src/app.tsx)',
  '  --client-entry <path>  Browser entry (default: src/client.ts or src/client.tsx)',
  '  --port <n>             Port number (default: 3000)',
  '  --host <s>             Hostname (default: bun.serve default)',
  '  --out-dir <path>       Build output directory (default: ./dist)',
  '  --minify / --no-minify Override minification (default: true)',
].join('\n')
