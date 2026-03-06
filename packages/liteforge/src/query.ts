export * from '@liteforge/query';

import type { QueryApi } from '@liteforge/query';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    query: QueryApi;
  }
}
