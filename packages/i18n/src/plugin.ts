/**
 * @liteforge/i18n — i18nPlugin
 *
 * Async install: loads the default locale translations before the app mounts.
 * Fallback locale is loaded in parallel (non-blocking).
 *
 * Accepts either an already-created I18nInstance (singleton pattern) or
 * raw options (plugin creates its own instance).
 *
 * @example — singleton pattern (recommended when pages import t() directly)
 * // i18n.ts
 * export const i18n = createI18n({ default: en, fallback: 'en', load })
 * export const { t, locale, setLocale } = i18n
 *
 * // main.tsx
 * import { i18n } from './i18n.js'
 * createApp({ root: App, target: '#app' }).use(i18nPlugin(i18n)).mount()
 */

import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { createI18n, type I18nInstance } from './i18n.js';
import type { I18nApi, I18nOptions, I18nPluginOptions, TranslationTree } from './types.js';

export function i18nPlugin(instance: I18nInstance<Record<string, unknown>>): LiteForgePlugin;
export function i18nPlugin(options: I18nOptions<TranslationTree> | I18nPluginOptions): LiteForgePlugin;
export function i18nPlugin(
  instanceOrOptions: I18nInstance<Record<string, unknown>> | I18nOptions<TranslationTree> | I18nPluginOptions,
): LiteForgePlugin {
  return {
    name: 'i18n',
    async install(context: PluginContext): Promise<() => void> {
      let i18n: I18nInstance;

      if ('_load' in instanceOrOptions) {
        // Pre-created singleton — caller is responsible for preloading
        i18n = instanceOrOptions as I18nInstance;
      } else {
        const options = instanceOrOptions as I18nOptions<TranslationTree> | I18nPluginOptions;
        i18n = createI18n(options as I18nPluginOptions);

        const fallbackLocale = 'fallback' in options
          ? (options as I18nOptions<TranslationTree>).fallback
          : (options as I18nPluginOptions).fallbackLocale;

        // Load default (or persisted) locale — awaited to prevent FOUC
        const loads: Promise<void>[] = [i18n._load(i18n.locale())];
        if (fallbackLocale && fallbackLocale !== i18n.locale()) {
          loads.push(i18n._loadFallback(fallbackLocale));
        }
        await Promise.all(loads);
      }

      const api: I18nApi = {
        locale: i18n.locale,
        setLocale: i18n.setLocale,
        t: i18n.t,
      };

      context.provide('i18n', api);

      return () => {
        // No global state to clean up — signals are GC'd with the instance
      };
    },
  };
}

// Declaration Merging — augments @liteforge/runtime's PluginRegistry so that
// use('i18n') returns I18nApi without a cast.
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    i18n: I18nApi;
  }
}
