import { createComponent } from 'liteforge';
import { RouterOutlet, Link } from '@liteforge/router';
import { uiStore } from './stores/ui';

export const App = createComponent({
  name: 'App',
  component() {
    return (
      <div class="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
        <nav class="max-w-3xl mx-auto px-6 py-4 flex items-center gap-6 border-b border-slate-200 dark:border-slate-700">
          <Link href="/" class="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
            Home
          </Link>
          <Link href="/about" class="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
            About
          </Link>
          <button
            class="ml-auto px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            onclick={() => {
              const next = uiStore.effectiveTheme() === 'dark' ? 'light' : 'dark';
              uiStore.setTheme(next);
            }}
          >
            {() => uiStore.effectiveTheme() === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
        <main class="max-w-3xl mx-auto px-6 py-8">
          {RouterOutlet()}
        </main>
      </div>
    );
  },
});
