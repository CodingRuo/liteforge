import { createComponent } from 'liteforge';

export const LifecycleDiagram = createComponent({
  name: 'LifecycleDiagram',
  component() {
    const wrap = document.createElement('div');
    wrap.className = 'overflow-x-auto';
    wrap.innerHTML = `
<pre class="text-xs font-mono text-[var(--content-secondary)] leading-relaxed p-4 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] select-all">
createComponent()
      │
      ▼
  setup()           ← runs once, returns reactive state
      │
      ▼
  load()            ← optional async (shows placeholder while loading)
      │
      ▼
  component()       ← builds + returns DOM (JSX)
      │
      ▼
  mounted()         ← DOM attached, do imperative work (focus, animate, 3rd-party)
      │
      ┌──────────────────────────────────────┐
      │   Reactive update loop               │
      │                                      │
      │  signal.set()                        │
      │      │                               │
      │      ▼                               │
      │  effect re-runs                      │
      │      │                               │
      │      ▼                               │
      │  onCleanup() ← per-effect cleanup    │
      │      │         (runs before re-run   │
      │      │          and on unmount)       │
      └──────────────────────────────────────┘
      │
      ▼
  destroyed()       ← component removed from DOM
</pre>`;
    return wrap;
  },
});
