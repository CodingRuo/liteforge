// Use relative paths so Vite resolves to the same file as the @liteforge/* aliases.
// @liteforge/core and @liteforge/runtime both resolve to these same files,
// ensuring a single module instance and a shared reactivity graph.
export * from '../../core/src/index.js';
export * from '../../runtime/src/index.js';

// Re-declare all plugin PluginRegistry augmentations so they are active
// whenever 'liteforge' is imported — no separate subpath import required.
import type { Router } from '@liteforge/router';
import type { QueryApi } from '@liteforge/query';
import type { ModalApi } from '@liteforge/modal';
import type { Client } from '@liteforge/client';
import type { I18nApi } from '@liteforge/i18n';
import type { toast } from '@liteforge/toast';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    router: Router;
    query: QueryApi;
    modal: ModalApi;
    client: Client;
    i18n: I18nApi;
    toast: typeof toast;
  }
}
