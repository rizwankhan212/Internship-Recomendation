import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Optional: proxy API calls to avoid CORS during dev
      // '/api': { target: 'http://localhost:5000', changeOrigin: true }
    },
  },
});
