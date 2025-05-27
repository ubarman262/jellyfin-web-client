import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
      react(),

  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    cors: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 0, // Don't inline large media files (default is 4kb)
  },
});
