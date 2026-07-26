import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative assets keep the build compatible with both user and project GitHub Pages sites.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'فايبز | Vibes',
        short_name: 'Vibes',
        description: 'منصة فايبز للطلبات والولاء',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#3b1d2a',
        background_color: '#fff8f1',
        display: 'standalone',
        start_url: './#/login',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // No runtime API caching: Supabase data must stay fresh and authoritative.
        runtimeCaching: []
      }
    })
  ],
  build: {
    sourcemap: true,
    target: 'es2022'
  }
})
