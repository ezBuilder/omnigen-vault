import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const API = 'http://localhost:8787';

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@labels': path.resolve(__dirname, '../src/prompts/categoryLabels.js')
    }
  },
  server: {
    fs: { allow: ['..'] },
    proxy: {
      '/api': API,
      '/thumb': API,
      '/img': API,
      '/download': API
    }
  },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false }
});
