/* Ligação da lógica dos códigos ao Supabase (só corre em Deno, nas Edge Functions).
   Segredos (supabase secrets set …): PIN_PEPPER, AUTH_SECRET, ADMIN_SECRET. SUPABASE_* vêm de origem. */
import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { criaPins, type Deps } from './logic.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PIMENTA = Deno.env.get('PIN_PEPPER') || '';
const AUTH_SECRET = Deno.env.get('AUTH_SECRET') || '';
export const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || '';

if (!PIMENTA || !AUTH_SECRET) console.error('Faltam os segredos PIN_PEPPER e/ou AUTH_SECRET (supabase secrets set ...).');

export const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hmac(chave: string, txt: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(txt)));
}
const ok = <T>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data; };

const deps: Deps = {
  contaExiste: async (c) => ok(await admin.from('contas').select('id').eq('id', c)).length > 0,
  reservar: async (c) => ok(await admin.rpc('fg_pin_reservar', { p_conta: c })),
  resultado: async (c, certo) => ok(await admin.rpc('fg_pin_resultado', { p_conta: c, p_certo: certo })),
  getPin: async (c) => (ok(await admin.from('pins').select('hash,bilhete_hash,bilhete_ate').eq('conta', c)) as any[])[0] ?? null,
  setPin: async (c, v) => { ok(await admin.from('pins').upsert({ conta: c, ...v, tentativas: 0, bloqueado_ate: null, definido_em: new Date().toISOString() }, { onConflict: 'conta' })); },
  dispositivoValido: async (c, h) => ok(await admin.from('dispositivos').select('conta').eq('conta', c).eq('token_hash', h)).length > 0,
  addDispositivo: async (c, h, ua) => { ok(await admin.from('dispositivos').upsert({ conta: c, token_hash: h, ua }, { onConflict: 'conta,token_hash' })); },
  apagarDispositivos: async (c) => { ok(await admin.from('dispositivos').delete().eq('conta', c)); },
  hashar: async (c, pin) => bcrypt.hash(await hmac(PIMENTA, `${c}|${pin}`), 10),
  comparar: async (c, pin, hash) => bcrypt.compare(await hmac(PIMENTA, `${c}|${pin}`), hash),
  quemEh: async (jwt) => {
    if (!jwt) return null;
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user ? null : ((data.user.app_metadata as any)?.conta ?? null);
  },
  aleatorio: () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer),
  sha256: async (t) => hex(await crypto.subtle.digest('SHA-256', enc.encode(t))),
  agora: () => Date.now(),
  /* Cada conta da equipa é um utilizador Auth com palavra-passe derivada (HMAC) que nunca sai daqui. */
  sessao: async (conta) => {
    const email = `${conta}@forevergold.invalid`, password = await hmac(AUTH_SECRET, 'senha|' + conta);
    const linha = (ok(await admin.from('contas').select('user_id').eq('id', conta)) as any[])[0];
    let uid: string | null = linha?.user_id ?? null;
    if (!uid) {
      const c = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { conta } });
      if (c.error) {
        // pode já existir (criado por uma tentativa anterior): procurar
        const lista = await admin.auth.admin.listUsers({ perPage: 200 });
        uid = lista.data?.users.find((u) => u.email === email)?.id ?? null;
        if (!uid) throw new Error(c.error.message);
      } else uid = c.data.user.id;
      ok(await admin.from('contas').update({ user_id: uid }).eq('id', conta));
    }
    const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    let r = await anon.auth.signInWithPassword({ email, password });
    if (r.error) {
      await admin.auth.admin.updateUserById(uid!, { password, app_metadata: { conta }, email_confirm: true });
      r = await anon.auth.signInWithPassword({ email, password });
    }
    if (r.error || !r.data.session) throw new Error(r.error?.message || 'Sem sessão');
    return { access_token: r.data.session.access_token, refresh_token: r.data.session.refresh_token };
  }
};

export const pins = criaPins(deps);

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
export const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
export const tokenDe = (req: Request) => { const a = req.headers.get('Authorization') || ''; return a.startsWith('Bearer ') ? a.slice(7) : null; };

/* envolve uma função: CORS, JSON, erros sem pormenores para fora */
export function servir(fn: (req: Request, body: any) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    try { return json(await fn(req, await req.json().catch(() => ({})))); }
    catch (e) { console.error(e); return json({ ok: false, erro: 'Erro no servidor.' }); }
  });
}
