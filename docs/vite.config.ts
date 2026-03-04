import { defineConfig } from 'vite';
import liteforge from '@liteforge/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    liteforge(),
  ],
  server: {
    port: 3002,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@liteforge/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@liteforge/runtime': path.resolve(__dirname, '../packages/runtime/src/index.ts'),
      '@liteforge/router': path.resolve(__dirname, '../packages/router/src/index.ts'),
      '@liteforge/query': path.resolve(__dirname, '../packages/query/src/index.ts'),
      '@liteforge/form': path.resolve(__dirname, '../packages/form/src/index.ts'),
      '@liteforge/table': path.resolve(__dirname, '../packages/table/src/index.ts'),
      '@liteforge/client': path.resolve(__dirname, '../packages/client/src/index.ts'),
      '@liteforge/calendar': path.resolve(__dirname, '../packages/calendar/src/index.ts'),
      '@liteforge/store':    path.resolve(__dirname, '../packages/store/src/index.ts'),
      '@liteforge/modal':    path.resolve(__dirname, '../packages/modal/src/index.ts'),
      '@liteforge/devtools': path.resolve(__dirname, '../packages/devtools/src/index.ts'),
    },
  },
});
