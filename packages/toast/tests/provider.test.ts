import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../src/provider.js';
import { toast } from '../src/toast.js';
import { clearToasts } from '../src/store.js';
import { resetStylesInjection } from '../src/styles.js';

beforeEach(() => {
  document.body.innerHTML = '';
  clearToasts();
  resetStylesInjection();
});

describe('ToastProvider', () => {
  it('returns an HTMLElement', () => {
    const el = ToastProvider();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('has container class', () => {
    const el = ToastProvider();
    expect(el.classList.contains('lf-toast-container')).toBe(true);
  });

  it('applies position class', () => {
    const el = ToastProvider({ position: 'top-center' });
    expect(el.classList.contains('lf-toast-container--top-center')).toBe(true);
  });

  it('defaults to bottom-right position', () => {
    const el = ToastProvider();
    expect(el.classList.contains('lf-toast-container--bottom-right')).toBe(true);
  });

  it('renders a toast when added', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('Hello world');

    const toastEl = el.querySelector('.lf-toast');
    expect(toastEl).not.toBeNull();
  });

  it('renders the correct type class', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.error('Oops');

    expect(el.querySelector('.lf-toast--error')).not.toBeNull();
  });

  it('renders the message text', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.info('Test message');

    const msg = el.querySelector('.lf-toast__message');
    expect(msg?.textContent).toBe('Test message');
  });

  it('renders icon', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('ok');

    expect(el.querySelector('.lf-toast__icon')).not.toBeNull();
  });

  it('renders close button when closable is true', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('close me', { closable: true });

    expect(el.querySelector('.lf-toast__close')).not.toBeNull();
  });

  it('does not render close button when closable is false', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('no close', { closable: false });

    expect(el.querySelector('.lf-toast__close')).toBeNull();
  });

  it('renders multiple toasts', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('one');
    toast.error('two');
    toast.warning('three');

    expect(el.querySelectorAll('.lf-toast').length).toBe(3);
  });
});

describe('ToastProvider styles', () => {
  it('injects <link data-lf-toast> into document head', () => {
    ToastProvider();
    expect(document.querySelector('link[data-lf-toast]')).not.toBeNull();
  });

  it('injects styles only once on repeated calls', () => {
    ToastProvider();
    ToastProvider();
    expect(document.querySelectorAll('link[data-lf-toast]').length).toBe(1);
  });

  it('skips CSS injection when unstyled: true', () => {
    ToastProvider({ unstyled: true });
    expect(document.querySelector('link[data-lf-toast]')).toBeNull();
  });
});
