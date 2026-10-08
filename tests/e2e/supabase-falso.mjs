/* "Supabase falso" para testes de browser do modo servidor, sem Docker:
   Postgres local (migrações reais + RLS) + PostgREST real + funções de código (logic.ts) + Auth e Storage mínimos.
   Falta o Realtime (só se testa no Supabase verdadeiro). */
import http from 'node:http';
import { arranca, jwt } from './stack.mjs';
import { criaPins } from '../../supabase/functions/_shared/logic.ts';
import { depsPg } from '../functions/deps-pg.mjs';
import { ligaRealtime } from './realtime-falso.mjs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': '*' };
const ler = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
const bearer = (req) => { const a = req.headers.authorization || ''; return a.startsWith('Bearer ') ? a.slice(7) : null; };
const resp = (res, status, obj, extra = {}) => { res.writeHead(status, { ...CORS, 'Content-Type': 'application/json', ...extra }); res.end(obj === undefined ? '' : JSON.stringify(obj)); return true; };

/* corpo de multipart/form-data → { campos, ficheiro: Buffer } */
function multipart(buf, ctype) {
  const b = Buffer.from('--' + /boundary=(.+)$/.exec(ctype)[1]);
  const partes = []; let i = buf.indexOf(b);
  while (i >= 0) { const j = buf.indexOf(b, i + b.length); if (j < 0) break; partes.push(buf.subarray(i + b.length + 2, j - 2)); i = j; }
  let ficheiro = null;
  for (const p of partes) { const h = p.indexOf('\r\n\r\n'); if (/filename=/.test(p.subarray(0, h).toString())) ficheiro = p.subarray(h + 4); }
  return { ficheiro };
}

export async function iniciaFalso({ porta = 3110, portaPg = 3120, db = 'fg_browser' } = {}) {
  const ficheiros = new Map();
  let S;
  const sessao = async (conta) => ({ access_token: jwt({ sub: S.base.ids[conta], role: 'authenticated', aud: 'authenticated', email: `${conta}@forevergold.invalid`, app_metadata: { conta }, user_metadata: {} }), refresh_token: 'r-' + conta });
  let pins;
  const extra = async (req, res, base) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return true; }
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Expose-Headers', '*');
    const p = u.pathname;
    // --- funções
    const fn = /^\/functions\/v1\/([\w-]+)$/.exec(p);
    if (fn && req.method === 'POST') {
      const body = JSON.parse((await ler(req)).toString() || '{}');
      if (fn[1] === 'entrar') return resp(res, 200, await pins.entrar(body, req.headers['user-agent']));
      if (fn[1] === 'definir-pin') return resp(res, 200, await pins.definirPin(body, bearer(req), req.headers['user-agent']));
      if (fn[1] === 'repor-pin') return resp(res, 200, await pins.reporPin(body));
      return resp(res, 404, { ok: false });
    }
    // --- auth
    if (p === '/auth/v1/user') {
      const t = bearer(req); let conta = null;
      try { conta = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).app_metadata.conta; } catch (e) {}
      if (!conta) return resp(res, 401, { msg: 'sem sessão' });
      return resp(res, 200, { id: base.ids[conta], aud: 'authenticated', role: 'authenticated', email: `${conta}@forevergold.invalid`, app_metadata: { conta }, user_metadata: {}, created_at: new Date().toISOString() });
    }
    if (p === '/auth/v1/logout') { res.writeHead(204, CORS); res.end(); return true; }
    // --- storage
    let m = /^\/storage\/v1\/object\/(?:public\/)?([\w-]+)\/(.+)$/.exec(p);
    if (m && req.method === 'GET') { const f = ficheiros.get(m[1] + '/' + decodeURIComponent(m[2])); if (!f) return resp(res, 404, { error: 'not found' }); res.writeHead(200, { ...CORS, 'Content-Type': f.tipo }); res.end(f.buf); return true; }
    m = /^\/storage\/v1\/object\/sign\/([\w-]+)\/(.+)$/.exec(p);
    if (m && req.method === 'POST') return resp(res, 200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=t` });
    m = /^\/storage\/v1\/object\/([\w-]+)\/(.+)$/.exec(p);
    if (m && (req.method === 'POST' || req.method === 'PUT')) {
      const buf = await ler(req), ct = req.headers['content-type'] || '';
      const f = /multipart/.test(ct) ? multipart(buf, ct).ficheiro : buf;
      ficheiros.set(m[1] + '/' + decodeURIComponent(m[2]), { buf: f, tipo: /multipart/.test(ct) ? 'image/jpeg' : ct });
      return resp(res, 200, { Key: m[1] + '/' + m[2] });
    }
    m = /^\/storage\/v1\/object\/([\w-]+)$/.exec(p);
    if (m && req.method === 'DELETE') { const b = JSON.parse((await ler(req)).toString()); (b.prefixes || []).forEach((x) => ficheiros.delete(m[1] + '/' + x)); return resp(res, 200, []); }
    // --- apoio aos testes
    if (p === '/__test/sql' && req.method === 'POST') {
      const { sql, params } = JSON.parse((await ler(req)).toString());
      try { const r = await base.c.query(sql, params || []); return resp(res, 200, { rows: r.rows, rowCount: r.rowCount }); } catch (e) { return resp(res, 400, { erro: e.message }); }
    }
    if (p === '/__test/ficheiros') return resp(res, 200, [...ficheiros.keys()]);
    if (p === '/__test/pin' && req.method === 'POST') { const { conta, pin } = JSON.parse((await ler(req)).toString()); return resp(res, 200, await pins.adminRepor({ conta, pin })); }
    return false; // /rest/v1 → PostgREST
  };
  S = await arranca(db, { porta, portaPg, extra });
  pins = criaPins(depsPg(S.base.c, { sessao }));
  const rt = await ligaRealtime(S.servidor, S.base, db);
  // código inicial igual para todas as contas (só nos testes; em produção usa-se tools/repor-pin.mjs)
  for (const c of Object.keys(S.base.ids)) await pins.adminRepor({ conta: c, pin: '2727' });
  return { ...S, parar: async () => { await rt.parar(); await S.parar(); }, url: `http://127.0.0.1:${porta}`, anon: jwt({ role: 'anon' }), ficheiros };
}
