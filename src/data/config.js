/* Configuração. Em produção vem das variáveis VITE_* (ver .env.example e README).
   Sem VITE_SUPABASE_URL a app corre em modo "local" (dados só neste navegador), útil para desenvolver e para os testes visuais. */
const env = import.meta.env || {};
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
export const VAPID_PUBLIC_KEY = env.VITE_VAPID_PUBLIC_KEY || '';
export const MODO = env.VITE_MODO === 'local' ? 'local' : SUPABASE_URL && SUPABASE_ANON_KEY ? 'servidor' : 'local';
if (MODO === 'local' && !env.VITE_MODO && env.PROD) console.warn('[ForeverGold] Sem VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY: a app está em modo local (dados só neste navegador).');
