import { defineConfig } from 'vite';
import liteforge from '@liteforge/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [liteforge(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
  },
});
