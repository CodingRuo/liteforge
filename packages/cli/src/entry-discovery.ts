/**
 * Entry-discovery for the LiteForge CLI.
 *
 * Server entry: the file that exports `defineApp(...)` as its default export.
 * Client entry: the file that calls `app.mount()` in the browser.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

export interface DiscoveryOptions {
  /** Working directory to search in (defaults to `process.cwd()`). */
  cwd?: string
  /** Explicit path override for the server entry. */
  entry?: string
  /** Explicit path override for the client entry. */
  clientEntry?: string
}

export interface DiscoveryResult {
  entry: string
  clientEntry: string | null
}

const SERVER_CANDIDATES = ['src/app.ts', 'src/app.tsx', 'app.ts', 'app.tsx']
const CLIENT_CANDIDATES = ['src/client.ts', 'src/client.tsx', 'client.ts', 'client.tsx']

export class EntryNotFoundError extends Error {
  constructor(cwd: string) {
    super(
      [
        'No LiteForge app entry found.',
        `  Looked for: ${SERVER_CANDIDATES.join(', ')}`,
        `  (relative to ${cwd})`,
        '  Provide --entry <path> or create src/app.ts with `export default defineApp(...)`.',
      ].join('\n'),
    )
    this.name = 'EntryNotFoundError'
  }
}

export function discoverServerEntry(options: DiscoveryOptions = {}): string {
  const cwd = options.cwd ?? process.cwd()
  if (options.entry) {
    const absolute = path.isAbsolute(options.entry)
      ? options.entry
      : path.resolve(cwd, options.entry)
    if (!existsSync(absolute)) {
      throw new Error(`Entry file not found: ${options.entry} (resolved: ${absolute})`)
    }
    return absolute
  }

  for (const candidate of SERVER_CANDIDATES) {
    const absolute = path.resolve(cwd, candidate)
    if (existsSync(absolute)) return absolute
  }
  throw new EntryNotFoundError(cwd)
}

export function discoverClientEntry(options: DiscoveryOptions = {}): string | null {
  const cwd = options.cwd ?? process.cwd()
  if (options.clientEntry) {
    const absolute = path.isAbsolute(options.clientEntry)
      ? options.clientEntry
      : path.resolve(cwd, options.clientEntry)
    if (!existsSync(absolute)) {
      throw new Error(
        `Client entry file not found: ${options.clientEntry} (resolved: ${absolute})`,
      )
    }
    return absolute
  }

  for (const candidate of CLIENT_CANDIDATES) {
    const absolute = path.resolve(cwd, candidate)
    if (existsSync(absolute)) return absolute
  }
  return null
}

export function discover(options: DiscoveryOptions = {}): DiscoveryResult {
  return {
    entry: discoverServerEntry(options),
    clientEntry: discoverClientEntry(options),
  }
}
