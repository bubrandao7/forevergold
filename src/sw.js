/* Service worker da ForeverGold.
   Fase A/C: pré-cache do invólucro da app para abrir sem rede. Nunca guarda respostas do Supabase. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

/* ---------- notificações push ---------- */
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'ForeverGold', body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    // com a app à vista, o banner dentro da app já avisa
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.title || 'ForeverGold', {
      body: d.body || '', tag: d.tag || 'fg', renotify: true, icon: '/icon-192.png', badge: '/favicon-32.png',
      vibrate: d.vibrate, data: { url: d.url || '/', k: d.k || '' }
    });
  })());
});

/* clicar abre a app no separador certo */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = new URL(data.url || '/', self.location.origin).href, ir = new URL(url).searchParams.get('ir');
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.focus(); w.postMessage({ tipo: 'ir', k: ir }); return; }
    }
    await self.clients.openWindow(url);
  })());
});
