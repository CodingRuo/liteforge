/**
 * Tests for HMR support
 */

import { describe, it, expect } from 'vitest';
import {
  generateHmrCode,
  appendHmrCode,
  hasHmrAcceptance,
  injectHmrIds,
} from '../src/hmr.js';

// =============================================================================
// generateHmrCode Tests
// =============================================================================

describe('generateHmrCode', () => {
  it('generates HMR acceptance code with callback', () => {
    const code = generateHmrCode('/path/to/module.tsx');
    expect(code).toContain('import.meta.hot');
    expect(code).toContain('import.meta.hot.accept((newModule)');
    expect(code).toContain('window.__LITEFORGE_HMR__');
  });

  it('wraps in if statement for safety', () => {
    const code = generateHmrCode('/path/to/module.tsx');
    expect(code).toContain('if (import.meta.hot)');
  });

  it('escapes module ID properly', () => {
    const code = generateHmrCode('/path/with"quotes.tsx');
    // JSON.stringify escapes the quotes with backslash
    expect(code).toContain('/path/with\\"quotes.tsx');
  });

  it('passes module ID to HMR handler', () => {
    const code = generateHmrCode('/src/components/Button.tsx');
    expect(code).toContain('"/src/components/Button.tsx"');
    expect(code).toContain('__LITEFORGE_HMR__.handleUpdate');
  });
});

// =============================================================================
// appendHmrCode Tests
// =============================================================================

describe('appendHmrCode', () => {
  it('appends HMR code to existing code', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/test/module.tsx');
    expect(result).toContain(original);
    expect(result).toContain('import.meta.hot');
  });

  it('places HMR code at the end', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/test/module.tsx');
    const hmrIndex = result.indexOf('import.meta.hot');
    const originalEnd = original.length;
    expect(hmrIndex).toBeGreaterThan(originalEnd - 1);
  });

  it('uses "unknown" as default module ID', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original);
    expect(result).toContain('"unknown"');
  });

  it('includes module ID in HMR update call', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/src/App.tsx');
    expect(result).toContain('"/src/App.tsx"');
  });
});

// =============================================================================
// hasHmrAcceptance Tests
// =============================================================================

describe('hasHmrAcceptance', () => {
  it('returns true if code has HMR acceptance', () => {
    const code = `
      const x = 1;
      if (import.meta.hot) {
        import.meta.hot.accept();
      }
    `;
    expect(hasHmrAcceptance(code)).toBe(true);
  });

  it('returns false if code has no HMR acceptance', () => {
    const code = 'const x = 1;';
    expect(hasHmrAcceptance(code)).toBe(false);
  });

  it('returns false for partial HMR code', () => {
    const code = `
      if (import.meta.hot) {
        // No accept call
      }
    `;
    expect(hasHmrAcceptance(code)).toBe(false);
  });
});

// =============================================================================
// injectHmrIds Tests
// =============================================================================

describe('injectHmrIds', () => {
  it('injects __hmrId for named export const', () => {
    const code = `export const MyComponent = defineComponent({
  name: 'MyComponent',
  component() { return null; }
});`;
    const result = injectHmrIds(code, '/src/MyComponent.tsx');
    expect(result).toContain('__hmrId: "/src/MyComponent.tsx::MyComponent"');
  });

  it('injects __hmrId for named export let', () => {
    const code = `export let MyComponent = defineComponent({
  name: 'MyComponent',
});`;
    const result = injectHmrIds(code, '/src/MyComponent.tsx');
    expect(result).toContain('__hmrId: "/src/MyComponent.tsx::MyComponent"');
  });

  it('injects __hmrId for local const (non-exported)', () => {
    const code = `const LocalComponent = defineComponent({
  name: 'Local',
});`;
    const result = injectHmrIds(code, '/src/Local.tsx');
    expect(result).toContain('__hmrId: "/src/Local.tsx::LocalComponent"');
  });

  it('injects __hmrId for export default', () => {
    const code = `export default defineComponent({
  name: 'Default',
});`;
    const result = injectHmrIds(code, '/src/Default.tsx');
    expect(result).toContain('__hmrId: "/src/Default.tsx::default"');
  });

  it('handles multiple components in one file', () => {
    const code = `
export const First = defineComponent({
  name: 'First',
});

export const Second = defineComponent({
  name: 'Second',
});
`;
    const result = injectHmrIds(code, '/src/Components.tsx');
    expect(result).toContain('__hmrId: "/src/Components.tsx::First"');
    expect(result).toContain('__hmrId: "/src/Components.tsx::Second"');
  });

  it('does not modify non-component code', () => {
    const code = `
const helper = () => 'hello';
export const config = { key: 'value' };
`;
    const result = injectHmrIds(code, '/src/utils.ts');
    expect(result).not.toContain('__hmrId');
    expect(result).toBe(code);
  });

  it('normalizes Windows paths', () => {
    const code = `export const MyComp = defineComponent({ name: 'MyComp' });`;
    const result = injectHmrIds(code, 'C:\\Users\\dev\\src\\MyComp.tsx');
    expect(result).toContain('C:/Users/dev/src/MyComp.tsx::MyComp');
    expect(result).not.toContain('\\');
  });

  it('preserves existing component structure', () => {
    const code = `export const App = defineComponent({
  name: 'App',
  setup() { return { count: signal(0) }; },
  component({ setup }) { return <div>{setup.count()}</div>; },
});`;
    const result = injectHmrIds(code, '/src/App.tsx');
    expect(result).toContain('__hmrId: "/src/App.tsx::App"');
    expect(result).toContain('name: \'App\'');
    expect(result).toContain('setup()');
    expect(result).toContain('component({ setup })');
  });
});
