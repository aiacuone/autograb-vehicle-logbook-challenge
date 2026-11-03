import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // In development the page and the API run on different ports, so Vite forwards /api to the server
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
