import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        child: resolve(__dirname, 'child.html'),
      },
    },
  },
});
