import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',

  server: {
    port: 5173,
    open: true,
    // Proxy API calls to the Flask backend during development
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        // Enable streaming for commentary endpoint
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
            }
          });
        },
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Vendor chunk splitting for heavy libraries
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Split services into their own chunk for cacheability
          if (id.includes('src/services/')) {
            return 'services';
          }
          if (id.includes('src/data/')) {
            return 'data';
          }
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: 'es2022',
    // Asset size warnings
    chunkSizeWarningLimit: 500,
  },

  // Vitest configuration
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/services/**'],
    },
  },
});
