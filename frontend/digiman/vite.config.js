import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // Import the React plugin
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig (({ mode}) => {
  // Load environment variables based on the current mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL;
  return {
    plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Digiman',
        short_name: 'Digiman',
        description: 'Read manga online with Digiman',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/apple-icon-180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: { cacheName: 'image-cache' }
            },
            {
              // RegExp gets inlined with the actual value — no process.env at runtime
              urlPattern: apiUrl ? new RegExp(`^${apiUrl}`) : /^$/,
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
};
});
