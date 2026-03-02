import { createComponent } from '@liteforge/runtime';
import { signal, effect } from '@liteforge/core';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// =============================================================================
// Live Examples
// =============================================================================

function ShowLiveExample(): Node {
  const isLoggedIn = signal(false);
  const loading = signal(false);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const controls = document.createElement('div');
  controls.className = 'flex gap-2';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors';
  toggleBtn.addEventListener('click', () => isLoggedIn.update(v => !v));

  const loadBtn = document.createElement('button');
  loadBtn.className = 'px-3 py-1.5 text-sm rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors';
  loadBtn.textContent = 'Simulate load';
  loadBtn.addEventListener('click', () => {
    loading.set(true);
    setTimeout(() => loading.set(false), 1500);
  });

  controls.appendChild(toggleBtn);
  controls.appendChild(loadBtn);

  const output = document.createElement('div');
  output.className = 'p-3 rounded border border-neutral-800 bg-neutral-900/50 text-sm min-h-10';

  effect(() => {
    toggleBtn.textContent = isLoggedIn() ? 'Log out' : 'Log in';

    output.innerHTML = '';
    const span = document.createElement('span');
    if (loading()) {
      span.className = 'text-yellow-300 font-mono text-xs';
      span.textContent = 'Loading patient data…';
    } else if (isLoggedIn()) {
      span.className = 'text-emerald-300 font-mono text-xs';
      span.textContent = '✓ Welcome back, Dr. Fischer';
    } else {
      span.className = 'text-neutral-500 font-mono text-xs';
      span.textContent = 'Please log in to continue';
    }
    output.appendChild(span);
  });

  wrap.appendChild(controls);
  wrap.appendChild(output);
  return wrap;
}

function ForLiveExample(): Node {
  interface Patient {
    id: number;
    name: string;
    status: 'active' | 'inactive';
  }

  let nextId = 4;
  const patients = signal<Patient[]>([
    { id: 1, name: 'Anna Müller', status: 'active' },
    { id: 2, name: 'Thomas Weber', status: 'inactive' },
    { id: 3, name: 'Maria Fischer', status: 'active' },
  ]);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const controls = document.createElement('div');
  controls.className = 'flex gap-2';

  const addBtn = document.createElement('button');
  addBtn.className = 'px-3 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors';
  addBtn.textContent = 'Add patient';
  addBtn.addEventListener('click', () => {
    const names = ['Klaus Bauer', 'Petra Huber', 'Stefan Gruber', 'Lisa Krämer'];
    const name = names[(nextId - 1) % names.length] ?? 'Patient';
    patients.update(ps => [...ps, { id: nextId++, name, status: 'active' }]);
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'px-3 py-1.5 text-sm rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors';
  removeBtn.textContent = 'Remove last';
  removeBtn.addEventListener('click', () => {
    patients.update(ps => ps.slice(0, -1));
  });

  controls.appendChild(addBtn);
  controls.appendChild(removeBtn);

  const list = document.createElement('ul');
  list.className = 'space-y-1.5';

  effect(() => {
    const items = patients();
    list.innerHTML = '';
    for (const p of items) {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between px-3 py-2 rounded border border-neutral-800 bg-neutral-900/50 text-sm';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'text-neutral-300';
      nameSpan.textContent = p.name;

      const badge = document.createElement('span');
      badge.className = p.status === 'active'
        ? 'text-xs px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300'
        : 'text-xs px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-500';
      badge.textContent = p.status;

      li.appendChild(nameSpan);
      li.appendChild(badge);
      list.appendChild(li);
    }
  });

  wrap.appendChild(controls);
  wrap.appendChild(list);
  return wrap;
}

function SwitchLiveExample(): Node {
  type Status = 'idle' | 'loading' | 'success' | 'error';
  const status = signal<Status>('idle');

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const controls = document.createElement('div');
  controls.className = 'flex flex-wrap gap-2';

  const states: Status[] = ['idle', 'loading', 'success', 'error'];
  for (const s of states) {
    const btn = document.createElement('button');
    btn.className = 'px-3 py-1.5 text-sm rounded border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors font-mono';
    btn.textContent = s;
    btn.addEventListener('click', () => status.set(s));
    controls.appendChild(btn);
  }

  const output = document.createElement('div');
  output.className = 'p-3 rounded border border-neutral-800 bg-neutral-900/50 text-sm min-h-12';

  effect(() => {
    output.innerHTML = '';
    const s = status();
    const span = document.createElement('span');

    if (s === 'loading') {
      span.className = 'text-yellow-300 font-mono text-xs';
      span.textContent = '⟳ Fetching appointment data…';
    } else if (s === 'error') {
      span.className = 'text-red-300 font-mono text-xs';
      span.textContent = '✕ Failed to load — check your connection';
    } else if (s === 'success') {
      span.className = 'text-emerald-300 font-mono text-xs';
      span.textContent = '✓ 12 appointments loaded';
    } else {
      span.className = 'text-neutral-500 font-mono text-xs';
      span.textContent = 'Click a status button above';
    }

    output.appendChild(span);
  });

  wrap.appendChild(controls);
  wrap.appendChild(output);
  return wrap;
}

// =============================================================================
// Code strings
// =============================================================================

const REACTIVE_EXPR_CODE = `// Any {() => expr} in JSX is a fine-grained reactive scope
// Only this text node re-renders when userName changes — nothing else

<p>Hello, {() => userName()}</p>

// Inline conditional — no component, just a reactive node
<div>{() => isAdmin() ? <AdminBadge /> : null}</div>

// Ternary with fallback
<div>{() => count() > 0 ? \`\${count()} items\` : 'No items'}</div>`;

const REACTIVE_EXPR_SIGNAL_CODE = `import { signal, effect } from '@liteforge/core';

const count = signal(0);

// In JSX — each () => creates its own reactive scope
<button onclick={() => count.update(n => n + 1)}>
  Clicked {() => count()} times
</button>

// When count changes, ONLY the text node updates.
// The <button> element is never recreated.`;

const SHOW_BASIC_CODE = `import { Show } from '@liteforge/runtime';
import { signal } from '@liteforge/core';

const isLoggedIn = signal(false);

// Basic — show or nothing
Show({
  when: () => isLoggedIn(),
  children: (loggedIn) => <Dashboard user={loggedIn} />,
})

// With fallback
Show({
  when: () => isLoggedIn(),
  children: (loggedIn) => <Dashboard user={loggedIn} />,
  fallback: () => <LoginForm />,
})`;

const SHOW_REALISTIC_CODE = `import { Show } from '@liteforge/runtime';
import { createQuery } from '@liteforge/query';

const patientQuery = createQuery({
  key: 'patients',
  fn: () => fetch('/api/patients').then(r => r.json()),
});

// Loading state
Show({
  when: () => patientQuery.isLoading(),
  children: () => <Skeleton />,
})

// Error state
Show({
  when: () => patientQuery.error() !== undefined,
  children: () => <ErrorBanner message="Failed to load patients" />,
})

// Data — when() returns the Patient[], children receives it typed
Show({
  when: () => patientQuery.data(),
  children: (patients) => <PatientTable rows={patients} />,
})`;

const SHOW_JSX_CODE = `// JSX tag syntax — same thing, different style
<Show when={() => isLoggedIn()} fallback={() => <LoginForm />}>
  {(user) => <Dashboard user={user} />}
</Show>`;

const SWITCH_CODE = `import { Switch, Match } from '@liteforge/runtime';
import { signal } from '@liteforge/core';

type Status = 'idle' | 'loading' | 'success' | 'error';
const status = signal<Status>('idle');

Switch({
  fallback: () => <p>Unknown state</p>,
  children: [
    Match({ when: () => status() === 'loading', children: () => <Spinner /> }),
    Match({ when: () => status() === 'error',   children: () => <ErrorBanner /> }),
    Match({ when: () => status() === 'success', children: () => <AppointmentList /> }),
  ],
})`;

const SWITCH_JSX_CODE = `// JSX syntax
<Switch fallback={() => <p>Unknown state</p>}>
  <Match when={() => status() === 'loading'}>{() => <Spinner />}</Match>
  <Match when={() => status() === 'error'}>{() => <ErrorBanner />}</Match>
  <Match when={() => status() === 'success'}>{() => <AppointmentList />}</Match>
</Switch>`;

const FOR_BASIC_CODE = `import { For } from '@liteforge/runtime';
import { signal } from '@liteforge/core';

interface Patient {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

const patients = signal<Patient[]>([]);

// Render a keyed list — key is used to match DOM nodes on updates
For({
  each: () => patients(),
  key: (patient) => patient.id,
  children: (patient, index) => (
    <li>
      {index + 1}. {patient.name} — {patient.status}
    </li>
  ),
})`;

const FOR_JSX_CODE = `// JSX tag syntax
<For each={() => patients()} key={(p) => p.id}>
  {(patient, index) => (
    <li class="patient-item">
      <strong>{patient.name}</strong>
      <span class={patient.status === 'active' ? 'badge-green' : 'badge-gray'}>
        {patient.status}
      </span>
    </li>
  )}
</For>`;

const FOR_WHY_NOT_MAP_CODE = `// ❌ Don't do this with signals — .map() runs once, never updates
<ul>
  {patients().map(p => <li>{p.name}</li>)}
</ul>

// ❌ This wraps the whole list in a getter — re-creates ALL nodes on every change
<ul>
  {() => patients().map(p => <li>{p.name}</li>)}
</ul>

// ✅ Use For — keyed reconciliation, only changed nodes update
<ul>
  <For each={() => patients()} key={(p) => p.id}>
    {(p) => <li>{p.name}</li>}
  </For>
</ul>`;

const NESTED_CODE = `// Show inside For — conditional items in a list
<For each={() => appointments()} key={(a) => a.id}>
  {(appointment) => (
    <Show
      when={() => appointment.doctorId === selectedDoctor()}
      children={() => <AppointmentCard data={appointment} />}
    />
  )}
</For>

// For inside Show — don't render the list at all when loading
<Show when={() => !isLoading()} fallback={() => <Skeleton />}>
  {() => (
    <For each={() => patients()} key={(p) => p.id}>
      {(p) => <PatientRow patient={p} />}
    </For>
  )}
</Show>`;

const QUERY_SHOW_CODE = `import { Show } from '@liteforge/runtime';
import { createQuery } from '@liteforge/query';

const appointments = createQuery({
  key: 'appointments',
  fn: () => fetch('/api/appointments').then(r => r.json()),
});

// Three-state UI with query — loading → error → data
Show({
  when: () => appointments.isLoading(),
  children: () => <LoadingSkeleton />,
  fallback: () => Show({
    when: () => appointments.error() !== undefined,
    children: () => <ErrorMessage error={appointments.error()} />,
    fallback: () => Show({
      when: () => appointments.data() !== undefined,
      children: (data) => <AppointmentGrid appointments={data} />,
    }),
  }),
})`;

const LIVE_SHOW_CODE = `const isLoggedIn = signal(false);
const loading = signal(false);

<Show when={() => loading()}>
  {() => <p>Loading patient data…</p>}
</Show>
<Show when={() => !loading() && isLoggedIn()} fallback={() => <LoginForm />}>
  {() => <p>Welcome back, Dr. Fischer</p>}
</Show>`;

const LIVE_FOR_CODE = `const patients = signal([
  { id: 1, name: 'Anna Müller',    status: 'active' },
  { id: 2, name: 'Thomas Weber',   status: 'inactive' },
  { id: 3, name: 'Maria Fischer',  status: 'active' },
]);

<For each={() => patients()} key={(p) => p.id}>
  {(p) => (
    <li>
      {p.name}
      <span class={p.status === 'active' ? 'green' : 'gray'}>
        {p.status}
      </span>
    </li>
  )}
</For>`;

const LIVE_SWITCH_CODE = `type Status = 'idle' | 'loading' | 'success' | 'error';
const status = signal<Status>('idle');

<Switch>
  <Match when={() => status() === 'loading'}>
    {() => <p>Fetching appointment data…</p>}
  </Match>
  <Match when={() => status() === 'error'}>
    {() => <p>Failed to load — check your connection</p>}
  </Match>
  <Match when={() => status() === 'success'}>
    {() => <p>12 appointments loaded</p>}
  </Match>
</Switch>`;

// =============================================================================
// API rows
// =============================================================================

const SHOW_API: ApiRow[] = [
  { name: 'when', type: '() => T | T', description: 'Condition — when truthy, children is called with the value (narrowed to NonNullable<T>)' },
  { name: 'children', type: '(value: NonNullable<T>) => Node', description: 'Render function called with the truthy value' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when when is falsy' },
];

const FOR_API: ApiRow[] = [
  { name: 'each', type: '() => T[] | T[]', description: 'Reactive array source — can be a signal getter or a plain array' },
  { name: 'key', type: '(item: T, index: number) => string | number', default: 'index', description: 'Key extractor for reconciliation — use a stable unique ID for best performance' },
  { name: 'children', type: '(item: T, index: number) => Node', description: 'Render function called for each item' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when the array is empty' },
];

const SWITCH_API: ApiRow[] = [
  { name: 'children', type: 'MatchCase[]', description: 'Array of Match case objects — first truthy match wins' },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: 'Rendered when no Match condition is true' },
];

const MATCH_API: ApiRow[] = [
  { name: 'when', type: '() => boolean | boolean', description: 'Condition — first true match in a Switch wins' },
  { name: 'children', type: '() => Node', description: 'Render function for this case' },
];

// =============================================================================
// Page
// =============================================================================

export const ControlFlowPage = createComponent({
  name: 'ControlFlowPage',
  component() {
    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-neutral-500 mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-white mb-2">Control Flow</h1>
          <p class="text-neutral-400 leading-relaxed max-w-xl">
            Conditionals, lists, and reactive rendering — no virtual DOM diffing, just surgical DOM updates.
            Each reactive node updates independently when its signal changes.
          </p>
          <CodeBlock
            code={`import { Show, Switch, Match, For } from '@liteforge/runtime';`}
            language="typescript"
          />
        </div>

        {/* Section 1: Reactive expressions */}
        <DocSection
          title="Reactive expressions {() => ...}"
          id="reactive-expressions"
          description="The foundation of everything. Any () => expr in JSX creates a fine-grained reactive scope — only that DOM node updates when the signal changes, nothing else."
        >
          <div>
            <CodeBlock code={REACTIVE_EXPR_SIGNAL_CODE} language="tsx" />
            <CodeBlock code={REACTIVE_EXPR_CODE} language="tsx" />
            <div class="mt-4 p-4 rounded-lg border border-indigo-500/20 bg-indigo-950/20 text-sm text-neutral-300 leading-relaxed">
              <span class="font-semibold text-indigo-300">When to use inline expressions: </span>
              Simple signal reads, text interpolation, and short ternaries. For complex conditions or fallbacks, use
              <code class="mx-1 px-1 py-0.5 rounded bg-neutral-800 text-xs font-mono text-indigo-300">Show</code>.
            </div>
          </div>
        </DocSection>

        {/* Section 2: Show */}
        <DocSection
          title="Show"
          id="show"
          description="Conditional rendering with typed value passing. When the condition is truthy, children receives the value narrowed to NonNullable<T> — no optional chaining needed."
        >
          <div>
            <CodeBlock code={SHOW_BASIC_CODE} language="tsx" />
            <CodeBlock code={SHOW_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={SHOW_API} />
            <CodeBlock code={SHOW_REALISTIC_CODE} language="tsx" title="With @liteforge/query" />
            <LiveExample
              title="Show — conditional login state"
              component={ShowLiveExample}
              code={LIVE_SHOW_CODE}
            />
          </div>
        </DocSection>

        {/* Section 3: Switch / Match */}
        <DocSection
          title="Switch / Match"
          id="switch"
          description="Multiple exclusive conditions — like a switch/case for JSX. First truthy Match wins. Cleaner than nested ternaries when you have 3+ states."
        >
          <div>
            <CodeBlock code={SWITCH_CODE} language="tsx" />
            <CodeBlock code={SWITCH_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <div class="grid grid-cols-2 gap-0 mt-2">
              <div>
                <p class="text-xs font-semibold text-neutral-400 mb-1 mt-4">Switch</p>
                <ApiTable rows={SWITCH_API} />
              </div>
              <div>
                <p class="text-xs font-semibold text-neutral-400 mb-1 mt-4">Match</p>
                <ApiTable rows={MATCH_API} />
              </div>
            </div>
            <LiveExample
              title="Switch — appointment status"
              component={SwitchLiveExample}
              code={LIVE_SWITCH_CODE}
            />
          </div>
        </DocSection>

        {/* Section 4: For */}
        <DocSection
          title="For"
          id="for"
          description="Keyed list rendering. For each item LiteForge tracks a stable key — when the array changes, only the nodes that actually changed are updated or moved. No full re-render."
        >
          <div>
            <CodeBlock code={FOR_BASIC_CODE} language="tsx" />
            <CodeBlock code={FOR_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={FOR_API} />
            <CodeBlock code={FOR_WHY_NOT_MAP_CODE} language="tsx" title="Why not .map()?" />
            <LiveExample
              title="For — patient list with add/remove"
              component={ForLiveExample}
              code={LIVE_FOR_CODE}
            />
          </div>
        </DocSection>

        {/* Section 5: Decision guide */}
        <DocSection
          title="When to use what"
          id="decision-guide"
        >
          <div class="overflow-x-auto rounded-lg border border-neutral-800 my-4">
            <table class="w-full text-sm text-left">
              <thead class="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3">Situation</th>
                  <th class="px-4 py-3">Use</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-neutral-950">
                  <td class="px-4 py-3 text-neutral-300">Simple true/false, no fallback</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">{'`{() => cond() ? <A /> : null}`'}</td>
                </tr>
                <tr class="bg-neutral-900/50">
                  <td class="px-4 py-3 text-neutral-300">True/false with fallback UI</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">Show</td>
                </tr>
                <tr class="bg-neutral-950">
                  <td class="px-4 py-3 text-neutral-300">Multiple exclusive conditions (3+)</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">Switch / Match</td>
                </tr>
                <tr class="bg-neutral-900/50">
                  <td class="px-4 py-3 text-neutral-300">Rendering an array</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">For</td>
                </tr>
                <tr class="bg-neutral-950">
                  <td class="px-4 py-3 text-neutral-300">Dynamic text / interpolation</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">{'`{() => signal()}`'}</td>
                </tr>
                <tr class="bg-neutral-900/50">
                  <td class="px-4 py-3 text-neutral-300">Typed value in condition body</td>
                  <td class="px-4 py-3 font-mono text-indigo-300 text-xs">Show (narrows NonNullable&lt;T&gt;)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Section 6: Patterns & tips */}
        <DocSection
          title="Patterns & tips"
          id="patterns"
        >
          <div>
            <p class="text-sm text-neutral-400 mb-3">Composing control flow primitives for real-world UIs:</p>
            <CodeBlock code={NESTED_CODE} language="tsx" title="Nesting Show inside For (and vice versa)" />
            <CodeBlock code={QUERY_SHOW_CODE} language="tsx" title="Show + @liteforge/query — three-state loading UI" />
          </div>
        </DocSection>
      </div>
    );
  },
});
