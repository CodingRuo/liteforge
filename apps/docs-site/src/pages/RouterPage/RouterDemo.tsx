import { createComponent, For, Show, signal } from 'liteforge';
import { btnClass } from '../../components/Button.js';

type Tab = 'home' | 'patients' | 'settings';

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'home',     label: 'Home',     path: '/' },
  { id: 'patients', label: 'Patients', path: '/patients' },
  { id: 'settings', label: 'Settings', path: '/settings' },
];

const CONTENT: Record<Tab, string> = {
  home:     'Welcome to MyApp. Navigate using the tabs above.',
  patients: 'Patient list — click a patient to see their detail view.',
  settings: 'Settings panel — configure your preferences here.',
};

const PATIENTS = [
  { id: 101, name: 'Anna Müller' },
  { id: 102, name: 'Tom Weber' },
  { id: 103, name: 'Clara Huber' },
];

export const RouterDemo = createComponent({
  name: 'RouterDemo',
  component() {
    const active    = signal<Tab>('home');
    const patientId = signal<number | null>(null);

    const currentPath = () => {
      const base = TABS.find(t => t.id === active())!.path;
      const id   = patientId();
      return id !== null ? `${base}/${id}` : base;
    };

    const navigate = (tab: Tab) => { active.set(tab); patientId.set(null); };

    return (
      <div class="space-y-4">
        {/* Tab nav */}
        <nav class="flex gap-1 p-1 rounded-lg bg-[var(--surface-overlay)]/60 w-fit">
          {For({
            each: TABS,
            key: t => t.id,
            children: tab => (
              <button
                class={() =>
                  tab.id === active()
                    ? 'px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-[var(--content-primary)] transition-colors'
                    : 'px-3 py-1.5 rounded-md text-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors'
                }
                onclick={() => navigate(tab.id)}
              >
                {tab.label}
              </button>
            ),
          })}
        </nav>

        {/* Simulated URL bar */}
        <div class="flex items-center gap-1 px-3 py-2 rounded-md bg-[var(--surface-raised)] border border-[var(--line-default)]">
          <span class="text-xs text-[var(--content-subtle)] font-mono">https://myapp.dev</span>
          <span class="text-xs text-indigo-400 font-mono">{() => currentPath()}</span>
        </div>

        {/* Content panel */}
        <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-sunken)] min-h-20 space-y-2">
          {Show({
            when: () => patientId() === null,
            children: () => (
              <p class="text-sm text-[var(--content-secondary)]">{() => CONTENT[active()]}</p>
            ),
          })}

          {/* Patient list — only on patients tab */}
          {Show({
            when: () => active() === 'patients' && patientId() === null,
            children: () => (
              <div class="mt-1 space-y-1">
                {For({
                  each: PATIENTS,
                  key: p => p.id,
                  children: p => (
                    <button
                      class="block w-full text-left px-3 py-1.5 rounded text-sm text-[var(--content-secondary)] hover:bg-[var(--surface-overlay)] transition-colors"
                      onclick={() => patientId.set(p.id)}
                    >
                      {p.name} →
                    </button>
                  ),
                })}
              </div>
            ),
          })}

          {/* Patient detail */}
          {Show({
            when: () => patientId() !== null,
            children: () => (
              <div class="space-y-2">
                <div class="p-3 rounded border border-emerald-500/30 bg-emerald-950/20 text-sm text-emerald-300">
                  {() => `Patient #${patientId()} — params: { id: "${patientId()}" }`}
                </div>
                <button
                  class="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  onclick={() => patientId.set(null)}
                >
                  ← Back to patients
                </button>
              </div>
            ),
          })}
        </div>

        {/* Programmatic navigation */}
        <button
          class={btnClass('secondary', 'sm')}
          onclick={() => navigate('settings')}
        >
          router.navigate("/settings")
        </button>
      </div>
    );
  },
});
