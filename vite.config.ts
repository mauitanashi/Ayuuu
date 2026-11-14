import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import http from 'http'
import https from 'https'
import { URL } from 'url'

const CLIENT_UA = 'Ayuuu/1.0 (personal-client-4eb77cf5-46a6-4789-9305-73dd5d1290da-25f99f56)';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'image-proxy-middleware',
      configureServer(server) {
        server.middlewares.use('/proxy-img', (req, res) => {
          const parsed = new URL(req.url || '', 'http://localhost');
          const targetUrl = parsed.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }

          const target = new URL(targetUrl);
          const client = target.protocol === 'https:' ? https : http;

          const proxyReq = client.request(
            target,
            {
              headers: {
                'Referer': target.host.includes('readdetectiveconan') ? 'https://mangapill.com/' : 'https://mangadex.org/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, {
                'Content-Type': proxyRes.headers['content-type'] || 'image/jpeg',
                'Access-Control-Allow-Origin': '*',
              });
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', (err) => {
            res.statusCode = 502;
            res.end(err.message);
          });

          proxyReq.end();
        });
      },
    },
  ],
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
      '/api-alt': {
        target: 'https://mangapill.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-alt/, ''),
        headers: {
          'Referer': 'https://mangapill.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    },
  },
})
