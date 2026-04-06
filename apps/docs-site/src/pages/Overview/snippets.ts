// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

export const QUICKSTART = `import { signal, computed } from 'liteforge';
import { ${_cc} } from 'liteforge';

const Counter = ${_cc}({
  name: 'Counter',
  component() {
    const count = signal(0);
    const doubled = computed(() => count() * 2);

    return (
      <div>
        <button onclick={() => count.update(n => n + 1)}>
          Count: {() => count()}
        </button>
        <p>Doubled: {() => doubled()}</p>
      </div>
    );
  },
});`;
