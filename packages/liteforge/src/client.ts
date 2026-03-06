export * from '@liteforge/client';

import type { Client } from '@liteforge/client';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    client: Client;
  }
}
