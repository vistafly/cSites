import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',  // Keep this as-is for GitHub Pages
  
  plugins: [react()],
  
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  build: {
  outDir: 'dist',
  assetsDir: 'assets',
  sourcemap: false,
  minify: 'esbuild',
    rollupOptions: {
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