import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { cli: 'src/server.ts' },
    format: ['esm'],
    outExtension: () => ({ js: '.mjs' }),
    platform: 'node',
    banner: { js: '#!/usr/bin/env node' },
    splitting: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    external: ['ws'],
  },
]);
