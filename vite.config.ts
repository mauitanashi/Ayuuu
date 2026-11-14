import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const CLIENT_UA = 'Auris/1.0 (personal-client-4eb77cf5-46a6-4789-9305-73dd5d1290da-25f99f56)';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api-manga': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-manga/, ''),
        headers: {
          'User-Agent': CLIENT_UA,
        },
      },
      '/api-covers': {
        target: 'https://uploads.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-covers/, ''),
        headers: {
          'User-Agent': CLIENT_UA,
        },
      },
    },
  },
})
