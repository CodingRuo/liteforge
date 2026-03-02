import { createComponent } from '@liteforge/runtime';

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
  onclick?: (e: MouseEvent) => void;
  children?: Node | string | (() => string);
}

const BTN_BASE = 'inline-flex items-center justify-center rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white',
  neutral:   'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700',
  ghost:     'text-neutral-400 hover:text-neutral-200',
  danger:    'text-neutral-400 hover:text-red-400 hover:bg-red-900/20',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
};

/**
 * Returns the Tailwind class string for a button.
 * Use this in imperative DOM code or on native <button> JSX elements.
 */
export function btnClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = ''): string {
  return [BTN_BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], extra].filter(Boolean).join(' ');
}

export const Button = createComponent<ButtonProps>({
  name: 'Button',
  component({ props }) {
    const variant  = props.variant  ?? 'secondary';
    const size     = props.size     ?? 'md';
    const type     = props.type     ?? 'button';
    const extra    = props.class    ?? '';

    return (
      <button
        type={type}
        class={btnClass(variant, size, extra)}
        disabled={props.disabled}
        onclick={props.onclick}
      >
        {props.children}
      </button>
    );
  },
});
