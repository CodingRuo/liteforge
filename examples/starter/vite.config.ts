import { defineConfig } from 'vite';
import liteforge from '@liteforge/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [liteforge()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // ES2022 supports top-level await
    target: 'es2022',
  },
  resolve: {
    alias: {
      // Resolve to source files during development - no stale dist/ types
      '@liteforge/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@liteforge/runtime': path.resolve(__dirname, '../../packages/runtime/src/index.ts'),
      '@liteforge/store': path.resolve(__dirname, '../../packages/store/src/index.ts'),
      '@liteforge/router': path.resolve(__dirname, '../../packages/router/src/index.ts'),
      '@liteforge/devtools': path.resolve(__dirname, '../../packages/devtools/src/index.ts'),
      '@liteforge/modal': path.resolve(__dirname, '../../packages/modal/src/index.ts'),
      '@liteforge/client': path.resolve(__dirname, '../../packages/client/src/index.ts'),
    },
  },
});
