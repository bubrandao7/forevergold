/* Base de testes local: aplica o shim e todas as migrações, e dá utilitários para agir "como" cada papel. */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const conn = (db) => ({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: db });

export const STAFF = ['forevervalbom', 'foreverstovidio', 'foreverpedroucos', 'foreverriotinto', 'foreverarrifana', 'foreveroficina', 'foreverbu', 'foreverfilipe'];

export async function novaBase(nome = 'fg_test') {
  const adm = new pg.Client(conn('postgres')); await adm.connect();
  await adm.query(`drop database if exists ${nome} with (force)`); await adm.query(`create database ${nome}`); await adm.end();
  const c = new pg.Client(conn(nome)); await c.connect();
  await c.query(fs.readFileSync(path.join(root, 'tests/rls/shim.sql'), 'utf8'));
  const dir = path.join(root, 'supabase/migrations');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    try { await c.query(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { throw new Error(`${f}: ${e.message}`); }
  }
  // contas da equipa ligadas a utilizadores Auth
  const ids = {};
  for (const id of STAFF) {
    const r = await c.query('insert into auth.users (email) values ($1) returning id', [id + '@fg.local']);
    ids[id] = r.rows[0].id;
    await c.query('update public.contas set user_id = $1 where id = $2', [ids[id], id]);
  }
  return { c, ids };
}

/* Corre `fn(q)` como um papel. conta = null → cliente (anon); senão conta da equipa (authenticated).
   Tudo dentro de uma transação que se desfaz (a não ser que `manter` seja true). */
export async function como(base, conta, fn, { manter = false } = {}) {
  const { c, ids } = base;
  await c.query('begin');
  try {
    if (conta === 'service') await c.query('set local role service_role');
    else if (conta === null) { await c.query('set local role anon'); await c.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)"); }
    else { await c.query('set local role authenticated'); await c.query('select set_config($1, $2, true)', ['request.jwt.claims', JSON.stringify({ sub: ids[conta], role: 'authenticated' })]); }
    const q = (sql, params) => c.query(sql, params);
    const out = await fn(q);
    await c.query(manter ? 'commit' : 'rollback');
    return out;
  } catch (e) { await c.query('rollback'); throw e; }
}

/* Espera que a instrução falhe (RLS, trigger ou privilégio). Devolve a mensagem. */
export async function falha(base, conta, sql, params) {
  try { await como(base, conta, (q) => q(sql, params)); } catch (e) { return e.message; }
  throw new Error('Devia ter falhado mas passou: ' + sql);
}
