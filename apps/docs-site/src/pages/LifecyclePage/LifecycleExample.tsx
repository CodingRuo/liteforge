import { createComponent, signal, effect } from 'liteforge';

export const LifecycleExample = createComponent({
  name: 'LifecycleExample',
  component() {
    const log = signal<string[]>([]);
    const mounted = signal(true);

    const addLog = (msg: string) => {
      log.update(l => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0, 8));
    };

    const wrap = document.createElement('div');
    wrap.className = 'space-y-3';

    // Log display
    const logEl = document.createElement('div');
    logEl.className = 'font-mono text-xs space-y-1 min-h-[100px]';
    effect(() => {
      logEl.innerHTML = '';
      for (const entry of log()) {
        const row = document.createElement('div');
        row.className = 'text-emerald-400';
        row.textContent = entry;
        logEl.appendChild(row);
      }
      if (log().length === 0) {
        logEl.textContent = 'Mount the child component to see lifecycle events…';
        logEl.className = 'font-mono text-xs text-[var(--content-muted)] min-h-[100px]';
      }
    });

    // Child component (simulated with plain DOM)
    let child: HTMLElement | null = null;
    let childEffect: (() => void) | null = null;

    const makeChild = () => {
      const el = document.createElement('div');
      el.className = 'px-3 py-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-sm text-indigo-200';
      const count = signal(0);

      // onMount equivalent
      addLog('mounted() — component attached to DOM');

      // effect with onCleanup equivalent
      childEffect = effect(() => {
        el.textContent = `Count: ${count()} (click to increment)`;
        // cleanup runs before each re-run and on unmount
        return () => addLog(`onCleanup() — effect re-ran (count changed to ${count()})`);
      });

      el.addEventListener('click', () => {
        count.update(n => n + 1);
      });

      // Store count for unmount demonstration
      (el as HTMLElement & { _count?: typeof count })._count = count;
      return { el, count };
    };

    const mountBtn = document.createElement('button');
    const unmountBtn = document.createElement('button');

    const updateStyle = () => {
      mountBtn.className = `px-3 py-1.5 text-sm rounded font-medium transition-opacity ${mounted() ? 'opacity-40 cursor-not-allowed bg-[var(--surface-overlay)] text-[var(--content-muted)]' : 'bg-indigo-600 text-white hover:opacity-80'}`;
      unmountBtn.className = `px-3 py-1.5 text-sm rounded font-medium transition-opacity ${mounted() ? 'bg-red-700/80 text-white hover:opacity-80' : 'opacity-40 cursor-not-allowed bg-[var(--surface-overlay)] text-[var(--content-muted)]'}`;
    };

    mountBtn.textContent = 'Mount child';
    mountBtn.addEventListener('click', () => {
      if (mounted()) return;
      const { el } = makeChild();
      child = el;
      childContainer.appendChild(el);
      mounted.set(true);
      updateStyle();
    });

    unmountBtn.textContent = 'Unmount child';
    unmountBtn.addEventListener('click', () => {
      if (!mounted()) return;
      if (childEffect) { childEffect(); childEffect = null; }
      child?.remove();
      child = null;
      mounted.set(false);
      addLog('destroyed() — component removed from DOM');
      updateStyle();
    });

    const childContainer = document.createElement('div');
    childContainer.className = 'min-h-[44px]';

    // Auto-mount on first render
    const { el: initialChild } = makeChild();
    child = initialChild;
    childContainer.appendChild(initialChild);
    updateStyle();

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-2';
    btnRow.appendChild(mountBtn);
    btnRow.appendChild(unmountBtn);

    const logBox = document.createElement('div');
    logBox.className = 'p-3 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] min-h-[120px]';
    logBox.appendChild(logEl);

    wrap.appendChild(childContainer);
    wrap.appendChild(btnRow);
    wrap.appendChild(logBox);
    return wrap;
  },
});
