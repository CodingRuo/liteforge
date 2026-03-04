import { describe, it, expect } from 'vitest';
import { resolveKey, interpolate, resolvePlural } from '../src/resolve.js';

describe('resolveKey', () => {
  const tree = {
    hello: 'Hello',
    nav: {
      home: 'Home',
      deep: { title: 'Deep' },
    },
  };

  it('resolves top-level key', () => {
    expect(resolveKey(tree, 'hello')).toBe('Hello');
  });

  it('resolves nested key', () => {
    expect(resolveKey(tree, 'nav.home')).toBe('Home');
  });

  it('resolves deeply nested key', () => {
    expect(resolveKey(tree, 'nav.deep.title')).toBe('Deep');
  });

  it('returns undefined for missing key', () => {
    expect(resolveKey(tree, 'missing')).toBeUndefined();
  });

  it('returns undefined for partial path', () => {
    expect(resolveKey(tree, 'nav.missing')).toBeUndefined();
  });

  it('returns undefined when pointing to a subtree (not a string)', () => {
    expect(resolveKey(tree, 'nav')).toBeUndefined();
  });

  it('returns undefined for empty tree', () => {
    expect(resolveKey({}, 'hello')).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('replaces single param', () => {
    expect(interpolate('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
  });

  it('replaces multiple params', () => {
    expect(interpolate('{a} and {b}', { a: '1', b: '2' })).toBe('1 and 2');
  });

  it('replaces numeric param', () => {
    expect(interpolate('{count} items', { count: 42 })).toBe('42 items');
  });

  it('keeps placeholder when param missing', () => {
    expect(interpolate('Hello, {name}!', {})).toBe('Hello, {name}!');
  });

  it('returns template unchanged when no params', () => {
    expect(interpolate('Hello')).toBe('Hello');
    expect(interpolate('Hello', undefined)).toBe('Hello');
  });

  it('handles no placeholders in template', () => {
    expect(interpolate('Hello', { name: 'World' })).toBe('Hello');
  });
});

describe('resolvePlural', () => {
  describe('2-part format (singular | plural)', () => {
    const template = 'item | items';

    it('returns singular for count 1', () => {
      expect(resolvePlural(template, 1)).toBe('item');
    });

    it('returns plural for count 0', () => {
      expect(resolvePlural(template, 0)).toBe('items');
    });

    it('returns plural for count > 1', () => {
      expect(resolvePlural(template, 5)).toBe('items');
    });
  });

  describe('3-part format (zero | one | many)', () => {
    const template = 'Nothing | One thing | Many things';

    it('returns zero form for count 0', () => {
      expect(resolvePlural(template, 0)).toBe('Nothing');
    });

    it('returns one form for count 1', () => {
      expect(resolvePlural(template, 1)).toBe('One thing');
    });

    it('returns many form for count > 1', () => {
      expect(resolvePlural(template, 99)).toBe('Many things');
    });
  });

  it('returns template unchanged when no pipe separator', () => {
    expect(resolvePlural('no plural here', 1)).toBe('no plural here');
    expect(resolvePlural('no plural here', 5)).toBe('no plural here');
  });
});
