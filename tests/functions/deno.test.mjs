/* As Edge Functions a sério, em Deno, contra a base local (via PostgREST). Não há Auth aqui (só no Supabase),
   por isso a criação de sessão fica de fora: testa-se a verificação do código com "verificar: true". */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { arranca, jwt } from '../e2e/stack.mjs';

const DENO = process.env.DENO || '/tmp/denobin/deno';
const TEM = fs.existsSync(DENO) && fs.existsSync(process.env.POSTGREST || '/tmp/pgrst/postgrest');
const t = (nome, fn) => test(nome, { skip: !TEM && 'Deno/PostgREST não instalados (ver README)' }, fn);
let S, procs = [];
const porta = { 'entrar': 8781, 'definir-pin': 8782, 'repor-pin': 8783, 'admin-repor-pin': 8784 };

before(async () => {
  if (!TEM) return;
  S = await arranca('fg_deno');
  const root = path.resolve(import.meta.dirname, '../../supabase/functions');
  // cópia fora do repositório: o Deno não pode misturar-se com o package.json da raiz
  const tmp = '/tmp/fn-deno-run'; fs.rmSync(tmp, { recursive: true, force: true }); fs.cpSync(root, tmp, { recursive: true });
  for (const [fn, p] of Object.entries(porta)) {
    const pr = spawn(DENO, ['run', '-A', '--no-lock', path.join(tmp, fn, 'index.ts')], { env: { ...process.env, DENO_SERVE_ADDRESS: `tcp:127.0.0.1:${p}`,
      SUPABASE_URL: 'http://127.0.0.1:3101', SUPABASE_ANON_KEY: jwt({ role: 'anon' }), SUPABASE_SERVICE_ROLE_KEY: jwt({ role: 'service_role' }),
      PIN_PEPPER: 'pimenta-de-teste', AUTH_SECRET: 'auth-de-teste', ADMIN_SECRET: 'admin-de-teste' }, stdio: ['ignore', 'inherit', 'inherit'] });
    procs.push(pr);
  }
  for (const p of Object.values(porta)) for (let i = 0; i < 100; i++) { try { await fetch(`http://127.0.0.1:${p}/`, { method: 'OPTIONS' }); break; } catch (e) { await new Promise((r) => setTimeout(r, 300)); } }
});
after(async () => { procs.forEach((p) => p.kill()); if (S) await S.parar(); });

const chama = async (fn, body, headers = {}) => (await fetch(`http://127.0.0.1:${porta[fn]}/`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();

t('administração define o código inicial; só com o segredo', async () => {
  assert.deepEqual(await chama('admin-repor-pin', { conta: 'todas', pin: '2727' }), { ok: false, erro: 'Sem permissão.' });
  const r = await chama('admin-repor-pin', { conta: 'todas', pin: '2727' }, { 'x-admin-secret': 'admin-de-teste' });
  assert.equal(r.ok, true); assert.equal(Object.keys(r.contas).length, 8);
  const est = (await S.base.c.query('select * from public.fg_estado_contas()')).rows;
  assert.ok(est.every((e) => e.tem_pin));
});

t('entrar (verificar): certo, errado com contagem, bloqueio ao 5.º erro', async () => {
  assert.deepEqual(await chama('entrar', { conta: 'foreverbu', pin: '2727', verificar: true }), { ok: true });
  for (const n of [4, 3, 2, 1]) { const r = await chama('entrar', { conta: 'foreverbu', pin: '0000', verificar: true }); assert.equal(r.ok, false); assert.equal(r.restantes, n); }
  const r5 = await chama('entrar', { conta: 'foreverbu', pin: '0000', verificar: true });
  assert.equal(r5.restantes, 0); assert.ok(new Date(r5.bloqueado_ate) > new Date());
  assert.ok((await chama('entrar', { conta: 'foreverbu', pin: '2727', verificar: true })).bloqueado_ate, 'bloqueada');
  assert.equal((await chama('entrar', { conta: 'inexistente', pin: '2727' })).erro, 'Conta desconhecida.');
});

t('esqueci-me sem token: não associado', async () => {
  assert.deepEqual(await chama('repor-pin', { conta: 'forevervalbom' }), { ok: false, motivo: 'nao_associado' });
  assert.deepEqual(await chama('repor-pin', { conta: 'forevervalbom', dispositivo: 'x' }), { ok: false, motivo: 'nao_associado' });
});

t('definir-pin: sem permissão numa conta que já tem código', async () => {
  const r = await chama('definir-pin', { conta: 'forevervalbom', pin: '9999' });
  assert.equal(r.ok, false); assert.match(r.erro, /permissão/);
});
