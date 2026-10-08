/* Realtime mínimo para os testes de browser: fala o protocolo do Supabase Realtime (Phoenix, vsn 2.0.0) com o realtime-js
   e emite os eventos `postgres_changes` a partir de LISTEN/NOTIFY, respeitando a RLS do subscritor.
   Não replica tudo (broadcast, presence, filtros por coluna): só o que a app usa. */
import { WebSocketServer } from 'ws';
import pg from 'pg';

const TABELAS = { lojas: ['id'], pecas: ['id'], peca_fotos: ['id'], chat: ['id'], cotacoes: ['dia'], lucro: ['ano', 'mes', 'loja'], pub: ['id'], pub_partilhas: ['pub', 'loja'], vistos: ['conta', 'kind'], avisos: ['id'] };

export async function ligaRealtime(servidor, base, dbNome) {
  // gatilhos de teste (só nesta base): cada alteração faz NOTIFY
  await base.c.query(`create or replace function public.fg_teste_notifica() returns trigger language plpgsql as $$
    begin perform pg_notify('fg_rt', json_build_object('t', tg_table_name, 'op', tg_op, 'new', case when tg_op = 'DELETE' then null else to_jsonb(new) end, 'old', case when tg_op = 'INSERT' then null else to_jsonb(old) end)::text); return null; end $$;`);
  for (const t of Object.keys(TABELAS)) await base.c.query(`drop trigger if exists fg_teste_${t} on public.${t}; create trigger fg_teste_${t} after insert or update or delete on public.${t} for each row execute function public.fg_teste_notifica()`);
  const ouvinte = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: dbNome });
  await ouvinte.connect(); await ouvinte.query('listen fg_rt');
  const vis = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: dbNome }); // ligação só para testar a RLS
  await vis.connect();
  let fila = Promise.resolve(); // uma verificação de cada vez nesta ligação

  const wss = new WebSocketServer({ noServer: true });
  const ligacoes = new Set();
  servidor.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/realtime/v1/websocket')) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const L = { ws, canais: new Map(), jwt: null };
      ligacoes.add(L);
      ws.on('close', () => ligacoes.delete(L));
      ws.on('message', (m) => { try { tratar(L, JSON.parse(m.toString())); } catch (e) { console.warn('[realtime falso]', e.message); } });
    });
  });
  const claims = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()); } catch (e) { return null; } };
  let seq = 1;
  const env = (L, joinRef, ref, topic, ev, payload) => L.ws.readyState === 1 && L.ws.send(JSON.stringify([joinRef, ref, topic, ev, payload]));

  function tratar(L, [joinRef, ref, topic, ev, payload]) {
    if (topic === 'phoenix' && ev === 'heartbeat') return env(L, null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} });
    if (ev === 'phx_join') {
      const binds = (payload.config.postgres_changes || []).map((f) => ({ id: seq++, event: f.event, schema: f.schema, table: f.table }));
      L.canais.set(topic, { joinRef, binds, jwt: payload.access_token || null });
      return env(L, joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: binds } });
    }
    if (ev === 'access_token') { const c = L.canais.get(topic); if (c) c.jwt = payload.access_token; return env(L, joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }); }
    if (ev === 'phx_leave') { L.canais.delete(topic); env(L, joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }); return env(L, joinRef, null, topic, 'phx_close', {}); }
  }

  /* o subscritor consegue ver a linha? (RLS) — DELETE não se filtra, como no Realtime a sério */
  function visivel(jwt, t, linha) {
    const r = fila.then(async () => {
      const c = jwt && claims(jwt); const conta = c && c.app_metadata && c.app_metadata.conta;
      await vis.query('begin');
      try {
        if (conta) { await vis.query('set local role authenticated'); await vis.query('select set_config($1, $2, true)', ['request.jwt.claims', JSON.stringify({ sub: base.ids[conta], role: 'authenticated' })]); }
        else { await vis.query('set local role anon'); await vis.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)"); }
        const w = TABELAS[t].map((k, i) => `${k} = $${i + 1}`).join(' and ');
        return (await vis.query(`select 1 from public.${t} where ${w}`, TABELAS[t].map((k) => linha[k]))).rowCount > 0;
      } catch (e) { return false; } finally { await vis.query('rollback'); }
    });
    fila = r.catch(() => {});
    return r;
  }

  ouvinte.on('notification', async (n) => {
    const e = JSON.parse(n.payload), t = e.t, linha = e.new || e.old;
    for (const L of ligacoes) for (const [topic, c] of L.canais) {
      const ids = c.binds.filter((b) => b.table === t && (b.event === '*' || b.event === e.op)).map((b) => b.id);
      if (!ids.length) continue;
      if (e.op !== 'DELETE' && !(await visivel(c.jwt, t, linha))) continue;
      const pk = Object.fromEntries(TABELAS[t].map((k) => [k, linha[k]]));
      env(L, null, null, topic, 'postgres_changes', { ids, data: { schema: 'public', table: t, commit_timestamp: new Date().toISOString(), type: e.op, record: e.op === 'DELETE' ? {} : e.new, old_record: e.op === 'DELETE' ? pk : e.op === 'UPDATE' ? pk : {}, columns: [], errors: null } });
    }
  });
  return { parar: async () => { for (const L of ligacoes) L.ws.close(); wss.close(); await ouvinte.end(); await vis.end(); } };
}
