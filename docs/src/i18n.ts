/**
 * docs i18n singleton
 *
 * Used as a module-level singleton (same pattern as themeStore) so every
 * page and component can import { t, locale, setLocale } directly without
 * needing use() injection.
 *
 * i18nPlugin in main.tsx pre-loads the default/persisted locale before mount,
 * preventing any flash of untranslated keys.
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
