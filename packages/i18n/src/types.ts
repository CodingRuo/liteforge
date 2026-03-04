/**
 * @liteforge/i18n — Types
 */

export type TranslationValue = string;
export type TranslationTree = {
  [key: string]: TranslationValue | TranslationTree;
};

export type Locale = string;

export type InterpolationParams = Record<string, string | number>;

export interface I18nApi {
  /** Current locale signal accessor */
  locale(): Locale;
  /** Set locale and (re-)load translations */
  setLocale(locale: Locale): Promise<void>;
  /** Translate a dot-notation key, optionally with interpolation and count */
  t(key: string, params?: InterpolationParams, count?: number): string;
}

export type LocaleLoader = (locale: Locale) => Promise<TranslationTree>;

export interface I18nPluginOptions {
  /** Default locale to load on startup */
  defaultLocale: Locale;
  /** Fallback locale used when a key is missing in current locale */
  fallbackLocale?: Locale;
  /** Function that returns the translation tree for a given locale */
  load: LocaleLoader;
  /** Whether to persist the locale choice in localStorage (default: true) */
  persist?: boolean;
  /** localStorage key name (default: 'lf-locale') */
  storageKey?: string;
}
