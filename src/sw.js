/* Service worker da ForeverGold.
   Fase A/C: pré-cache do invólucro da app para abrir sem rede. Nunca guarda respostas do Supabase. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
