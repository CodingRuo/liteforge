import { createComponent } from 'liteforge';
import { signal, computed } from 'liteforge';
import { btnClass } from '../../components/Button.js';

export const CounterExample = createComponent({
  name: 'CounterExample',
  component() {
    const count = signal(0);
    const doubled = computed(() => count() * 2);

    return (
      <div class="flex items-center gap-4">
        <button class={btnClass('primary')} onclick={() => count.update(n => n + 1)}>Increment</button>
        <button class={btnClass('secondary')} onclick={() => count.set(0)}>Reset</button>
        <span class="text-sm text-[var(--content-secondary)] font-mono">
          {() => `count = ${count()},  doubled = ${doubled()}`}
        </span>
      </div>
    );
  },
});
