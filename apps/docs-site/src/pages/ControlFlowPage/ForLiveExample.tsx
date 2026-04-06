import { createComponent, For } from 'liteforge';
import { signal } from 'liteforge';

interface Patient {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

export const ForLiveExample = createComponent({
  name: 'ForLiveExample',
  component() {
    let nextId = 4;
    const patients = signal<Patient[]>([
      { id: 1, name: 'Anna Müller', status: 'active' },
      { id: 2, name: 'Thomas Weber', status: 'inactive' },
      { id: 3, name: 'Maria Fischer', status: 'active' },
    ]);

    const names = ['Klaus Bauer', 'Petra Huber', 'Stefan Gruber', 'Lisa Krämer'];

    return (
      <div class="space-y-3">
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)] transition-colors"
            onclick={() => {
              const name = names[(nextId - 1) % names.length] ?? 'Patient';
              patients.update(ps => [...ps, { id: nextId++, name, status: 'active' }]);
            }}
          >
            Add patient
          </button>
          <button
            class="px-3 py-1.5 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors"
            onclick={() => patients.update(ps => ps.slice(0, -1))}
          >
            Remove last
          </button>
        </div>

        <ul class="space-y-1.5">
          {For({
            each: patients,
            key: (patient) => patient.id,
            children: (p) => (
              <li class="flex items-center justify-between px-3 py-2 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm">
                <span class="text-[var(--content-secondary)]">{p.name}</span>
                <span class={p.status === 'active'
                  ? 'text-xs px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300'
                  : 'text-xs px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--content-muted)]'
                }>
                  {p.status}
                </span>
              </li>
            ),
            fallback: () => (
              <li class="px-3 py-2 text-[var(--content-muted)] text-sm font-mono">No patients</li>
            ),
          })}
        </ul>
      </div>
    );
  },
});
