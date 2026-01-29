import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/save': 'http://localhost:3001',
      '/data': 'http://localhost:3001',
      // If images are served by the backend or need to be proxied if not found locally
      // But we will try to serve them via Vite public dir or backend proxy fallback
      '/img': 'http://localhost:3001',
      '/favicon.ico': 'http://localhost:3001'
    }
  }
});
