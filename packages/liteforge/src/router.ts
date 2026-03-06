export * from '@liteforge/router';

import type { Router } from '@liteforge/router';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    router: Router;
  }
}
