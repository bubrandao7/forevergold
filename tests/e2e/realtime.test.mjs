import test from 'node:test';
import assert from 'node:assert/strict';
import { aplica } from '../../src/data/realtime.js';
import { rel } from '../../src/data/mapper.js';

const vazio = () => ({ lojas: {}, pecas: [], chat: [], cot: {}, lucro: {}, pub: [], seen: {}, pins: {}, class: null });
const reg = () => ({ fotos: {}, pubs: {} });

test('tempo real: chat, cotação e lucro entram e saem do ecrã', () => {
  rel.skew = 1000; // servidor 1 s à frente
  const d = vazio(), r = reg();
  aplica(d, r, 'chat', 'INSERT', { id: 'c1', autor: 'foreverbu', at: '2026-10-08T12:00:00Z', txt: 'Olá', urg: true, ex: false });
  aplica(d, r, 'chat', 'INSERT', { id: 'c0', autor: 'foreverbu', at: '2026-10-08T11:00:00Z', txt: 'Antes', urg: false, ex: false });
  assert.deepEqual(d.chat.map((m) => m.id), ['c0', 'c1'], 'ordenado por hora');
  assert.equal(d.chat[1].at, Date.parse('2026-10-08T12:00:00Z') - 1000, 'convertido para o relógio local');
  aplica(d, r, 'chat', 'INSERT', { id: 'c1', autor: 'foreverbu', at: '2026-10-08T12:00:00Z', txt: 'Olá!', urg: true, ex: false });
  assert.equal(d.chat.length, 2); assert.equal(d.chat[1].txt, 'Olá!', 'o mesmo id substitui (eco da própria mensagem)');
  aplica(d, r, 'cotacoes', 'INSERT', { dia: '2026-10-08', ouro_fino: '63400.00', ouro_usado: null, prata_fina: 850, prata_usada: null, nota: '', autor: 'foreverfilipe', at: '2026-10-08T09:00:00Z', edit: false, ex: false });
  assert.equal(d.cot['2026-10-08'].of, 63400); assert.equal(d.cot['2026-10-08'].ou, null);
  aplica(d, r, 'cotacoes', 'DELETE', null, { dia: '2026-10-08' });
  assert.deepEqual(d.cot, {});
  aplica(d, r, 'lucro', 'INSERT', { ano: 2026, mes: 10, loja: 'valbom', valor: 1000, autor: 'forevervalbom', at: '2026-10-08T10:00:00Z' });
  assert.equal(d.lucro[2026].valbom[10].valor, 1000);
  aplica(d, r, 'lucro', 'DELETE', null, { ano: 2026, mes: 10, loja: 'valbom' });
  assert.equal(d.lucro[2026].valbom[10], undefined);
});

test('tempo real: peças, fotos ordenadas e partilhas', () => {
  const d = vazio(), r = reg();
  aplica(d, r, 'pecas', 'INSERT', { id: 'p1', loja: 'valbom', cat: 'aneis', titulo: 'Anel', preco: 10, mat: 'Aço', peso: null, estado: 'disponivel', ex: false, at: '2026-10-08T10:00:00Z', upd: null });
  aplica(d, r, 'peca_fotos', 'INSERT', { id: 'f2', peca: 'p1', pos: 1, path: 'valbom/p1/f2.jpg' });
  aplica(d, r, 'peca_fotos', 'INSERT', { id: 'f1', peca: 'p1', pos: 0, path: 'valbom/p1/f1.jpg' });
  assert.deepEqual(d.pecas[0].fotos, ['f1', 'f2']); assert.equal(r.fotos.f1.path, 'valbom/p1/f1.jpg');
  aplica(d, r, 'pecas', 'UPDATE', { id: 'p1', loja: 'valbom', cat: 'aneis', titulo: 'Anel 2', preco: 11, mat: 'Aço', peso: null, estado: 'vendida', ex: false, at: '2026-10-08T10:00:00Z', upd: '2026-10-08T11:00:00Z' });
  assert.equal(d.pecas[0].estado, 'vendida'); assert.deepEqual(d.pecas[0].fotos, ['f1', 'f2'], 'as fotos mantêm-se');
  aplica(d, r, 'peca_fotos', 'DELETE', null, { id: 'f1' });
  assert.deepEqual(d.pecas[0].fotos, ['f2']);
  aplica(d, r, 'pecas', 'DELETE', null, { id: 'p1' });
  assert.equal(d.pecas.length, 0);

  aplica(d, r, 'pub', 'INSERT', { id: 'u1', autor: 'foreverbu', at: '2026-10-08T10:00:00Z', titulo: 'T', texto: 'x', media_tipo: 'imagem', media_id: 'm1', media_nome: 'a.png', media_path: 'u1/m1.png', ex: false });
  assert.equal(r.pubs.m1.path, 'u1/m1.png'); assert.deepEqual(d.pub[0].media, { id: 'm1', tipo: 'imagem', nome: 'a.png' });
  aplica(d, r, 'pub_partilhas', 'INSERT', { pub: 'u1', loja: 'riotinto', conta: 'foreverriotinto', at: '2026-10-08T12:00:00Z' });
  assert.ok(d.pub[0].partilhas.riotinto > 0);
  aplica(d, r, 'pub_partilhas', 'DELETE', null, { pub: 'u1', loja: 'riotinto' });
  assert.deepEqual(d.pub[0].partilhas, {});
  aplica(d, r, 'vistos', 'UPDATE', { conta: 'forevervalbom', kind: 'chat', at: '2026-10-08T13:00:00Z' });
  assert.ok(d.seen.forevervalbom.chat > 0);
});
