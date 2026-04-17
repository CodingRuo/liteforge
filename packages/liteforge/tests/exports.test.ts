import { describe, it, expect } from 'vitest';

describe('liteforge — core + runtime exports', () => {
  it('exports signal, computed, effect from core', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.signal).toBe('function');
    expect(typeof mod.computed).toBe('function');
    expect(typeof mod.effect).toBe('function');
  });

  it('exports batch, onCleanup from core', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.batch).toBe('function');
    expect(typeof mod.onCleanup).toBe('function');
  });

  it('exports defineApp, defineComponent from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.defineApp).toBe('function');
    expect(typeof mod.defineComponent).toBe('function');
  });

  it('exports Show, For, Switch from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.Show).toBe('function');
    expect(typeof mod.For).toBe('function');
    expect(typeof mod.Switch).toBe('function');
  });
});
