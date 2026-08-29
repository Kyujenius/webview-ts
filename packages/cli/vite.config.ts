import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/index.ts', '**/*.test.ts', '**/*.d.ts'],
    },
  },
  pack: [
    {
      entry: ['src/index.ts'],
      format: ['esm', 'cjs'],
      outExtensions: ({ format }) => ({ js: format === 'es' ? '.js' : '.cjs' }),
      dts: true,
      sourcemap: true,
      clean: true,
      treeshake: true,
      deps: {
        neverBundle: ['@webview-ts/shared', 'jiti', 'zod'],
      },
    },
    {
      entry: ['src/cli.ts'],
      format: ['esm'],
      outExtensions: () => ({ js: '.js' }),
      dts: false,
      sourcemap: true,
      clean: false,
      treeshake: true,
      deps: {
        neverBundle: ['@webview-ts/shared', 'jiti', 'zod'],
      },
    },
  ],
});
