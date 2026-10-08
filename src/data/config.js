/* Configuração. Em produção vem das variáveis VITE_* (ver .env.example e README).
   Em produção (vercel.json/netlify.toml: modo "online") os valores públicos vêm de .env.online (VITE_FG_*), que têm prioridade sobre as variáveis do alojamento.
   Sem VITE_SUPABASE_URL a app corre em modo "local" (dados só neste navegador), útil para desenvolver e para os testes visuais. */
const env = import.meta.env || {};
export const SUPABASE_URL = env.VITE_FG_URL || env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = env.VITE_FG_KEY || env.VITE_SUPABASE_ANON_KEY || '';
export const VAPID_PUBLIC_KEY = env.VITE_FG_VAPID || env.VITE_VAPID_PUBLIC_KEY || '';
export const MODO = env.VITE_MODO === 'local' ? 'local' : SUPABASE_URL && SUPABASE_ANON_KEY ? 'servidor' : 'local';
if (MODO === 'local' && !env.VITE_MODO && env.PROD) console.warn('[ForeverGold] Sem VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY: a app está em modo local (dados só neste navegador).');
