/**
 * Minimal structural shape of a LiteForge fullstack app as returned by
 * `defineApp(...)`. The CLI only needs the terminal methods — we don't import
 * `@liteforge/server` directly to keep the CLI dependency-free.
 */
export interface AppLike {
  dev(options: {
    port: number
    hostname?: string
    clientEntry?: string
  }): Promise<{ port: number | null; stop: () => Promise<void> }>

  listen(options: {
    port: number
    hostname?: string
    clientEntry?: string
  }): Promise<{ port: number | null; stop: () => Promise<void> }>

  build(options: {
    clientEntry: string
    outDir?: string
    minify?: boolean
  }): Promise<{ outDir: string; files: string[]; success: boolean }>
}

export interface Command {
  name: 'dev' | 'build' | 'start'
  flags: Record<string, string | boolean | undefined>
}

export type CommandName = Command['name']
