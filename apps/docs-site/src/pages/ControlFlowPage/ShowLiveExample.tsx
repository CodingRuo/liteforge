import { createComponent, Show } from 'liteforge';
import { signal } from 'liteforge';

export const ShowLiveExample = createComponent({
  name: 'ShowLiveExample',
  component() {
    const isLoggedIn = signal(false);
    const loading = signal(false);

    return (
      <div class="space-y-3">
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)] transition-colors"
            onclick={() => isLoggedIn.update(v => !v)}
          >
            {() => isLoggedIn() ? 'Log out' : 'Log in'}
          </button>
          <button
            class="px-3 py-1.5 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors"
            onclick={() => { loading.set(true); setTimeout(() => loading.set(false), 1500); }}
          >
            Simulate load
          </button>
        </div>

        <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm min-h-10">
          {Show({
            when: () => loading(),
            children: () => (
              <span class="text-yellow-300 font-mono text-xs">Loading patient data…</span>
            ),
            fallback: () => Show({
              when: () => isLoggedIn(),
              children: () => (
                <span class="text-emerald-300 font-mono text-xs">✓ Welcome back, Dr. Fischer</span>
              ),
              fallback: () => (
                <span class="text-[var(--content-muted)] font-mono text-xs">Please log in to continue</span>
              ),
            }),
          })}
        </div>
      </div>
    );
  },
});
