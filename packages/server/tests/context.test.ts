import { describe, it, expect, vi } from 'vitest'
import { resolveRequestContext } from '../src/context.js'
import { createContextPlugin } from '../src/define-app.js'

describe('resolveRequestContext', () => {
  it('passes static values through unchanged', async () => {
    const req = new Request('http://test/')
    const resolved = await resolveRequestContext(
      { version: '1.0', maxUsers: 100 },
      req,
    )
    expect(resolved).toEqual({ version: '1.0', maxUsers: 100 })
  })

  it('invokes resolver functions with the request', async () => {
    const req = new Request('http://test/', { headers: { 'x-tenant': 'acme' } })
    const resolved = await resolveRequestContext(
      { tenantId: (r: Request) => 'tenant-' + r.headers.get('x-tenant') },
      req,
    )
    expect(resolved).toEqual({ tenantId: 'tenant-acme' })
  })

  it('awaits async resolvers', async () => {
    const req = new Request('http://test/')
    const resolved = await resolveRequestContext(
      {
        userId: async () => {
          await new Promise((r) => setTimeout(r, 1))
          return 'user-42'
        },
      },
      req,
    )
    expect(resolved).toEqual({ userId: 'user-42' })
  })

  it('mixes static + resolvers in one declaration', async () => {
    const req = new Request('http://test/', { headers: { 'x-t': 'a' } })
    const resolved = await resolveRequestContext(
      {
        version: '1.0',
        tenantId: (r: Request) => r.headers.get('x-t') ?? 'none',
      },
      req,
    )
    expect(resolved).toEqual({ version: '1.0', tenantId: 'a' })
  })

  it('calls resolvers per request, not once at registration', async () => {
    const tenantResolver = vi.fn((r: Request) => 'tenant-' + r.headers.get('x-tenant'))

    const req1 = new Request('http://test/', { headers: { 'x-tenant': 'acme' } })
    const req2 = new Request('http://test/', { headers: { 'x-tenant': 'globex' } })

    const r1 = await resolveRequestContext({ tenantId: tenantResolver }, req1)
    const r2 = await resolveRequestContext({ tenantId: tenantResolver }, req2)

    expect(r1.tenantId).toBe('tenant-acme')
    expect(r2.tenantId).toBe('tenant-globex')
    expect(tenantResolver).toHaveBeenCalledTimes(2)
    expect(tenantResolver).toHaveBeenNthCalledWith(1, req1)
    expect(tenantResolver).toHaveBeenNthCalledWith(2, req2)
  })

  it('handles empty declaration', async () => {
    const req = new Request('http://test/')
    const resolved = await resolveRequestContext({}, req)
    expect(resolved).toEqual({})
  })
})

describe('createContextPlugin', () => {
  it('returns a plugin object with name "liteforge-context"', () => {
    const plugin = createContextPlugin({ version: '1.0' })
    expect(plugin.name).toBe('liteforge-context')
    expect(typeof plugin.request).toBe('function')
  })

  it('plugin.request() resolves the declaration against the request ctx', async () => {
    const plugin = createContextPlugin({
      version: '1.0',
      tenantId: (r: Request) => 'tenant-' + r.headers.get('x-tenant'),
    })
    const req = new Request('http://test/', { headers: { 'x-tenant': 'acme' } })
    const resolved = await plugin.request({ req })
    expect(resolved).toEqual({ version: '1.0', tenantId: 'tenant-acme' })
  })

  it('plugin.request() evaluates resolvers fresh on every call', async () => {
    const counter = vi.fn(() => 'v-' + Math.random())
    const plugin = createContextPlugin({ val: counter })
    await plugin.request({ req: new Request('http://test/') })
    await plugin.request({ req: new Request('http://test/') })
    await plugin.request({ req: new Request('http://test/') })
    expect(counter).toHaveBeenCalledTimes(3)
  })
})
