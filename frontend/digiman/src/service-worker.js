// Import Workbox libraries (if using Workbox)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Precache static assets (e.g., CSS, JS, images)
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses for offline use
registerRoute(
  ({ url }) => url.origin === process.env.VITE_API_URL,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
  })
);

// Cache other assets (e.g., fonts)
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
  })
);