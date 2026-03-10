export type {
  I18nApi,
  I18nPluginOptions,
  InterpolationParams,
  Locale,
  LocaleLoader,
  TranslationTree,
  TranslationValue,
  ExtractKeys,
} from './types.js';
export type { I18nInstance } from './i18n.js';
export { createI18n } from './i18n.js';
export { i18nPlugin } from './plugin.js';
export { resolveKey, interpolate, resolvePlural } from './resolve.js';

/**
 * Type-safe wrapper for locale definitions.
 * Validates that a translation object matches the canonical shape T.
 * Missing or extra keys are caught at the call site — no satisfies, no type import in every locale file.
 *
 * @example
 * // locales/de.ts
 * import { defineTranslations } from '@liteforge/i18n';
 * import type { AppTranslations } from './en.js';
 *
 * export default defineTranslations<AppTranslations>({ ... });
 */
export function defineTranslations<T>(t: T): T {
  return t;
}
