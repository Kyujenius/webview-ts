import path from 'path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/integration/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@webview-ts/react-native': path.resolve(
        __dirname,
        '../packages/frameworks/react-native/src'
      ),
      '@webview-ts/core': path.resolve(__dirname, '../packages/core/src'),
      '@webview-ts/shared': path.resolve(__dirname, '../packages/shared/src'),
      'react-native': path.resolve(__dirname, './__mocks__/react-native.ts'),
      'react-native-webview': path.resolve(__dirname, './__mocks__/react-native-webview.ts'),
      react: path.resolve(__dirname, './__mocks__/react.ts'),
    },
  },
});
