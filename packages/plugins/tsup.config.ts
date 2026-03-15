import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'camera/index': 'src/camera/index.ts',
    'location/index': 'src/location/index.ts',
    'storage/index': 'src/storage/index.ts',
    'biometric/index': 'src/biometric/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react-native',
    '@ts-bridge/shared',
    '@ts-bridge/core',
  ],
});
