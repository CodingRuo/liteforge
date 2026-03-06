export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastOptions {
  /** Duration in ms. 0 = persistent. Default: 4000 */
  duration?: number;
  /** Pause auto-dismiss on hover. Default: true */
  pauseOnHover?: boolean;
  /** Show close button. Default: true */
  closable?: boolean;
}

export interface ToastEntry {
  readonly id: string;
  readonly type: ToastType;
  readonly message: string;
  readonly options: Required<ToastOptions>;
}

export interface ToastPromiseMessages {
  loading: string;
  success: string | ((result: unknown) => string);
  error: string | ((err: unknown) => string);
}

export interface ToastPluginOptions {
  position?: ToastPosition;
  duration?: number;
  pauseOnHover?: boolean;
  closable?: boolean;
  unstyled?: boolean;
}
