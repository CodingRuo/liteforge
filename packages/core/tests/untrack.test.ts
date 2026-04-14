import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signal.js';
import { effect } from '../src/effect.js';
import { computed } from '../src/computed.js';
import { untrack } from '../src/internals.js';

describe('untrack', () => {
  it('reads a signal without subscribing the current effect', () => {
    const a = signal(1);
    const b = signal(10);
    const spy = vi.fn();

    effect(() => {
      const aVal = a();                        // tracked
      const bVal = untrack(() => b());         // NOT tracked
      spy(aVal + bVal);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(11);

    // Changing b must NOT re-run the effect
    b.set(20);
    expect(spy).toHaveBeenCalledTimes(1);

    // Changing a DOES re-run, but reads current b value
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(22); // a=2 + b=20 (current)
  });

  it('allows writing to a signal inside an effect without looping', () => {
    const source = signal(0);
    const derived = signal(0);
    const runCount = { n: 0 };

    effect(() => {
      runCount.n++;
      const val = source();
      untrack(() => derived.set(val * 2));
    });

    expect(runCount.n).toBe(1);
    expect(derived()).toBe(0);

    source.set(5);
    expect(runCount.n).toBe(2);
    expect(derived()).toBe(10);

    source.set(3);
    expect(runCount.n).toBe(3);
    expect(derived()).toBe(6);
  });

  it('returns the value from fn', () => {
    const s = signal(42);
    const result = untrack(() => s());
    expect(result).toBe(42);
  });

  it('reads a signal without subscribing inside computed', () => {
    const a = signal(1);
    const b = signal(100);

    const c = computed(() => a() + untrack(() => b()));

    expect(c()).toBe(101);

    // b change must NOT invalidate computed
    b.set(200);
    expect(c()).toBe(101); // still cached

    // a change DOES invalidate
    a.set(2);
    expect(c()).toBe(202); // a=2 + b=200 (current)
  });

  it('works outside of any reactive context (no-op)', () => {
    const s = signal(7);
    // Should not throw, just returns value
    const val = untrack(() => s());
    expect(val).toBe(7);
  });

  it('restores tracking context after fn throws', () => {
    const a = signal(1);
    const spy = vi.fn();

    effect(() => {
      const aVal = a();
      try {
        untrack(() => { throw new Error('boom'); });
      } catch {
        // swallow
      }
      spy(aVal); // still inside tracked context — a must still be subscribed
    });

    expect(spy).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
