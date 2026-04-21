/**
 * Dynamic import of the user's server entry. Validates the default export
 * is a LiteForge app (has `.dev`, `.listen`, `.build`).
 */

import type { AppLike } from './types.js'

export class LoadAppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LoadAppError'
  }
}

export async function loadApp(entryPath: string): Promise<AppLike> {
  let mod: unknown
  try {
    mod = await import(entryPath)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new LoadAppError(`Failed to import entry file ${entryPath}:\n  ${cause}`)
  }

  if (typeof mod !== 'object' || mod === null) {
    throw new LoadAppError(`Entry file ${entryPath} did not export a module.`)
  }

  const candidate = (mod as { default?: unknown; app?: unknown }).default
    ?? (mod as { app?: unknown }).app

  if (!isAppLike(candidate)) {
    throw new LoadAppError(
      [
        `Entry file does not export a LiteForge app as default.`,
        `  Expected: export default defineApp({...}).serverModules({...})`,
        `  Got: ${describe(candidate)}`,
      ].join('\n'),
    )
  }

  return candidate
}

function isAppLike(value: unknown): value is AppLike {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['dev'] === 'function' &&
    typeof obj['listen'] === 'function' &&
    typeof obj['build'] === 'function'
  )
}

function describe(value: unknown): string {
  if (value === undefined) return 'undefined (no default export)'
  if (value === null) return 'null'
  if (typeof value === 'function') return 'function'
  if (typeof value === 'object') return `object with keys [${Object.keys(value as object).join(', ')}]`
  return typeof value
}
