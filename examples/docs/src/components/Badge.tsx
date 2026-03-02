import { createComponent } from '@liteforge/runtime';

export type BadgeVariant = 'default' | 'indigo' | 'green' | 'amber' | 'red' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  class?: string;
  children?: Node | string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
  indigo:  'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50',
  green:   'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
  amber:   'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  red:     'bg-red-900/40 text-red-300 border border-red-700/40',
  neutral: 'bg-neutral-800/60 text-neutral-500 border border-neutral-700/60',
};

const BASE = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';

export const Badge = createComponent<BadgeProps>({
  name: 'Badge',
  component({ props }) {
    const variant = props.variant ?? 'default';
    const extra   = props.class   ?? '';
    const cls     = [BASE, VARIANT_CLASSES[variant], extra].filter(Boolean).join(' ');

    return (
      <span class={cls}>
        {props.children}
      </span>
    );
  },
});
