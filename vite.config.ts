import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app shows its own "update available" prompt (src/components/PwaStatus.tsx).
      registerType: 'prompt',
      injectRegister: false,
      // Icons are already matched by globPatterns below; avoid duplicate precache entries.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'Date Planner',
        short_name: 'Date Planner',
        description: 'Rencanakan kencan di Jakarta dan kota lain — rencana dan venue tersimpan di perangkatmu, bisa dipakai offline.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f1ea',
        theme_color: '#f6f1ea',
        categories: ['lifestyle', 'travel'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only: everything the app needs is bundled same-origin code and icons.
        // (the web manifest itself is added by the plugin)
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Client-side routes (e.g. /rencana/abc) load the cached shell when offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Deliberately no runtimeCaching: Google Maps and any third-party content
        // (e.g. venue images) are never cached by the service worker.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
