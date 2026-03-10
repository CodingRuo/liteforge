/**
 * docs i18n singleton
 *
 * Every page imports { t, locale, setLocale } directly from here.
 * main.tsx passes this instance to i18nPlugin() — the plugin preloads
 * the persisted locale and provides the same instance via use('i18n').
 */
import { createI18n } from 'liteforge/i18n';
import en from './locales/en.js';

// Vite-native locale discovery — import.meta.glob finds all locale files at
// build time. Adding a new language = create one file, no other changes needed.
// The cast avoids importing vite/client types which conflict with the runtime package's
// own ImportMeta.env declaration.
type GlobFn = (pattern: string) => Record<string, () => Promise<unknown>>;
const locales = ((import.meta as unknown as { glob: GlobFn }).glob)('./locales/*.js');

export const i18n = createI18n({
  default: en,
  defaultLocaleKey: 'en',
  fallback: 'en',
  load: async (locale: string) => {
    const key = `./locales/${locale}.js`;
    const mod = await locales[key]?.() as { default: typeof en } | undefined;
    return mod?.default ?? en;
  },
  persist: true,
  storageKey: 'lf-docs-locale',
});

export const { t, locale, setLocale } = i18n;
