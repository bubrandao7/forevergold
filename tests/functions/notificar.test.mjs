/* A Edge Function `notificar` a sério (Deno), com o envio de push substituído por um registo em ficheiro. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { arranca, jwt } from '../e2e/stack.mjs';

const DENO = process.env.DENO || '/tmp/denobin/deno';
const TEM = fs.existsSync(DENO) && fs.existsSync(process.env.POSTGREST || '/tmp/pgrst/postgrest');
const t = (nome, fn) => test(nome, { skip: !TEM && 'Deno/PostgREST não instalados (ver README)' }, fn);
const LOG = '/tmp/fg-push-stub.log', PORTA = 8795;
let S, pr;

before(async () => {
  if (!TEM) return;
  S = await arranca('fg_notificar', { porta: 3131, portaPg: 3130 });
  const tmp = '/tmp/fn-notificar-run'; fs.rmSync(tmp, { recursive: true, force: true });
  fs.cpSync(path.resolve(import.meta.dirname, '../../supabase/functions'), tmp, { recursive: true });
  fs.cpSync(path.resolve(import.meta.dirname, 'stubs'), tmp + '/stubs', { recursive: true });
  fs.writeFileSync(LOG, '');
  pr = spawn(DENO, ['run', '-A', '--no-lock', '--import-map', tmp + '/stubs/import-map.json', '--preload', tmp + '/stubs/relogio.ts', tmp + '/notificar/index.ts'], { env: { ...process.env, DENO_SERVE_ADDRESS: `tcp:127.0.0.1:${PORTA}`, SUPABASE_URL: 'http://127.0.0.1:3131', SUPABASE_ANON_KEY: jwt({ role: 'anon' }), SUPABASE_SERVICE_ROLE_KEY: jwt({ role: 'service_role' }), NOTIFICAR_SEGREDO: 'segredo-de-teste', PUSH_STUB_FICHEIRO: LOG, FG_TESTE_AGORA: '2027-01-02T10:00:00Z', VAPID_PUBLIC_KEY: 'x', VAPID_PRIVATE_KEY: 'y' }, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { await fetch(`http://127.0.0.1:${PORTA}/`, { method: 'OPTIONS' }); break; } catch (e) { await new Promise((r) => setTimeout(r, 300)); } }
  // um ou dois telemóveis por conta (e um morto)
  for (const c of ['forevervalbom', 'foreverbu', 'foreverfilipe', 'foreveroficina', 'foreverriotinto']) await S.base.c.query("insert into public.push_subs (conta, endpoint, p256dh, auth) values ($1, $2, 'k', 'a')", [c, `https://push.exemplo/${c}`]);
  await S.base.c.query("insert into public.push_subs (conta, endpoint, p256dh, auth) values ('forevervalbom', 'https://push.exemplo/morta', 'k', 'a')");
});
after(async () => { if (pr) pr.kill(); if (S) await S.parar(); });

const chama = async (corpo, segredo = 'segredo-de-teste') => (await fetch(`http://127.0.0.1:${PORTA}/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-notificar-segredo': segredo }, body: JSON.stringify(corpo) })).json().catch(() => ({}));
const envios = () => fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const limpa = () => fs.writeFileSync(LOG, '');
const para = (e) => e.map((x) => x.endpoint.split('/').pop()).sort();

t('sem o segredo, nada se envia', async () => {
  const r = await fetch(`http://127.0.0.1:${PORTA}/`, { method: 'POST', headers: { 'x-notificar-segredo': 'errado' }, body: '{"tipo":"chat","id":"cex1"}' });
  assert.equal(r.status, 401); assert.equal(envios().length, 0);
});

t('chat normal: toda a equipa menos o autor; título "Chat · Nome"', async () => {
  await S.base.c.query("insert into public.chat (id, autor, txt, urg) values ('n1', 'foreverfilipe', 'Boa tarde a todos', false)");
  await chama({ tipo: 'chat', id: 'n1' });
  const e = envios();
  assert.deepEqual(para(e), ['foreverbu', 'foreveroficina', 'forevervalbom', 'foreverriotinto'].sort());
  assert.equal(e[0].corpo.title, 'Chat · Filipe'); assert.equal(e[0].corpo.body.replace(/[\u00a0\u202f]/g, ' '), 'Boa tarde a todos'); assert.equal(e[0].corpo.tag, 'fg-chat'); assert.equal(e[0].corpo.url, '/?ir=chat');
  assert.equal(e[0].corpo.vibrate, undefined);
});

t('chat urgente: título "Aviso urgente · Nome", vibração [40,60,40], urgência alta', async () => {
  limpa();
  await S.base.c.query("insert into public.chat (id, autor, txt, urg) values ('n2', 'foreveroficina', 'Balança avariada', true)");
  await chama({ tipo: 'chat', id: 'n2' });
  const e = envios();
  assert.ok(!para(e).includes('foreveroficina'));
  assert.equal(e[0].corpo.title, 'Aviso urgente · Oficina'); assert.deepEqual(e[0].corpo.vibrate, [40, 60, 40]); assert.equal(e[0].opts.urgency, 'high');
});

t('cotação: toda a equipa menos quem escreveu; texto igual ao do feed', async () => {
  limpa();
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  await S.base.c.query("insert into public.cotacoes (dia, ouro_fino, ouro_usado, prata_fina, prata_usada, nota, autor) values ($1, 63400, 58000, 850, 700, 'Boa venda', 'forevervalbom')", [hoje]);
  await chama({ tipo: 'cot', dia: hoje });
  const e = envios(); const [, mm, dd] = hoje.split('-');
  assert.ok(!para(e).includes('forevervalbom'));
  assert.equal(e[0].corpo.title, 'Cotação diária');
  assert.equal(e[0].corpo.body.replace(/[\u00a0\u202f]/g, ' '), `${dd}/${mm}: Ouro fino 63 400,00 · lei 58 000,00 | Prata fina 850,00 · lei 700,00 €/kg · Valbom. Boa venda`);
});

t('publicidade: toda a equipa menos a BU', async () => {
  limpa();
  await S.base.c.query("insert into public.pub (id, autor, titulo, texto) values ('np1', 'foreverbu', 'Campanha de Natal', 'x')");
  await chama({ tipo: 'pub', id: 'np1' });
  const e = envios();
  assert.ok(!para(e).includes('foreverbu')); assert.equal(e[0].corpo.title, 'Publicidade'); assert.equal(e[0].corpo.body.replace(/[\u00a0\u202f]/g, ' '), 'Nova publicação: Campanha de Natal');
});

t('subscrições mortas (410) são apagadas; clientes nunca têm subscrições', async () => {
  assert.equal((await S.base.c.query("select count(*)::int n from public.push_subs where endpoint like '%morta'")).rows[0].n, 0);
  assert.equal((await S.base.c.query("select count(*)::int n from public.push_subs where conta not in (select id from public.contas)")).rows[0].n, 0);
});

t('vencedoras: meses fechados e temporada anunciados uma só vez, com aviso na base e push a toda a equipa', async () => {
  limpa();
  const c = S.base.c;
  // "agora" simulado: 2 de janeiro de 2027 (a função e a classificação SQL usam esse instante só nesta base de teste)
  await c.query(`create or replace function public.fg_classificacao_servico() returns jsonb language sql stable security definer set search_path = public, fg, pg_temp as $$ select fg.classificacao('2027-01-02T10:00:00Z'::timestamptz) $$`);
  await c.query("set session_replication_role = replica");
  await c.query("delete from public.lucro");
  await c.query(`insert into public.lucro (ano, mes, loja, valor, autor) values
    (2026, 10, 'valbom', 12450.5, 'forevervalbom'), (2026, 11, 'riotinto', 9000, 'foreverriotinto'), (2026, 11, 'arrifana', 9000, 'foreverarrifana'),
    (2026, 12, 'valbom', 5000, 'forevervalbom')`);
  await c.query("set session_replication_role = origin");
  const r1 = await chama({ tipo: 'fecho' });
  assert.equal(r1.ok, true);
  const av = Object.fromEntries((await c.query('select id, titulo, corpo from public.avisos')).rows.map((r) => [r.id, r]));
  assert.equal(av['mes-2026-11'].corpo, 'Rio Tinto e Arrifana ganharam novembro com 9,0 pontos.');
  assert.equal(av['mes-2026-12'].titulo, 'Vencedora de dezembro');
  assert.equal(av['temporada-2026'].titulo, 'Vencedora de 2026');
  assert.equal(av['temporada-2026'].corpo, 'Valbom ganhou a temporada 2026 com 17,5 pontos. Parabéns!');
  const n1 = envios().length; assert.ok(n1 >= 5, 'enviou: ' + n1);
  assert.ok(envios().every((e) => e.corpo.tag === 'fg-venc' && e.corpo.url === '/?ir=lucro'));
  await chama({ tipo: 'fecho' }); assert.equal(envios().length, n1, 'não repete');
  assert.equal((await c.query('select count(*)::int n from public.avisos_enviados')).rows[0].n >= 3, true);
});
