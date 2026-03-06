import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from '../src/toast.js';
import { toasts, clearToasts, toastConfig } from '../src/store.js';

beforeEach(() => {
  clearToasts();
  toastConfig.set({ duration: 4000, pauseOnHover: true, closable: true });
});

describe('toast.success', () => {
  it('adds a success toast', () => {
    toast.success('Saved!');
    const list = toasts();
    expect(list).toHaveLength(1);
    expect(list[0]?.type).toBe('success');
    expect(list[0]?.message).toBe('Saved!');
  });

  it('returns a string id', () => {
    const id = toast.success('ok');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('toast.error', () => {
  it('adds an error toast', () => {
    toast.error('Failed!');
    expect(toasts()[0]?.type).toBe('error');
  });
});

describe('toast.warning', () => {
  it('adds a warning toast', () => {
    toast.warning('Watch out!');
    expect(toasts()[0]?.type).toBe('warning');
  });
});

describe('toast.info', () => {
  it('adds an info toast', () => {
    toast.info('FYI');
    expect(toasts()[0]?.type).toBe('info');
  });
});

describe('toast options', () => {
  it('respects duration override', () => {
    toast.success('quick', { duration: 100 });
    expect(toasts()[0]?.options.duration).toBe(100);
  });

  it('respects closable override', () => {
    toast.success('no-close', { closable: false });
    expect(toasts()[0]?.options.closable).toBe(false);
  });

  it('falls back to global config defaults', () => {
    toastConfig.set({ duration: 8000, pauseOnHover: false, closable: false });
    toast.info('msg');
    const entry = toasts()[0]!;
    expect(entry.options.duration).toBe(8000);
    expect(entry.options.pauseOnHover).toBe(false);
    expect(entry.options.closable).toBe(false);
  });
});

describe('toast.dismiss', () => {
  it('removes a toast by id', () => {
    const id = toast.success('hello');
    expect(toasts()).toHaveLength(1);
    toast.dismiss(id);
    expect(toasts()).toHaveLength(0);
  });
});

describe('toast.dismissAll', () => {
  it('clears all toasts', () => {
    toast.success('a');
    toast.error('b');
    toast.info('c');
    expect(toasts()).toHaveLength(3);
    toast.dismissAll();
    expect(toasts()).toHaveLength(0);
  });
});

describe('toast.promise', () => {
  it('shows loading toast then success toast', async () => {
    const p = Promise.resolve('done');
    const result = toast.promise(p, {
      loading: 'Loading…',
      success: 'Done!',
      error: 'Failed',
    });

    // During loading
    expect(toasts()[0]?.message).toBe('Loading…');
    expect(toasts()[0]?.options.duration).toBe(0);

    await result;

    // After resolve
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]?.type).toBe('success');
    expect(toasts()[0]?.message).toBe('Done!');
  });

  it('shows error toast on rejection', async () => {
    const p = Promise.reject(new Error('oops'));
    try {
      await toast.promise(p, {
        loading: 'Loading…',
        success: 'Done!',
        error: 'Failed',
      });
    } catch { /* expected */ }

    expect(toasts()[0]?.type).toBe('error');
    expect(toasts()[0]?.message).toBe('Failed');
  });

  it('accepts function for success message', async () => {
    const p = Promise.resolve(42);
    await toast.promise(p, {
      loading: 'Loading…',
      success: (r) => `Result: ${r}`,
      error: 'err',
    });
    expect(toasts()[0]?.message).toBe('Result: 42');
  });

  it('accepts function for error message', async () => {
    const p = Promise.reject(new Error('oh no'));
    try {
      await toast.promise(p, {
        loading: 'Loading…',
        success: 'ok',
        error: (e) => `Error: ${(e as Error).message}`,
      });
    } catch { /* expected */ }
    expect(toasts()[0]?.message).toBe('Error: oh no');
  });

  it('returns the promise result', async () => {
    const p = Promise.resolve(99);
    const result = await toast.promise(p, { loading: '…', success: 'ok', error: 'err' });
    expect(result).toBe(99);
  });

  it('re-throws on rejection', async () => {
    const err = new Error('bang');
    const p = Promise.reject(err);
    await expect(
      toast.promise(p, { loading: '…', success: 'ok', error: 'err' }),
    ).rejects.toThrow('bang');
  });
});

describe('unique IDs', () => {
  it('each toast gets a unique id', () => {
    toast.success('a');
    toast.success('b');
    toast.success('c');
    const ids = toasts().map(t => t.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe('global fetch mock for promise', () => {
  it('multiple toasts accumulate', () => {
    toast.success('one');
    toast.error('two');
    const mocked = vi.fn();
    mocked.mockReturnValue(undefined);
    expect(toasts()).toHaveLength(2);
  });
});
