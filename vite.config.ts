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
        name: "Cooper's Spelling Slugger",
        short_name: 'Slugger',
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
          { urlPattern: /^https:\/\/.*\.supabase\.co\//, handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }, { name: 'pdf', test: /node_modules[\\/]pdfjs-dist/ }] },
      },
    },
  },
})
