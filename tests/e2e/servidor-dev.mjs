/* Arranca o Supabase falso e fica a correr (usado pelo Playwright do modo servidor). */
import { iniciaFalso } from './supabase-falso.mjs';
const f = await iniciaFalso();
console.log('Supabase falso pronto em', f.url);
process.on('SIGTERM', async () => { await f.parar(); process.exit(0); });
setInterval(() => {}, 1 << 30);
