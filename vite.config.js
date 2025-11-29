import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Base public path - './' works for GitHub Pages
  base: './',
  
  // React plugin for proper JSX handling
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  
  // Preview server (for testing production build)
  preview: {
    port: 4173,
    open: true
  },
  
  // Environment variables prefix
  envPrefix: 'VITE_'
});