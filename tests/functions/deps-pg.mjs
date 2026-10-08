/* Dependências de supabase/functions/_shared/logic.ts apoiadas diretamente numa base Postgres (como service_role).
   Usado pelos testes das funções e pelo "Supabase falso" dos testes de browser. */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
export const hmacPin = (conta, pin) => crypto.createHmac('sha256', 'pimenta-de-teste').update(`${conta}|${pin}`).digest('hex');

export function depsPg(c, { sessao, agora = () => Date.now(), aoComparar = () => {} } = {}) {
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
    hashar: async (x, pin) => bcrypt.hash(hmacPin(x, pin), 4),
    comparar: async (x, pin, hash) => { aoComparar(); return bcrypt.compare(hmacPin(x, pin), hash); },
    sessao,
    quemEh: async (jwt) => {
      if (!jwt) return null;
      if (jwt.startsWith('jwt-')) return jwt.slice(4); // sessões de brincar dos testes unitários
      try { const p = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()); return p.app_metadata && p.app_metadata.conta || null; } catch (e) { return null; }
    },
    aleatorio: () => crypto.randomBytes(32).toString('hex'),
    sha256: async (t) => sha(t),
    agora
  };
}
