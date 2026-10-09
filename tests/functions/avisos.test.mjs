import test from 'node:test';
import assert from 'node:assert/strict';
import { chat, cot, pub, decideFecho, avisoDeFecho } from '../../supabase/functions/_shared/avisos.ts';

test('textos iguais aos do feed()/notifySys() do protótipo', () => {
  assert.deepEqual(chat({ txt: 'Olá', urg: false }, 'Valbom'), { k: 'chat', title: 'Chat · Valbom', body: 'Olá', tag: 'fg-chat', vibrate: undefined, url: '/?ir=chat' });
  const u = chat({ txt: 'Fogo!', urg: true }, 'Oficina');
  assert.equal(u.title, 'Aviso urgente · Oficina'); assert.deepEqual(u.vibrate, [40, 60, 40]); assert.equal(u.tag, 'fg-urg');
  const c = cot({ dia: '2026-10-08', ouro_fino: 63400, ouro_usado: 58000, prata_fina: 850, prata_usada: 700, nota: 'Boa tarde' }, 'Filipe');
  assert.equal(c.title, 'Cotação diária');
  assert.equal(c.body.replace(/[\u00a0\u202f]/g, ' '), '08/10: Ouro fino 63 400,00 · lei 58 000,00 | Prata fina 850,00 · lei 700,00 €/kilo · Filipe. Boa tarde');
  const so = cot({ dia: '2026-10-09', ouro_fino: 64000, ouro_usado: null, prata_fina: null, prata_usada: null, nota: '' }, 'BU');
  assert.equal(so.body.replace(/[\u00a0\u202f]/g, ' '), '09/10: Ouro fino 64 000,00 · lei — €/kilo · BU');
  assert.equal(pub({ titulo: 'Campanha de Natal' }).body, 'Nova publicação: Campanha de Natal');
  assert.equal(pub({ titulo: '' }).body, 'Nova publicação: sem título');
});

const win = (m, st, ids, nomes, pts) => ({ m, st, ids, nomes, pts });
const ano = (ws, std) => ({ winners: Array.from({ length: 12 }, (_, i) => ws[i + 1] || win(i + 1, 'fora', [], [], 0)), std });

test('vencedora do mês: só meses fechados, nunca repete, empate, sem pontos não avisa', () => {
  const c = { 2026: ano({ 10: win(10, 'fechado', ['valbom'], ['Valbom'], 13.4505), 11: win(11, 'fechado', ['riotinto', 'arrifana'], ['Rio Tinto', 'Arrifana'], 9), 12: win(12, 'jogo', [], [], 0) }, []) };
  let r = decideFecho(c, { ano: 2026, mes: 12 }, new Set());
  assert.deepEqual(r.map((x) => [x.id, x.titulo, x.corpo]), [
    ['mes-2026-10', 'Vencedora de outubro', 'Valbom ganhou outubro com 13,5 pontos.'],
    ['mes-2026-11', 'Vencedora de novembro', 'Rio Tinto e Arrifana ganharam novembro com 9,0 pontos.']]);
  r = decideFecho(c, { ano: 2026, mes: 12 }, new Set(['mes-2026-10']));
  assert.deepEqual(r.map((x) => x.id), ['mes-2026-11']);
  const sem = { 2026: ano({ 10: win(10, 'fechado', [], [], 0) }, []) };
  const s = decideFecho(sem, { ano: 2026, mes: 11 }, new Set());
  assert.equal(s.length, 1); assert.equal(s[0].semVencedora, true, 'marca como tratado mas não envia');
  assert.deepEqual(decideFecho(c, { ano: 2026, mes: 10 }, new Set()), [], 'o mês em curso não fecha');
});

test('vencedora da temporada: no 1 de janeiro, com empate e com "Parabéns!"', () => {
  const std = [{ id: 'valbom', nome: 'Valbom', pts: 45.25 }, { id: 'riotinto', nome: 'Rio Tinto', pts: 40 }];
  const c = { 2026: ano({ 12: win(12, 'fechado', ['valbom'], ['Valbom'], 5) }, std), 2027: ano({}, []) };
  const r = decideFecho(c, { ano: 2027, mes: 1 }, new Set(['mes-2026-10', 'mes-2026-11']));
  const t = r.find((x) => x.tipo === 'temporada');
  assert.equal(t.titulo, 'Vencedora de 2026'); assert.equal(t.corpo, 'Valbom ganhou a temporada 2026 com 45,3 pontos. Parabéns!');
  assert.equal(r.find((x) => x.id === 'mes-2026-12').corpo, 'Valbom ganhou dezembro com 5,0 pontos.');
  const empate = { 2026: ano({}, [{ id: 'a', nome: 'Valbom', pts: 10 }, { id: 'b', nome: 'Arrifana', pts: 10 }]), 2027: ano({}, []) };
  assert.match(decideFecho(empate, { ano: 2027, mes: 1 }, new Set()).find((x) => x.tipo === 'temporada').corpo, /^Valbom e Arrifana ganharam a temporada 2026 com 10,0 pontos/);
  assert.deepEqual(avisoDeFecho(r[0]).url, '/?ir=lucro');
  assert.equal(decideFecho(c, { ano: 2027, mes: 6 }, new Set(['temporada-2026'])).some((x) => x.tipo === 'temporada'), false);
});
