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
  {
    entry: { client: 'src/client/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    platform: 'browser',
    splitting: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    external: ['@webview-ts/shared'],
    esbuildOptions(options) {
      // Ship `process.env.NODE_ENV` verbatim: the CONSUMER's bundler must
      // decide dev vs production, not the machine this package was built on.
      // (platform: 'browser' would otherwise inline it at package build time,
      // compiling the production no-op guard in or out permanently.)
      options.define = {
        ...options.define,
        // Self-referential define: esbuild replaces the expression with itself,
        // overriding tsup's build-time inlining for platform: 'browser'.
        'process.env.NODE_ENV': 'process.env.NODE_ENV',
      };
    },
  },
]);
