import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/transport/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    external: ['react', '@webview-ts/shared', '@webview-ts/core'],
  },
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
