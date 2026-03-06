import { describe, it, expect } from 'vitest';
import { parseStack } from '../src/stack-parser.js';

describe('parseStack', () => {
  it('returns empty array for null', () => {
    expect(parseStack(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseStack(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseStack('')).toEqual([]);
  });

  it('parses V8 named frame', () => {
    const stack = 'Error: oops\n    at myFunction (/app/src/foo.ts:10:5)';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ fn: 'myFunction', file: '/app/src/foo.ts', line: 10, col: 5 });
  });

  it('parses V8 anonymous frame (no function name)', () => {
    const stack = 'Error: oops\n    at /app/src/foo.ts:10:5';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ fn: '<anonymous>', file: '/app/src/foo.ts', line: 10, col: 5 });
  });

  it('parses V8 new constructor frame', () => {
    const stack = 'Error: oops\n    at new MyClass (/app/src/cls.ts:20:3)';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.fn).toBe('MyClass');
  });

  it('parses Firefox/Safari format', () => {
    const stack = 'Error: oops\nmyFunction@http://localhost:3000/app.js:42:8';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ fn: 'myFunction', file: 'http://localhost:3000/app.js', line: 42, col: 8 });
  });

  it('parses Firefox anonymous frame (empty fn part)', () => {
    const stack = '@http://localhost:3000/app.js:42:8';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.fn).toBe('<anonymous>');
  });

  it('marks liteforge internal frames', () => {
    const stack = [
      '    at render (node_modules/@liteforge/runtime/dist/index.js:5:1)',
      '    at userCode (/app/src/my-component.ts:10:1)',
    ].join('\n');
    const frames = parseStack(stack);
    expect(frames).toHaveLength(2);
    expect(frames[0]!.isInternal).toBe(true);
    expect(frames[1]!.isInternal).toBe(false);
  });

  it('marks liteforge/src frames as internal', () => {
    const stack = '    at setup (/liteforge/src/component.ts:50:3)';
    const frames = parseStack(stack);
    expect(frames[0]!.isInternal).toBe(true);
  });

  it('marks liteforge/dist frames as internal', () => {
    const stack = '    at mount (/liteforge/dist/index.js:1:100)';
    const frames = parseStack(stack);
    expect(frames[0]!.isInternal).toBe(true);
  });

  it('parses multiple frames in order', () => {
    const stack = [
      'Error: boom',
      '    at alpha (/app/a.ts:1:1)',
      '    at beta (/app/b.ts:2:2)',
      '    at gamma (/app/c.ts:3:3)',
    ].join('\n');
    const frames = parseStack(stack);
    expect(frames).toHaveLength(3);
    expect(frames.map(f => f.fn)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('strips Vite HMR ?t= timestamp from file paths', () => {
    const stack = '    at myFn (http://localhost:5666/src/router.tsx?t=1772789393027:142:41)';
    const frames = parseStack(stack);
    expect(frames[0]!.file).toBe('http://localhost:5666/src/router.tsx');
  });

  it('skips non-frame lines (e.g. error message line)', () => {
    const stack = 'TypeError: cannot read property\n    at foo (/app/foo.ts:1:1)';
    const frames = parseStack(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.fn).toBe('foo');
  });
});
