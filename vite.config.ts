import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/treasure-hunt/', // matches https://github.com/scizor666/treasure-hunt
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'assets/**/*'],
      manifest: {
        name: 'Treasure Hunt',
        short_name: 'Treasure Hunt',
        description: 'Help Rainbow Fish find treasures and dodge Mad Octopuses!',
        theme_color: '#1a4a6e',
        background_color: '#1a4a6e',
        display: 'standalone',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,svg,json,ico,woff2,mp3,wav}'],
        // Emit a single self-contained classic service worker (no separate
        // AMD-loaded workbox chunk) so the precache install handler is
        // registered synchronously and the cache actually populates.
        inlineWorkboxRuntime: true,
        navigateFallback: 'index.html',
        // Phaser bundles are large; raise the precache size limit.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [], // prefer full precache; no network-dependent routes in v1
      },
    }),
  ],
  server: {
    host: true,
  },
});
