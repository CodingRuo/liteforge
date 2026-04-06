import { createComponent, signal, effect } from 'liteforge';
import { btnClass } from '../../components/Button.js';

export const ToggleExample = createComponent({
  name: 'ToggleExample',
  component() {
    const open = signal(false);

    const wrap = document.createElement('div');
    wrap.className = 'space-y-3';

    const btn = document.createElement('button');
    btn.className = btnClass('primary', 'sm');
    effect(() => { btn.textContent = open() ? 'Hide details' : 'Show details'; });
    btn.addEventListener('click', () => open.update(v => !v));

    const panel = document.createElement('div');
    panel.className = 'p-3 rounded border border-indigo-500/30 bg-indigo-950/20 text-sm text-indigo-200';
    panel.textContent = 'Hidden content revealed by Show({ when: open })';
    effect(() => { panel.style.display = open() ? '' : 'none'; });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    return wrap;
  },
});
