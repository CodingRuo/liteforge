import { createComponent, Switch, Match } from 'liteforge';
import { signal } from 'liteforge';
import { Button } from '../../components/Button.js';

type Status = 'idle' | 'loading' | 'success' | 'error';

export const SwitchLiveExample = createComponent({
  name: 'SwitchLiveExample',
  component() {
    const status = signal<Status>('idle');

    return (
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onclick={() => status.set('idle')}>idle</Button>
          <Button variant="secondary" size="sm" onclick={() => status.set('loading')}>loading</Button>
          <Button variant="secondary" size="sm" onclick={() => status.set('success')}>success</Button>
          <Button variant="secondary" size="sm" onclick={() => status.set('error')}>error</Button>
        </div>

        <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm min-h-12">
          {Switch({
            fallback: () => (
              <span class="text-[var(--content-muted)] font-mono text-xs">Click a status button above</span>
            ),
            children: [
              Match({
                when: () => status() === 'loading',
                children: () => <span class="text-yellow-300 font-mono text-xs">⟳ Fetching appointment data…</span>,
              }),
              Match({
                when: () => status() === 'error',
                children: () => <span class="text-red-300 font-mono text-xs">✕ Failed to load — check your connection</span>,
              }),
              Match({
                when: () => status() === 'success',
                children: () => <span class="text-emerald-300 font-mono text-xs">✓ 12 appointments loaded</span>,
              }),
            ],
          })}
        </div>
      </div>
    );
  },
});
