import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Import the React plugin
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'image-cache' }
          },
          {
            urlPattern: ({ url }) => url.origin === process.env.VITE_API_URL,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-cache' }
          }
        ]
      }
    })
  ],
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL) // Replace in service worker
  }
});
