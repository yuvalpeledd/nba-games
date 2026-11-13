import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web-app',
  server: {
    port: 4200,
    host: 'localhost',
    // nx serve frontend-api.
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: { port: 4300, host: 'localhost' },
  plugins: [react()],
  resolve: { tsconfigPaths: true }, // @nba/* aliases from tsconfig.base.json
  build: {
    outDir: '../../dist/apps/web-app',
    emptyOutDir: true,
    reportCompressedSize: true,
  },
}));
