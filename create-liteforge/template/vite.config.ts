import { defineConfig } from 'vite';
import liteforge from '@liteforge/vite-plugin';

export default defineConfig({
  plugins: [liteforge()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
  },
});
