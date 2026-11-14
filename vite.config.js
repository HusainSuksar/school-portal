// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { SCHOOL } from './src/config/school.js';

export default defineConfig({
  plugins: [
    react(),
    {
      // Fills the page title in index.html from src/config/school.js
      name: 'school-branding',
      transformIndexHtml: (html) => html.replace('%SCHOOL_APP_TITLE%', SCHOOL.appTitle),
    },
    VitePWA({
      strategies: 'injectManifest', // Tells Vite to use our custom sw.js
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        injectionPoint: undefined, // Prevents Workbox build errors
      },
      manifest: {
        name: SCHOOL.appTitle,
        short_name: SCHOOL.appShortName,
        description: SCHOOL.appDescription,
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
});