import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src',
        '@assets': path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@sections': path.resolve(__dirname, './src/sections'),
        '@data': path.resolve(__dirname, './src/data'),
      },
    },
  };

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

  if (command === 'build') {
    config.base = '/hospital-website/';
  }

  return config;
});