import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  // Common configurations for both 'serve' and 'build'
  const config = {
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };

  // Development-specific configurations
  if (command === 'serve') {
    config.server = {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    };
  }

  // Production-specific configurations for 'build'
  if (command === 'build') {
    config.base = '/hospital-website/'; 
  }

  return config;
});