import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({

      registerType: 'autoUpdate',
      injectRegister: 'auto',

      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],

      manifest: {
        name: 'Fitte — Twój AI Stylista',
        short_name: 'Fitte',
        description: 'Osobisty stylista AI — analizuje Twoją szafę i proponuje stylizacje dopasowane do pogody i okazji.',
        theme_color: '#3D2B1F',
        background_color: '#F8F5F2',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fitte-cloudinary-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, 
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
})