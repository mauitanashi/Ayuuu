import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

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
          'User-Agent': 'Auris/1.0 (Android; Mobile)',
        },
      },
      '/api-covers': {
        target: 'https://uploads.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-covers/, ''),
        headers: {
          'User-Agent': 'Auris/1.0 (Android; Mobile)',
        },
      },
    },
  },
})
