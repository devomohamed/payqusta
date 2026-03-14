import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BUILD_ID = process.env.VITE_BUILD_ID || new Date().toISOString();

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'fonts/*.ttf'],
      manifest: {
        name: 'PayQusta POS',
        short_name: 'PayQusta',
        description: 'نظام نقاط البيع الشامل',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        // Use existing favicon.svg to avoid missing icon files
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globIgnores: [
          '**/assets/vendor-hls-*.js',
          '**/assets/vendor-editor-*.js',
          '**/assets/vendor-capture-*.js',
          '**/assets/CamerasPage-*.js',
          '**/assets/BarcodeScanner-*.js',
        ],
        // EvenNode build was failing because one generated JS chunk is > 2 MiB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes max
              },
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    })
  ],
  server: {
    port: 5173,
    proxy: {
      // SSE notifications stream - special handling
      '/api/v1/notifications/stream': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: false,
        // Important for SSE
        headers: {
          'Accept': 'text/event-stream',
        },
      },
      // Regular API requests
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy static uploads
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('hls.js')) {
            return 'vendor-hls';
          }

          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('use-sync-external-store')
          ) {
            return 'vendor-react';
          }

          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'vendor-router';
          }

          if (
            id.includes('i18next') ||
            id.includes('react-i18next')
          ) {
            return 'vendor-i18n';
          }

          if (
            id.includes('recharts') ||
            id.includes('d3-') ||
            id.includes('internmap')
          ) {
            return 'vendor-charts';
          }

          if (id.includes('lucide-react') || id.includes('@heroicons')) {
            return 'vendor-icons';
          }

          if (
            id.includes('dexie') ||
            id.includes('zustand') ||
            id.includes('axios') ||
            id.includes('date-fns')
          ) {
            return 'vendor-data';
          }

          if (
            id.includes('@zxing') ||
            id.includes('html5-qrcode') ||
            id.includes('react-easy-crop')
          ) {
            return 'vendor-capture';
          }

          if (
            id.includes('framer-motion') ||
            id.includes('react-hot-toast')
          ) {
            return 'vendor-ui';
          }

          if (
            id.includes('react-quill') ||
            id.includes('/quill/') ||
            id.includes('\\quill\\') ||
            id.includes('quill-emoji')
          ) {
            return 'vendor-editor';
          }
        },
      },
    },
  },
});
