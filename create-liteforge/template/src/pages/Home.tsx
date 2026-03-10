import { createComponent, signal } from 'liteforge';
import { Link } from 'liteforge/router';

export const Home = createComponent({
  name: 'Home',
  component() {
    const count = signal(0);

    return (
      <div class="page">
        <h1>Welcome to LiteForge</h1>
        <p class="lead">
          Fine-grained reactivity. No Virtual DOM. TypeScript-first.
        </p>

        <div class="counter">
          <button onclick={() => count.update(n => n - 1)}>−</button>
          <span>{() => count()}</span>
          <button onclick={() => count.update(n => n + 1)}>+</button>
        </div>

        <p class="hint">
          Edit <code>src/pages/Home.tsx</code> and save to see HMR in action.
        </p>

        <p>
          <Link href="/about" class="link">Learn more →</Link>
        </p>
      </div>
    );
  },
});
