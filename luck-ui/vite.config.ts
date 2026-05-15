import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    proxy: {
      '/admin': {
        target: 'http://172.16.0.162:8081',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://172.16.0.162:8082',
        changeOrigin: true,
      },
      '/core': {
        target: 'http://172.16.0.162:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
        },
      },
    },
  },
});
