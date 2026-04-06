import { createComponent, signal } from 'liteforge';
import { Link } from '@liteforge/router';

export const Home = createComponent({
  name: 'Home',
  component() {
    const count = signal(0);

    return (
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to LiteForge ⚡
          </h1>
          <p class="mt-2 text-slate-500 dark:text-slate-400">
            Fine-grained reactivity. No Virtual DOM. TypeScript-first.
          </p>
        </div>

        <div class="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
          <button
            class="w-10 h-10 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-lg font-medium select-none"
            onclick={() => count.update(n => n - 1)}
          >−</button>
          <span class="text-3xl font-bold min-w-12 text-center text-teal-600 dark:text-teal-400 tabular-nums">
            {() => count()}
          </span>
          <button
            class="w-10 h-10 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-lg font-medium select-none"
            onclick={() => count.update(n => n + 1)}
          >+</button>
        </div>

        <p class="text-sm text-slate-400 dark:text-slate-500">
          Edit <code class="bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded text-[0.8em] font-mono">src/pages/Home.tsx</code> and save to see HMR in action.
        </p>

        <Link href="/about" class="text-teal-600 dark:text-teal-400 hover:underline font-medium text-sm">
          Learn more →
        </Link>
      </div>
    );
  },
});
