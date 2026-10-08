import test from 'node:test';
import assert from 'node:assert/strict';
import { instalaPush } from '../../src/push/handlers.js';

function falso(janelas) {
  const ouvintes = {}, mostradas = [], abertas = [];
  const sw = {
    location: { origin: 'https://forevergold.app' },
    addEventListener: (n, f) => { ouvintes[n] = f; },
    clients: { matchAll: async () => janelas, openWindow: async (u) => { abertas.push(u); } },
    registration: { showNotification: async (t, o) => { mostradas.push([t, o]); } }
  };
  instalaPush(sw);
  const dispara = async (nome, ev) => { let p; ev.waitUntil = (x) => { p = x; }; ouvintes[nome](ev); await p; };
  return { dispara, mostradas, abertas };
}
const push = (o) => ({ data: { json: () => o, text: () => JSON.stringify(o) } });

test('push com a app escondida mostra a notificação com título, corpo, tag e vibração', async () => {
  const f = falso([{ visibilityState: 'hidden' }]);
  await f.dispara('push', push({ title: 'Aviso urgente · Oficina', body: 'Balança avariada', tag: 'fg-urg', vibrate: [40, 60, 40], url: '/?ir=chat', k: 'urg' }));
  assert.equal(f.mostradas.length, 1);
  const [t, o] = f.mostradas[0];
  assert.equal(t, 'Aviso urgente · Oficina'); assert.equal(o.body, 'Balança avariada'); assert.equal(o.tag, 'fg-urg'); assert.deepEqual(o.vibrate, [40, 60, 40]); assert.equal(o.renotify, true); assert.equal(o.data.url, '/?ir=chat');
});

test('push com a app à vista não mostra nada (o banner dentro da app trata)', async () => {
  const f = falso([{ visibilityState: 'visible' }]);
  await f.dispara('push', push({ title: 'Chat · Filipe', body: 'Olá' }));
  assert.equal(f.mostradas.length, 0);
});

test('clicar numa notificação: abre a app no separador certo (ou foca a janela e diz-lhe para onde ir)', async () => {
  const f = falso([]);
  await f.dispara('notificationclick', { notification: { close() {}, data: { url: '/?ir=cot' } } });
  assert.deepEqual(f.abertas, ['https://forevergold.app/?ir=cot']);
  const msgs = [];
  const g = falso([{ focus: async () => {}, postMessage: (m) => msgs.push(m), visibilityState: 'hidden' }]);
  await g.dispara('notificationclick', { notification: { close() {}, data: { url: '/?ir=lucro' } } });
  assert.deepEqual(msgs, [{ tipo: 'ir', k: 'lucro' }]); assert.equal(g.abertas.length, 0);
});

test('push sem dados não rebenta', async () => {
  const f = falso([]);
  await f.dispara('push', { data: null });
  assert.equal(f.mostradas[0][0], 'ForeverGold');
});
