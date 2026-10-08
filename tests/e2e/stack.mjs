/* Mini-stack local para testar o código real da app (repo.js) contra a base de dados com as políticas RLS reais:
   Postgres 16 local + PostgREST (o mesmo que o Supabase usa) + um proxy que põe /rest/v1 no caminho.
   Não há Realtime nem Storage aqui: esses só se testam no projeto Supabase verdadeiro. */
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { novaBase } from '../rls/db.mjs';

const SECRET = 'segredo-so-para-testes-locais-0123456789abcdef';
const b64 = (x) => Buffer.from(x).toString('base64url');
export const jwt = (claims) => { const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })); return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`; };

export async function arranca(db = 'fg_e2e', { porta = 3101, portaPg = 3100, extra = null, pgrstPath = process.env.POSTGREST || '/tmp/pgrst/postgrest' } = {}) {
  const base = await novaBase(db);
  const pr = spawn(pgrstPath, [], { env: { ...process.env, PGRST_DB_URI: `postgres://authenticator:authenticator@127.0.0.1:5432/${db}`, PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon', PGRST_JWT_SECRET: SECRET, PGRST_SERVER_PORT: String(portaPg), PGRST_SERVER_HOST: '127.0.0.1', PGRST_DB_MAX_ROWS: '1000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; pr.stderr.on('data', (d) => { log += d; }); pr.stdout.on('data', (d) => { log += d; });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${portaPg}/`); if (r.ok || r.status < 500) break; } catch (e) {} await new Promise((r) => setTimeout(r, 200)); if (i === 49) throw new Error('PostgREST não arrancou:\n' + log); }
  const proxy = http.createServer(async (req, res) => {
    if (extra && (await extra(req, res, base))) return;
    const alvo = req.url.replace(/^\/rest\/v1/, '');
    const pq = http.request({ host: '127.0.0.1', port: portaPg, path: alvo, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    req.pipe(pq);
  }).listen(porta, '127.0.0.1');
  const cliente = (conta) => createClient(`http://127.0.0.1:${porta}`, 'anon-key-ignorada', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: conta ? { Authorization: 'Bearer ' + jwt({ sub: base.ids[conta], role: 'authenticated' }) } : { Authorization: 'Bearer ' + jwt({ role: 'anon' }) } }
  });
  return { base, cliente, porta, parar: async () => { proxy.close(); pr.kill(); await base.c.end(); } };
}
