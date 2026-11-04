import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

declare const process: { env: Record<string, string | undefined> };

/**
 * Public path the app is served from. "/" for Vercel or a custom domain;
 * GitHub Pages project sites build with DEPLOY_BASE=/<repo>/.
 */
const base = process.env.DEPLOY_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // The app shows its own "update available" prompt (src/components/PwaStatus.tsx).
      registerType: 'prompt',
      injectRegister: false,
      // Icons are already matched by globPatterns below; avoid duplicate precache entries.
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: 'A Day With Us',
        short_name: 'ADWU',
        description: 'A Day With Us — rencanain date manis di Jakarta dari tempat-tempat nyata. Semua tersimpan di perangkatmu dan bisa dipakai offline.',
        lang: 'id',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#fdf7f5',
        theme_color: '#fdf7f5',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Fonts: Indonesian needs Latin only; skip other scripts' subsets.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
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
