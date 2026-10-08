/* Administração dos códigos (para o Filipe ou para quem gere o projeto). Corre no computador, não na app.

   Uso:
     node tools/repor-pin.mjs <conta|todas> [--pin NNNN]

   Sem --pin, a conta fica sem código e a pessoa escolhe um novo na primeira entrada.
   Com --pin, define já esse código (por exemplo o código inicial igual para todas: `todas --pin NNNN`).
   Em qualquer caso, esquece os telemóveis associados à conta.

   Precisa de ADMIN_SECRET e VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (no .env ou no ambiente). */
import fs from 'node:fs';

const env = { ...process.env };
try { for (const l of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) { const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !(m[1] in env)) env[m[1]] = m[2]; } } catch (e) {}

const args = process.argv.slice(2);
const conta = args.find((a) => !a.startsWith('--'));
const i = args.indexOf('--pin'), pin = i >= 0 ? args[i + 1] : undefined;
if (!conta) { console.error('Uso: node tools/repor-pin.mjs <conta|todas> [--pin NNNN]'); process.exit(1); }
if (pin !== undefined && !/^\d{4}$/.test(pin)) { console.error('O código tem de ter 4 algarismos.'); process.exit(1); }
const url = env.VITE_SUPABASE_URL, anon = env.VITE_SUPABASE_ANON_KEY, seg = env.ADMIN_SECRET;
if (!url || !anon || !seg) { console.error('Faltam VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e/ou ADMIN_SECRET (no .env ou no ambiente).'); process.exit(1); }

const r = await fetch(`${url}/functions/v1/admin-repor-pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}`, 'x-admin-secret': seg }, body: JSON.stringify({ conta, pin }) });
const j = await r.json().catch(() => ({}));
if (!j.ok) { console.error('Falhou:', j.erro || JSON.stringify(j)); process.exit(1); }
console.log(Object.keys(j.contas || { [conta]: 1 }).map((c) => `✓ ${c}${pin ? ' (código definido)' : ' (sem código: escolhe na primeira entrada)'}`).join('\n'));
