import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' = gdy wgrasz nową wersję appki, service worker sam ją pobierze
      // w tle i podmieni przy następnym otwarciu — bez pytania użytkownika o zgodę.
      registerType: 'autoUpdate',

      // 'auto' = plugin sam wstrzykuje kod rejestrujący service workera do zbudowanego
      // index.html — nie trzeba nic dopisywać ręcznie w main.jsx.
      injectRegister: 'auto',

      // Pliki z public/, które mają wejść do "app shell" (dostępne od razu, offline).
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
        // Domyślnie Workbox przechwytuje tylko żądania GET — więc POST-y do /api/analyze,
        // /api/capsule/trip, /api/login itd. NIGDY nie są cache'owane, nawet bez dodatkowej
        // konfiguracji. To, co poniżej, dotyczy wyłącznie wybranych GET-ów.
        runtimeCaching: [
          {
            // Obrazki ubrań z Cloudinary — nie zmieniają się po dodaniu, więc długi cache.
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fitte-cloudinary-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dni
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Szafa i profil — pokaż natychmiast to, co znane z poprzedniej sesji,
            // a w tle odśwież. Świadomie WYKLUCZONE stąd: /api/capsule i /api/analyze
            // (zależą od aktualnej pogody, więc muszą być zawsze świeże, nigdy z cache).
            urlPattern: /\/api\/(wardrobe|profile|history)(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fitte-user-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 dzień — czysto bezpiecznikowy limit, i tak odświeżane w tle
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        // Service worker NIE działa pod `npm run dev` — celowo wyłączone, żeby nie
        // dawało fałszywego poczucia "już działa" podczas zwykłej pracy nad kodem.
        // Testować przez: npm run build && npm run preview
        enabled: false,
      },
    }),
  ],
})