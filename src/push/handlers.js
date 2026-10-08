/* Notificações push no service worker (sem imports, para se poder testar com um `self` de brincar). */
export function instalaPush(sw) {
  sw.addEventListener('push', (event) => {
    let d = {};
    try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'ForeverGold', body: event.data ? event.data.text() : '' }; }
    event.waitUntil((async () => {
      // com a app à vista, o banner dentro da app já avisa
      const wins = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (wins.some((w) => w.visibilityState === 'visible')) return;
      await sw.registration.showNotification(d.title || 'ForeverGold', {
        body: d.body || '', tag: d.tag || 'fg', renotify: true, icon: '/icon-192.png', badge: '/favicon-32.png',
        vibrate: d.vibrate, data: { url: d.url || '/', k: d.k || '' }
      });
    })());
  });

  /* clicar abre a app no separador certo */
  sw.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    const url = new URL(data.url || '/', sw.location.origin).href, ir = new URL(url).searchParams.get('ir');
    event.waitUntil((async () => {
      const wins = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if ('focus' in w) { await w.focus(); w.postMessage({ tipo: 'ir', k: ir }); return; }
      }
      await sw.clients.openWindow(url);
    })());
  });
}
