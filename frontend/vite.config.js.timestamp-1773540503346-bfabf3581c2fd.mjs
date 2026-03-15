// vite.config.js
import { defineConfig } from "file:///D:/New%20folder%20(3)/payqusta/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/New%20folder%20(3)/payqusta/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/New%20folder%20(3)/payqusta/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var BUILD_ID = process.env.VITE_BUILD_ID || (/* @__PURE__ */ new Date()).toISOString();
var vite_config_default = defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "fonts/*.ttf"],
      manifest: {
        name: "PayQusta POS",
        short_name: "PayQusta",
        description: "\u0646\u0638\u0627\u0645 \u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0634\u0627\u0645\u0644",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        // Use existing favicon.svg to avoid missing icon files
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globIgnores: [
          "**/assets/vendor-hls-*.js",
          "**/assets/vendor-editor-*.js",
          "**/assets/vendor-capture-*.js",
          "**/assets/CamerasPage-*.js",
          "**/assets/BarcodeScanner-*.js"
        ],
        // EvenNode build was failing because one generated JS chunk is > 2 MiB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
                // 5 minutes max
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
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
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: "module"
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      // SSE notifications stream - special handling
      "/api/v1/notifications/stream": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: false,
        // Important for SSE
        headers: {
          "Accept": "text/event-stream"
        }
      },
      // Regular API requests
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false
      },
      // Proxy static uploads
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("hls.js")) {
            return "vendor-hls";
          }
          if (id.includes("/react/") || id.includes("\\react\\") || id.includes("react-dom") || id.includes("scheduler") || id.includes("use-sync-external-store")) {
            return "vendor-react";
          }
          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "vendor-router";
          }
          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }
          if (id.includes("recharts") || id.includes("d3-") || id.includes("internmap")) {
            return "vendor-charts";
          }
          if (id.includes("lucide-react") || id.includes("@heroicons")) {
            return "vendor-icons";
          }
          if (id.includes("dexie") || id.includes("zustand") || id.includes("axios") || id.includes("date-fns")) {
            return "vendor-data";
          }
          if (id.includes("@zxing") || id.includes("html5-qrcode") || id.includes("react-easy-crop")) {
            return "vendor-capture";
          }
          if (id.includes("framer-motion") || id.includes("react-hot-toast")) {
            return "vendor-ui";
          }
          if (id.includes("react-quill") || id.includes("/quill/") || id.includes("\\quill\\") || id.includes("quill-emoji")) {
            return "vendor-editor";
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXcgZm9sZGVyICgzKVxcXFxwYXlxdXN0YVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcTmV3IGZvbGRlciAoMylcXFxccGF5cXVzdGFcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L05ldyUyMGZvbGRlciUyMCgzKS9wYXlxdXN0YS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuXG5jb25zdCBCVUlMRF9JRCA9IHByb2Nlc3MuZW52LlZJVEVfQlVJTERfSUQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBkZWZpbmU6IHtcbiAgICBfX0FQUF9CVUlMRF9JRF9fOiBKU09OLnN0cmluZ2lmeShCVUlMRF9JRCksXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uc3ZnJywgJ3JvYm90cy50eHQnLCAnZm9udHMvKi50dGYnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdQYXlRdXN0YSBQT1MnLFxuICAgICAgICBzaG9ydF9uYW1lOiAnUGF5UXVzdGEnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1x1MDY0Nlx1MDYzOFx1MDYyN1x1MDY0NSBcdTA2NDZcdTA2NDJcdTA2MjdcdTA2MzcgXHUwNjI3XHUwNjQ0XHUwNjI4XHUwNjRBXHUwNjM5IFx1MDYyN1x1MDY0NFx1MDYzNFx1MDYyN1x1MDY0NVx1MDY0NCcsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzNiODJmNicsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0LXByaW1hcnknLFxuICAgICAgICAvLyBVc2UgZXhpc3RpbmcgZmF2aWNvbi5zdmcgdG8gYXZvaWQgbWlzc2luZyBpY29uIGZpbGVzXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnZmF2aWNvbi5zdmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICdhbnknLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgZ2xvYklnbm9yZXM6IFtcbiAgICAgICAgICAnKiovYXNzZXRzL3ZlbmRvci1obHMtKi5qcycsXG4gICAgICAgICAgJyoqL2Fzc2V0cy92ZW5kb3ItZWRpdG9yLSouanMnLFxuICAgICAgICAgICcqKi9hc3NldHMvdmVuZG9yLWNhcHR1cmUtKi5qcycsXG4gICAgICAgICAgJyoqL2Fzc2V0cy9DYW1lcmFzUGFnZS0qLmpzJyxcbiAgICAgICAgICAnKiovYXNzZXRzL0JhcmNvZGVTY2FubmVyLSouanMnLFxuICAgICAgICBdLFxuICAgICAgICAvLyBFdmVuTm9kZSBidWlsZCB3YXMgZmFpbGluZyBiZWNhdXNlIG9uZSBnZW5lcmF0ZWQgSlMgY2h1bmsgaXMgPiAyIE1pQi5cbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDQgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXlxcL2FwaVxcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya0ZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnYXBpLWNhY2hlJyxcbiAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiAxMCxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNSwgLy8gNSBtaW51dGVzIG1heFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nb29nbGVhcGlzXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ3N0YXRpY1xcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dzdGF0aWMtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdHlwZTogJ21vZHVsZScsXG4gICAgICB9LFxuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgIC8vIFNTRSBub3RpZmljYXRpb25zIHN0cmVhbSAtIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICcvYXBpL3YxL25vdGlmaWNhdGlvbnMvc3RyZWFtJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIHdzOiBmYWxzZSxcbiAgICAgICAgLy8gSW1wb3J0YW50IGZvciBTU0VcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdBY2NlcHQnOiAndGV4dC9ldmVudC1zdHJlYW0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8vIFJlZ3VsYXIgQVBJIHJlcXVlc3RzXG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo1MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IHN0YXRpYyB1cGxvYWRzXG4gICAgICAnL3VwbG9hZHMnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6NTAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdobHMuanMnKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItaGxzJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnL3JlYWN0LycpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnXFxcXHJlYWN0XFxcXCcpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdzY2hlZHVsZXInKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3VzZS1zeW5jLWV4dGVybmFsLXN0b3JlJylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJlYWN0JztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpIHx8IGlkLmluY2x1ZGVzKCdAcmVtaXgtcnVuJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLXJvdXRlcic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2kxOG5leHQnKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlYWN0LWkxOG5leHQnKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItaTE4bic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdkMy0nKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2ludGVybm1hcCcpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1jaGFydHMnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ0BoZXJvaWNvbnMnKSkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItaWNvbnMnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdkZXhpZScpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnenVzdGFuZCcpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnYXhpb3MnKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2RhdGUtZm5zJylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWRhdGEnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdAenhpbmcnKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2h0bWw1LXFyY29kZScpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3QtZWFzeS1jcm9wJylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWNhcHR1cmUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdmcmFtZXItbW90aW9uJykgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdyZWFjdC1ob3QtdG9hc3QnKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItdWknO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdyZWFjdC1xdWlsbCcpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnL3F1aWxsLycpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygnXFxcXHF1aWxsXFxcXCcpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcygncXVpbGwtZW1vamknKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItZWRpdG9yJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVMsU0FBUyxvQkFBb0I7QUFDcFUsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFNLFdBQVcsUUFBUSxJ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Q1IsYUFBYTtBQUFBLElBQ2IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFFbEMsY0FBSSxHQUFHLFNBQVMsUUFBUSxHQUFHO0FBQ3pCLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQ0UsR0FBRyxTQUFTLFNBQVMsS0FDckIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLHlCQUF5QixHQUNyQztBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLGNBQWMsS0FBSyxHQUFHLFNBQVMsWUFBWSxHQUFHO0FBQzVELG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQ0UsR0FBRyxTQUFTLFNBQVMsS0FDckIsR0FBRyxTQUFTLGVBQWUsR0FDM0I7QUFDQSxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUNFLEdBQUcsU0FBUyxVQUFVLEtBQ3RCLEdBQUcsU0FBUyxLQUFLLEtBQ2pCLEdBQUcsU0FBUyxXQUFXLEdBQ3ZCO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsY0FBYyxLQUFLLEdBQUcsU0FBUyxZQUFZLEdBQUc7QUFDNUQsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FDRSxHQUFHLFNBQVMsT0FBTyxLQUNuQixHQUFHLFNBQVMsU0FBUyxLQUNyQixHQUFHLFNBQVMsT0FBTyxLQUNuQixHQUFHLFNBQVMsVUFBVSxHQUN0QjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQ0UsR0FBRyxTQUFTLFFBQVEsS0FDcEIsR0FBRyxTQUFTLGNBQWMsS0FDMUIsR0FBRyxTQUFTLGlCQUFpQixHQUM3QjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQ0UsR0FBRyxTQUFTLGVBQWUsS0FDM0IsR0FBRyxTQUFTLGlCQUFpQixHQUM3QjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQ0UsR0FBRyxTQUFTLGFBQWEsS0FDekIsR0FBRyxTQUFTLFNBQVMsS0FDckIsR0FBRyxTQUFTLFdBQVcsS0FDdkIsR0FBRyxTQUFTLGFBQWEsR0FDekI7QUFDQSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
