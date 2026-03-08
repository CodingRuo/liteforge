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

  it('exports createApp, createComponent from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.createApp).toBe('function');
    expect(typeof mod.createComponent).toBe('function');
  });

  it('exports Show, For, Switch from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.Show).toBe('function');
    expect(typeof mod.For).toBe('function');
    expect(typeof mod.Switch).toBe('function');
  });
});
