export * from '@liteforge/toast';

import type { toast } from '@liteforge/toast';

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    toast: typeof toast;
  }
}
