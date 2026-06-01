import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const adminProxyTarget = env.VITE_ADMIN_PROXY_TARGET || 'http://localhost:8081';
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8082';
  const coreProxyTarget = env.VITE_CORE_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 4200,
      proxy: {
        '/admin': {
          target: adminProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/core': {
          target: coreProxyTarget,
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
  };
});
