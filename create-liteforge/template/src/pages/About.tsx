import { createComponent } from 'liteforge';

export const About = createComponent({
  name: 'About',
  component() {
    return (
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            About LiteForge
          </h1>
          <p class="mt-2 text-slate-500 dark:text-slate-400">
            A signals-based frontend framework built for the modern web.
          </p>
        </div>

        <ul class="flex flex-col gap-2">
          {[
            'Signals-based reactivity — automatic dependency tracking',
            'No Virtual DOM — direct, fine-grained DOM updates',
            'JSX syntax — compiled to DOM operations at build time',
            'Plugin system — router, modal, query via .use()',
            'TypeScript-first — full strict mode throughout',
            'Zero runtime dependencies',
          ].map(item => (
            <li class="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <span class="text-teal-500 dark:text-teal-400 font-semibold mt-0.5">→</span>
              {item}
            </li>
          ))}
        </ul>

        <a
          href="https://github.com/SchildW3rk/liteforge"
          target="_blank"
          rel="noopener"
          class="text-teal-600 dark:text-teal-400 hover:underline font-medium text-sm"
        >
          GitHub →
        </a>
      </div>
    );
  },
});
