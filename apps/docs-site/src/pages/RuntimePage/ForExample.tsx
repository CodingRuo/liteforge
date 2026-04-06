import { createComponent, signal, effect } from 'liteforge';
import { inputClass } from '../../components/Input.js';

export const ForExample = createComponent({
  name: 'ForExample',
  component() {
    const items = signal(['Appointments', 'Patients', 'Invoices']);

    const wrap = document.createElement('div');
    wrap.className = 'space-y-2';

    const input = document.createElement('input');
    input.className = inputClass({ extra: 'mb-2' });
    input.placeholder = 'Add item...';
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && input.value.trim() !== '') {
        items.update(list => [...list, input.value.trim()]);
        input.value = '';
      }
    });

    const list = document.createElement('ul');
    list.className = 'space-y-1';

    effect(() => {
      list.innerHTML = '';
      for (const item of items()) {
        const li = document.createElement('li');
        li.className = 'text-sm text-[var(--content-secondary)] px-2 py-1 rounded bg-[var(--surface-overlay)]/50';
        li.textContent = item;
        list.appendChild(li);
      }
    });

    wrap.appendChild(input);
    wrap.appendChild(list);
    return wrap;
  },
});
