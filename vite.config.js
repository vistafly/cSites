import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './',  // Keep this as-is for GitHub Pages
  
  plugins: [react()],
  
  server: {
    port: 3000,
    open: true,
    host: true,
    fs: {
      strict: false
    }
  },

  appType: 'mpa',
  
  build: {
  outDir: 'dist',
  assetsDir: 'assets',
  sourcemap: false,
  minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        agreement: resolve(__dirname, 'agreement/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
      },
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  
  preview: {
    port: 4173,
    open: true
  },
  
  envPrefix: 'VITE_'
});