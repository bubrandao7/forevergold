/* Lógica dos códigos (supabase/functions/_shared/logic.ts) contra as funções SQL reais (contagem de tentativas atómica). */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { novaBase } from '../rls/db.mjs';
import { criaPins } from '../../supabase/functions/_shared/logic.ts';

let b, c, cmp = 0, relogio = Date.now();
const hmac = (conta, pin) => crypto.createHmac('sha256', 'pimenta-de-teste').update(`${conta}|${pin}`).digest('hex');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const sessoes = [];

function deps() {
  return {
    contaExiste: async (x) => (await c.query('select 1 from public.contas where id = $1', [x])).rowCount > 0,
    reservar: async (x) => (await c.query('select public.fg_pin_reservar($1) as r', [x])).rows[0].r,
    resultado: async (x, certo) => (await c.query('select public.fg_pin_resultado($1, $2) as r', [x, certo])).rows[0].r,
    getPin: async (x) => (await c.query('select hash, bilhete_hash, bilhete_ate from public.pins where conta = $1', [x])).rows[0] || null,
    setPin: async (x, v) => { await c.query(`insert into public.pins (conta, hash, bilhete_hash, bilhete_ate, tentativas, bloqueado_ate) values ($1,$2,$3,$4,0,null)
      on conflict (conta) do update set hash = excluded.hash, bilhete_hash = excluded.bilhete_hash, bilhete_ate = excluded.bilhete_ate, tentativas = 0, bloqueado_ate = null`, [x, v.hash, v.bilhete_hash, v.bilhete_ate]); },
    dispositivoValido: async (x, h) => (await c.query('select 1 from public.dispositivos where conta = $1 and token_hash = $2', [x, h])).rowCount > 0,
    addDispositivo: async (x, h, ua) => { await c.query('insert into public.dispositivos (conta, token_hash, ua) values ($1,$2,$3) on conflict do nothing', [x, h, ua]); },
    apagarDispositivos: async (x) => { await c.query('delete from public.dispositivos where conta = $1', [x]); },
    hashar: async (x, pin) => bcrypt.hash(hmac(x, pin), 4),
    comparar: async (x, pin, hash) => { cmp++; return bcrypt.compare(hmac(x, pin), hash); },
    sessao: async (x) => { const s = { access_token: 'jwt-' + x, refresh_token: 'r-' + x }; sessoes.push(x); return s; },
    quemEh: async (jwt) => (jwt && jwt.startsWith('jwt-') ? jwt.slice(4) : null),
    aleatorio: () => crypto.randomBytes(32).toString('hex'),
    sha256: async (t) => sha(t),
    agora: () => relogio
  };
}
let P;
before(async () => { b = await novaBase('fg_pins'); c = b.c; P = criaPins(deps()); });
after(async () => { await c.end(); });

test('conta sem código: primeiro uso é livre; entrar diz que não tem código', async () => {
  assert.deepEqual(await P.entrar({ conta: 'foreverbu', pin: '2727' }), { ok: false, semPin: true, erro: 'Esta conta ainda não tem código.' });
  const r = await P.definirPin({ conta: 'foreverbu', pin: '2727' }, null, 'iPhone');
  assert.equal(r.ok, true); assert.ok(r.dispositivo && r.dispositivo.length === 64); assert.equal(r.session.access_token, 'jwt-foreverbu');
  const est = (await c.query('select * from public.fg_estado_contas()')).rows.find((x) => x.conta === 'foreverbu');
  assert.equal(est.tem_pin, true);
});

test('o código nunca fica em claro e a pimenta conta', async () => {
  const h = (await c.query("select hash from public.pins where conta = 'foreverbu'")).rows[0].hash;
  assert.ok(h.startsWith('$2'), 'bcrypt'); assert.ok(!h.includes('2727'));
  assert.equal(await bcrypt.compare('2727', h), false, 'sem a pimenta não se confirma');
});

test('entrar: certo (com e sem token do dispositivo) e erradas com contagem 4,3,2,1 e bloqueio à 5.ª', async () => {
  const a = await P.entrar({ conta: 'foreverbu', pin: '2727' });
  assert.equal(a.ok, true); assert.ok(a.dispositivo, 'primeiro login neste telemóvel cria o token');
  const b2 = await P.entrar({ conta: 'foreverbu', pin: '2727', dispositivo: a.dispositivo });
  assert.equal(b2.ok, true); assert.equal(b2.dispositivo, undefined, 'já associado: não cria outro');
  assert.deepEqual(await P.entrar({ conta: 'foreverbu', pin: '2727', verificar: true }), { ok: true });
  for (const n of [4, 3, 2, 1]) { const r = await P.entrar({ conta: 'foreverbu', pin: '0000' }); assert.deepEqual([r.ok, r.restantes, r.bloqueado_ate], [false, n, undefined]); }
  const r5 = await P.entrar({ conta: 'foreverbu', pin: '0000' });
  assert.equal(r5.ok, false); assert.equal(r5.restantes, 0); assert.ok(new Date(r5.bloqueado_ate) > new Date());
  const certoBloqueado = await P.entrar({ conta: 'foreverbu', pin: '2727' });
  assert.equal(certoBloqueado.ok, false); assert.ok(certoBloqueado.bloqueado_ate, 'durante o bloqueio nem o código certo entra');
  const est = (await c.query('select * from public.fg_estado_contas()')).rows.find((x) => x.conta === 'foreverbu');
  assert.ok(est.bloqueado_ate, 'o ecrã de entrada sabe que está bloqueada');
  await c.query("update public.pins set bloqueado_ate = now() - interval '1 second' where conta = 'foreverbu'");
  assert.equal((await P.entrar({ conta: 'foreverbu', pin: '2727' })).ok, true, 'passado o bloqueio, volta a entrar');
  assert.equal((await c.query("select tentativas from public.pins where conta = 'foreverbu'")).rows[0].tentativas, 0);
});

test('tentativas em paralelo não furam o limite de 5', async () => {
  cmp = 0;
  const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => P.entrar({ conta: 'foreverbu', pin: String(1000 + i) })));
  assert.ok(cmp <= 5, 'no máximo 5 códigos verificados: ' + cmp);
  assert.ok(rs.every((r) => r.ok === false));
  assert.ok(rs.some((r) => r.bloqueado_ate));
});

test('esqueci-me: só com o token do telemóvel; escolher o novo código só com o bilhete', async () => {
  await c.query("update public.pins set bloqueado_ate = null, tentativas = 0 where conta = 'foreverbu'");
  assert.deepEqual(await P.reporPin({ conta: 'foreverbu' }), { ok: false, motivo: 'nao_associado' });
  assert.deepEqual(await P.reporPin({ conta: 'foreverbu', dispositivo: 'token-inventado' }), { ok: false, motivo: 'nao_associado' });
  const a = await P.entrar({ conta: 'foreverbu', pin: '2727' }); // novo telemóvel
  const disp = (await P.entrar({ conta: 'foreverbu', pin: '2727' })).dispositivo ?? a.dispositivo;
  assert.ok(disp);
  const r = await P.reporPin({ conta: 'foreverbu', dispositivo: disp });
  assert.equal(r.ok, true); assert.equal(r.bilhete.length, 64);
  assert.equal((await P.entrar({ conta: 'foreverbu', pin: '2727' })).semPin, true, 'o código antigo deixou de funcionar');
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '1111' }, null)).ok, false, 'sem bilhete: ninguém escolhe');
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '1111', bilhete: 'adivinhado' }, null)).ok, false);
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '1111', bilhete: r.bilhete }, 'jwt-foreverfilipe')).ok, true, 'o bilhete chega, a sessão de outra conta não conta');
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '2222', bilhete: r.bilhete }, null)).ok, false, 'bilhete de uso único');
  assert.equal((await P.entrar({ conta: 'foreverbu', pin: '1111' })).ok, true);
});

test('bilhete expira ao fim de 10 minutos', async () => {
  const x = await P.entrar({ conta: 'foreverbu', pin: '1111' });
  const disp = x.dispositivo || (await c.query("select 1")).rows && null;
  const d2 = (await P.definirPin({ conta: 'foreverbu', pin: '1111' }, 'jwt-foreverbu')).dispositivo;
  const t = x.dispositivo || d2;
  const r = await P.reporPin({ conta: 'foreverbu', dispositivo: t });
  assert.equal(r.ok, true);
  relogio += 11 * 60 * 1000;
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '3333', bilhete: r.bilhete }, null)).ok, false, 'expirado');
  relogio = Date.now();
  await P.adminRepor({ conta: 'foreverbu', pin: '2727' });
});

test('mudar o código exige a sessão da própria conta', async () => {
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '4444' }, null)).ok, false);
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '4444' }, 'jwt-foreveroficina')).ok, false);
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '4444' }, 'jwt-foreverbu')).ok, true);
  assert.equal((await P.entrar({ conta: 'foreverbu', pin: '4444' })).ok, true);
  assert.equal((await P.definirPin({ conta: 'foreverbu', pin: '44' }, 'jwt-foreverbu')).ok, false, 'tem de ter 4 algarismos');
});

test('administração: código inicial para todas, esquece telemóveis', async () => {
  for (const x of ['forevervalbom', 'foreverstovidio', 'foreverpedroucos', 'foreverriotinto', 'foreverarrifana', 'foreveroficina', 'foreverbu', 'foreverfilipe']) assert.equal((await P.adminRepor({ conta: x, pin: '2727' })).ok, true);
  const est = (await c.query('select * from public.fg_estado_contas()')).rows;
  assert.ok(est.length === 8 && est.every((e) => e.tem_pin));
  const a = await P.entrar({ conta: 'forevervalbom', pin: '2727' });
  assert.equal(a.ok, true); assert.ok(a.dispositivo);
  await P.adminRepor({ conta: 'forevervalbom', pin: '2727' });
  assert.deepEqual(await P.reporPin({ conta: 'forevervalbom', dispositivo: a.dispositivo }), { ok: false, motivo: 'nao_associado' });
  assert.equal((await P.adminRepor({ conta: 'inexistente' })).ok, false);
  assert.equal((await P.adminRepor({ conta: 'forevervalbom', pin: '12' })).ok, false);
});
