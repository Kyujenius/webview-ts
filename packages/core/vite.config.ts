import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/index.ts', '**/*.test.ts', '**/*.d.ts'],
    },
  },
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outExtensions: ({ format }) => ({ js: format === 'es' ? '.js' : '.cjs' }),
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    deps: {
      neverBundle: ['@webview-ts/shared'],
    },
    target: false,
  },
});
