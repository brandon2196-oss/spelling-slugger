import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Grand Slam Spelling',
        short_name: 'Grand Slam',
        description: 'A baseball game that runs on your weekly spelling words.',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        theme_color: '#142850',
        background_color: '#fdf8ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
          // Baked word clips are content-addressed and immutable: cache once, play offline later.
          { urlPattern: ({ url }) => url.pathname.startsWith('/audio/words/'), handler: 'CacheFirst', options: { cacheName: 'word-audio', expiration: { maxEntries: 600 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  // `VITE_STORE=api npm run dev` against `npm run dev:api` on :3000.
  server: { proxy: { '/api': 'http://localhost:3000', '/audio/words': 'http://localhost:3000' } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }, { name: 'pdf', test: /node_modules[\\/]pdfjs-dist/ }] },
      },
    },
  },
})
