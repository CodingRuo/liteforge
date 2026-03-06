import type { ToastOptions, ToastPromiseMessages } from './types.js';
import { addToast, removeToast, clearToasts } from './store.js';

function success(message: string, options?: ToastOptions): string {
  return addToast('success', message, options);
}

function error(message: string, options?: ToastOptions): string {
  return addToast('error', message, options);
}

function warning(message: string, options?: ToastOptions): string {
  return addToast('warning', message, options);
}

function info(message: string, options?: ToastOptions): string {
  return addToast('info', message, options);
}

function promise<T>(
  p: Promise<T>,
  messages: ToastPromiseMessages,
  options?: Omit<ToastOptions, 'duration'>,
): Promise<T> {
  const loadingId = addToast('info', messages.loading, { ...options, duration: 0, closable: false });

  return p.then(
    (result) => {
      removeToast(loadingId);
      const msg = typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success;
      addToast('success', msg, options);
      return result;
    },
    (err: unknown) => {
      removeToast(loadingId);
      const msg = typeof messages.error === 'function'
        ? messages.error(err)
        : messages.error;
      addToast('error', msg, options);
      throw err;
    },
  );
}

function dismiss(id: string): void {
  removeToast(id);
}

function dismissAll(): void {
  clearToasts();
}

export const toast = {
  success,
  error,
  warning,
  info,
  promise,
  dismiss,
  dismissAll,
};
