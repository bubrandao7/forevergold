/* Cliente com chave de serviço (ignora a RLS) e utilitários comuns às Edge Functions. */
import { createClient } from 'npm:@supabase/supabase-js@2';

export const URL_ = Deno.env.get('SUPABASE_URL')!;
export const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
export const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
export const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
