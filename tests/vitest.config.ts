import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['integration/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@ts-bridge/native': path.resolve(__dirname, '../packages/hosts/react-native/src'),
      '@ts-bridge/core': path.resolve(__dirname, '../packages/core/src'),
      '@ts-bridge/plugins': path.resolve(__dirname, '../packages/plugins/src'),
      '@ts-bridge/shared': path.resolve(__dirname, '../packages/shared/src'),
      'react-native': path.resolve(__dirname, './__mocks__/react-native.ts'),
      'react-native-webview': path.resolve(__dirname, './__mocks__/react-native-webview.ts'),
      react: path.resolve(__dirname, './__mocks__/react.ts'),
    },
  },
});
