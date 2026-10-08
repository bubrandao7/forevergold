/* Constrói a app em modo servidor, apontada para o Supabase falso (dist-servidor). */
import { execSync } from 'node:child_process';
import { jwt } from './stack.mjs';
execSync('npx vite build --mode servidor --outDir dist-servidor', { stdio: 'inherit', env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:3110', VITE_SUPABASE_ANON_KEY: jwt({ role: 'anon' }), VITE_VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' } });
