import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/index.ts', '**/dashboard/**', '**/server.ts', '**/*.test.ts', '**/*.d.ts'],
    },
  },
  pack: [
    {
      entry: { cli: 'src/server.ts' },
      format: ['esm'],
      outExtensions: () => ({ js: '.mjs' }),
      platform: 'node',
      banner: { js: '#!/usr/bin/env node' },
      sourcemap: false,
      clean: false,
      treeshake: true,
      deps: {
        neverBundle: ['ws'],
      },
    },
    {
      entry: { client: 'src/client/index.ts' },
      format: ['esm', 'cjs'],
      outExtensions: ({ format }) => ({ js: format === 'es' ? '.js' : '.cjs' }),
      dts: true,
      platform: 'browser',
      sourcemap: false,
      clean: false,
      treeshake: true,
      deps: {
        neverBundle: ['@webview-ts/shared'],
      },
    },
  ],
});
