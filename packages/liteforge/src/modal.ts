export * from '@liteforge/modal';

import type { ModalApi } from '@liteforge/modal';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    modal: ModalApi;
  }
}
