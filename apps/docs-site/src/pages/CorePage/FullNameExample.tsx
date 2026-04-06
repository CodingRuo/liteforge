import { createComponent, use } from 'liteforge';
import { signal, computed } from 'liteforge';
import { inputClass } from '../../components/Input.js';

export const FullNameExample = createComponent({
  name: 'FullNameExample',
  component() {
    const { t } = use('i18n');
    const firstName = signal('Anna');
    const lastName = signal('Müller');
    const fullName = computed(() => `${firstName()} ${lastName()}`);

    return (
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">{() => t('core.firstName')}</label>
          <input
            class={inputClass({ size: 'sm', extra: 'w-36' })}
            value={() => firstName()}
            oninput={(e: InputEvent) => firstName.set((e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--content-muted)] w-20">{() => t('core.lastName')}</label>
          <input
            class={inputClass({ size: 'sm', extra: 'w-36' })}
            value={() => lastName()}
            oninput={(e: InputEvent) => lastName.set((e.target as HTMLInputElement).value)}
          />
        </div>
        <p class="text-sm font-semibold text-indigo-300 font-mono">
          {() => `fullName = "${fullName()}"`}
        </p>
      </div>
    );
  },
});
