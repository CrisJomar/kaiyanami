import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:5001';

  return {
    plugins: [react()],

    // Proxy /api calls to the backend in development so the browser never
    // makes cross-origin requests (avoids CORS issues during dev).
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      // Warn when a chunk is larger than 1 MB
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split large vendor bundles so the initial load is faster
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
            charts: ['chart.js', 'react-chartjs-2'],
          },
        },
      },
    },
  };
});
