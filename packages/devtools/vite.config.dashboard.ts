import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src/dashboard',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../../dist/dashboard',
    emptyOutDir: true,
  },
});
