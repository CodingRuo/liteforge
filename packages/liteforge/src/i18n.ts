export * from '@liteforge/i18n';

import type { I18nApi } from '@liteforge/i18n';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    i18n: I18nApi;
  }
}
