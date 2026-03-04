export type {
  I18nApi,
  I18nPluginOptions,
  InterpolationParams,
  Locale,
  LocaleLoader,
  TranslationTree,
  TranslationValue,
} from './types.js';
export { createI18n } from './i18n.js';
export { i18nPlugin } from './plugin.js';
export { resolveKey, interpolate, resolvePlural } from './resolve.js';
