import { describe, it, expect } from 'vitest'
import { liteforgeBunPlugin } from '../src/index.js'

describe('liteforgeBunPlugin — shape', () => {
  it('returns a plugin with name "liteforge"', () => {
    expect(liteforgeBunPlugin().name).toBe('liteforge')
  })

  it('has a setup function', () => {
    expect(typeof liteforgeBunPlugin().setup).toBe('function')
  })

  it('accepts empty options without throwing', () => {
    expect(() => liteforgeBunPlugin()).not.toThrow()
  })

  it('accepts partial TransformOptions without throwing', () => {
    expect(() => liteforgeBunPlugin({ autoWrapProps: false })).not.toThrow()
  })
})

describe('liteforgeBunPlugin — onLoad registration', () => {
  it('registers exactly one onLoad handler', () => {
    const filters: RegExp[] = []
    liteforgeBunPlugin().setup({
      onLoad(filter, _handler) { filters.push(filter.filter) },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    expect(filters).toHaveLength(1)
  })

  it('filter matches .tsx files', () => {
    let filter!: RegExp
    liteforgeBunPlugin().setup({
      onLoad(f, _h) { filter = f.filter },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    expect(filter.test('Component.tsx')).toBe(true)
    expect(filter.test('/path/to/App.tsx')).toBe(true)
  })

  it('filter matches .jsx files', () => {
    let filter!: RegExp
    liteforgeBunPlugin().setup({
      onLoad(f, _h) { filter = f.filter },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    expect(filter.test('Component.jsx')).toBe(true)
  })

  it('filter does not match .ts or .js files', () => {
    let filter!: RegExp
    liteforgeBunPlugin().setup({
      onLoad(f, _h) { filter = f.filter },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    expect(filter.test('utils.ts')).toBe(false)
    expect(filter.test('index.js')).toBe(false)
  })
})

describe('liteforgeBunPlugin — loader logic', () => {
  async function getLoaderForPath(filePath: string, fileContent: string): Promise<string> {
    let capturedHandler!: (args: { path: string }) => Promise<{ contents: string; loader: string }>
    liteforgeBunPlugin().setup({
      onLoad(_f, handler) {
        capturedHandler = handler as typeof capturedHandler
      },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    // Mock Bun.file at the global level for this call
    const originalBun = (globalThis as Record<string, unknown>)['Bun']
    ;(globalThis as Record<string, unknown>)['Bun'] = {
      file: (_path: string) => ({ text: async () => fileContent }),
    }
    try {
      const result = await capturedHandler({ path: filePath })
      return result.loader
    } finally {
      ;(globalThis as Record<string, unknown>)['Bun'] = originalBun
    }
  }

  it('returns loader "tsx" for .tsx files', async () => {
    expect(await getLoaderForPath('/src/App.tsx', '<div />')).toBe('tsx')
  })

  it('returns loader "jsx" for .jsx files', async () => {
    expect(await getLoaderForPath('/src/App.jsx', '<div />')).toBe('jsx')
  })
})

describe('liteforgeBunPlugin — JSX transform (mocked file read)', () => {
  it('transforms JSX to h() calls', async () => {
    let capturedHandler!: (args: { path: string }) => Promise<{ contents: string; loader: string }>
    liteforgeBunPlugin().setup({
      onLoad(_f, handler) {
        capturedHandler = handler as typeof capturedHandler
      },
    } as Parameters<ReturnType<typeof liteforgeBunPlugin>['setup']>[0])

    const jsxSource = 'export function A() { return <div class="x">Hello</div> }'
    ;(globalThis as Record<string, unknown>)['Bun'] = {
      file: (_path: string) => ({ text: async () => jsxSource }),
    }

    const result = await capturedHandler({ path: '/src/A.tsx' })

    expect(result.contents).toMatch(/h\(["']div["']/)
    expect(result.contents).not.toMatch(/<div/)
  })
})
