import test, { before, after } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { arranca } from './stack.mjs';
import { criaRepo } from '../../src/data/repo.js';
import { rel } from '../../src/data/mapper.js';

const TEM = fs.existsSync(process.env.POSTGREST || '/tmp/pgrst/postgrest');
let S;
before(async () => { if (TEM) S = await arranca('fg_e2e'); });
after(async () => { if (S) await S.parar(); });

const removidos = [];
const mediaFalsa = { remover: async (bucket, paths) => { removidos.push([bucket, ...paths]); } };
function repoDe(conta, tipo = 'loja', loja = null) {
  const reg = { fotos: {}, pubs: {} };
  const r = criaRepo(S.cliente(conta), mediaFalsa, reg);
  r.definirConta(conta ? { id: conta, tipo, loja } : null);
  return { r, reg };
}
const val = repoDe.bind(null, 'forevervalbom', 'loja', 'valbom');
const bu = () => repoDe('foreverbu', 'equipa');
const cliente = () => { const x = repoDe(null); x.r.definirConta({ id: 'cliente', tipo: 'cliente' }); return x; };

const t = (nome, fn) => test(nome, { skip: !TEM && 'PostgREST não está instalado (ver README)' }, fn);
t('cliente carrega só lojas e peças; formas iguais ao protótipo', async () => {
  const { r } = cliente();
  const d = await r.carregar();
  assert.equal(Object.keys(d.lojas).length, 5);
  assert.equal(d.lojas.valbom.nome, 'Valbom');
  assert.equal(d.pecas.length, 16);
  assert.deepEqual(d.chat, []);
  assert.equal(d.class, null);
  const p = d.pecas.find((x) => x.id === 'pex7');
  assert.equal(p.preco, null); assert.equal(p.peso, null); assert.equal(p.ex, true); assert.equal(typeof p.at, 'number');
});

t('equipa carrega tudo (chat, cotações por data, publicidade, vistos, classificação)', async () => {
  const { r } = val();
  const d = await r.carregar();
  assert.equal(d.chat.length, 3); assert.equal(d.chat[0].by, 'foreverfilipe');
  const ks = Object.keys(d.cot); assert.equal(ks.length, 12); assert.match(ks[0], /^\d{4}-\d{2}-\d{2}$/);
  const c = d.cot[ks[0]]; assert.ok(c.of > 50000 && c.ou < c.of && c.pf < 1000 && c.pu < c.pf, JSON.stringify(c));
  assert.equal(d.pub.length, 1); assert.equal(d.pub[0].media, null); assert.deepEqual(d.pub[0].partilhas, {});
  assert.deepEqual(Object.keys(d.seen.forevervalbom).sort(), ['chat', 'cot', 'lucro', 'pub']);
  assert.ok(d.class['2026'].std.length === 5 && Array.isArray(d.class['2026'].winners));
  assert.ok(Math.abs(rel.skew) < 5000, 'desacerto do relógio local ~0: ' + rel.skew);
});

t('peças: criar com fotos, editar (remover foto), estado, apagar; só da própria loja', async () => {
  const { r } = val();
  await r.pecas.upsert({ id: 'pe1', loja: 'valbom', cat: 'brincos', titulo: 'Brincos de teste', preco: 1234.56, mat: 'Prata 925', peso: 3.2, estado: 'disponivel', fotos: [{ id: 'fa', path: 'valbom/pe1/fa.jpg' }, { id: 'fb', path: 'valbom/pe1/fb.jpg' }] });
  let d = await r.carregar();
  let p = d.pecas.find((x) => x.id === 'pe1');
  assert.deepEqual(p.fotos, ['fa', 'fb']); assert.equal(p.preco, 1234.56);
  await r.pecas.upsert({ id: 'pe1', loja: 'valbom', cat: 'brincos', titulo: 'Brincos de teste 2', preco: null, mat: 'Prata 925', peso: null, estado: 'reservada', fotos: [{ id: 'fb', path: 'valbom/pe1/fb.jpg' }, { id: 'fc', path: 'valbom/pe1/fc.jpg' }] });
  assert.deepEqual(removidos.pop(), ['pecas', 'valbom/pe1/fa.jpg']);
  d = await r.carregar(); p = d.pecas.find((x) => x.id === 'pe1');
  assert.deepEqual(p.fotos, ['fb', 'fc']); assert.equal(p.preco, null); assert.equal(p.estado, 'reservada'); assert.ok(p.upd);
  await r.pecas.setEstado('pe1', 'vendida');
  assert.equal((await r.carregar()).pecas.find((x) => x.id === 'pe1').estado, 'vendida');
  await assert.rejects(() => r.pecas.upsert({ id: 'pe2', loja: 'riotinto', cat: 'aneis', titulo: 'Intruso', preco: 1, mat: 'Aço', peso: null, estado: 'disponivel', fotos: [] }), /row-level security/);
  await assert.rejects(() => r.pecas.upsert({ id: 'pex0', loja: 'valbom', cat: 'aneis', titulo: 'Sobrepor', preco: 1, mat: 'Aço', peso: null, estado: 'disponivel', fotos: [] }).then(() => r.pecas.upsert({ id: 'pex4', loja: 'valbom', cat: 'aneis', titulo: 'Roubar peça de outra loja', preco: 1, mat: 'Aço', peso: null, estado: 'disponivel', fotos: [] })), /row-level security/);
  await r.pecas.remove('pe1');
  assert.deepEqual(removidos.pop(), ['pecas', 'valbom/pe1/fb.jpg', 'valbom/pe1/fc.jpg']);
  assert.equal((await r.carregar()).pecas.find((x) => x.id === 'pe1'), undefined);
  await assert.rejects(() => r.pecas.remove('pex4'), /permissão|encontrada/);
});

t('loja: editar informação; chat; cotação nova e corrigida; vistos', async () => {
  const { r } = val();
  await r.lojas.updateInfo('valbom', { morada: 'Rua Nova, 1, Valbom', horario: '9h', tel: '220180168', whats: '932656581', email: 'a@b.pt' });
  assert.equal((await r.carregar()).lojas.valbom.morada, 'Rua Nova, 1, Valbom');
  await r.chat.send({ id: 'cx1', txt: 'Olá equipa', urg: true });
  let d = await r.carregar();
  const m = d.chat.find((x) => x.id === 'cx1'); assert.equal(m.by, 'forevervalbom'); assert.equal(m.urg, true);
  assert.ok(Math.abs(m.at - Date.now()) < 5000, 'hora do servidor convertida para o relógio local');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  await r.cot.set(hoje, { of: 63400, ou: 58000, pf: 850, pu: 700, nota: 'n' });
  d = await r.carregar(); assert.equal(d.cot[hoje].edit, false); assert.equal(d.cot[hoje].of, 63400);
  await r.cot.set(hoje, { of: 64000, ou: null, pf: null, pu: null, nota: '' });
  d = await r.carregar(); assert.equal(d.cot[hoje].edit, true); assert.equal(d.cot[hoje].ou, null); assert.equal(d.cot[hoje].of, 64000);
  await assert.rejects(() => r.cot.set('2999-01-01', { of: 100 }), /futuro/);
  await r.vistos.mark(['chat', 'cot']);
  d = await r.carregar(); assert.ok(Math.abs(d.seen.forevervalbom.chat - Date.now()) < 5000);
});

t('lucro: regista, corrige e a classificação (SQL) reflete; outras contas não registam', async () => {
  const { r } = val();
  const n = new Date(), y = +n.toLocaleDateString('en', { timeZone: 'Europe/Lisbon', year: 'numeric' }), m = +n.toLocaleDateString('en', { timeZone: 'Europe/Lisbon', month: 'numeric' });
  await r.lucro.set(y, m, 12450.5);
  let d = await r.carregar();
  assert.equal(d.lucro[y].valbom[m].valor, 12450.5);
  const c = await r.classificacao();
  const v = c[String(y)].std.find((s) => s.id === 'valbom');
  assert.ok(Math.abs(v.lp - 12.4505) < 1e-9);
  await r.lucro.set(y, m, 13000);
  assert.equal((await r.carregar()).lucro[y].valbom[m].valor, 13000);
  await assert.rejects(() => bu().r.lucro.set(y, m, 1), /./);
  await assert.rejects(() => val().r.lucro.set(y, m === 1 ? 12 : m - 1, 1), /corrente/);
});

t('publicidade: BU cria com ficheiro, loja marca, apagar limpa o ficheiro', async () => {
  const B = bu();
  await B.r.pub.upsert({ id: 'pu1', titulo: 'Campanha de teste', texto: 'Texto #forevergold', media: { id: 'm1', tipo: 'imagem', nome: 'a.png', path: 'pu1/m1.png' } });
  let d = await B.r.carregar();
  const p = d.pub.find((x) => x.id === 'pu1');
  assert.deepEqual(p.media, { id: 'm1', tipo: 'imagem', nome: 'a.png' }); assert.equal(B.reg.pubs.m1.path, 'pu1/m1.png');
  await assert.rejects(() => val().r.pub.upsert({ id: 'pu2', titulo: 'Intruso', texto: 'x', media: null }), /row-level security/);
  const V = val();
  await V.r.pub.marcarPartilhada('pu1');
  d = await V.r.carregar(); assert.ok(d.pub.find((x) => x.id === 'pu1').partilhas.valbom > 0);
  await V.r.pub.desmarcarPartilhada('pu1');
  assert.deepEqual((await V.r.carregar()).pub.find((x) => x.id === 'pu1').partilhas, {});
  await B.r.pub.upsert({ id: 'pu1', titulo: 'Campanha editada', texto: 'Texto', media: null }, ['m1']);
  assert.deepEqual(removidos.pop(), ['pub', 'pu1/m1.png']);
  await B.r.pub.remove('pu1', null);
  assert.equal((await B.r.carregar()).pub.find((x) => x.id === 'pu1'), undefined);
});

t('apagar exemplos', async () => {
  const { r } = val();
  await r.ex.apagar();
  const d = await r.carregar();
  assert.equal(d.pecas.filter((x) => x.ex).length, 0); assert.equal(d.chat.filter((x) => x.ex).length, 0);
  assert.equal(Object.values(d.cot).filter((x) => x.ex).length, 0); assert.equal(d.pub.filter((x) => x.ex).length, 0);
});

t('estado das contas (ecrã de entrada): anónimo vê só booleanos', async () => {
  const { r } = cliente();
  const e = await r.estadoContas();
  assert.equal(e.length, 8); assert.deepEqual(Object.keys(e[0]).sort(), ['bloqueado_ate', 'conta', 'tem_pin']);
});
