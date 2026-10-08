/* Envia as notificações push. Chamada pela base de dados (pg_net) com o segredo partilhado em x-notificar-segredo.
     chat   → toda a equipa menos o autor            (título "Chat · Nome" / "Aviso urgente · Nome")
     cot    → toda a equipa menos quem escreveu       (título "Cotação diária")
     pub    → toda a equipa menos a BU                (título "Publicidade")
     fecho  → vencedora de cada mês fechado e da temporada, uma só vez (avisos_enviados), a toda a equipa
   Os clientes nunca têm subscrições, por isso nunca recebem nada.
   Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFICAR_SEGREDO. */
import webpush from 'npm:web-push@3.6.7';
import { admin, CORS, json } from '../_shared/admin.ts';
import * as A from '../_shared/avisos.ts';

const SEGREDO = Deno.env.get('NOTIFICAR_SEGREDO') || '';
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:geralforevergold@gmail.com', Deno.env.get('VAPID_PUBLIC_KEY') || '', Deno.env.get('VAPID_PRIVATE_KEY') || '');

const q = async <T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> => { const r = await p; if (r.error) throw new Error(r.error.message); return r.data; };

async function enviar(aviso: A.Aviso, contas: string[]) {
  if (!contas.length) return 0;
  const subs = await q(admin.from('push_subs').select('id,conta,endpoint,p256dh,auth').in('conta', contas)) as any[];
  const corpo = JSON.stringify({ title: aviso.title, body: aviso.body, tag: aviso.tag, k: aviso.k, vibrate: aviso.vibrate, url: aviso.url });
  let n = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, { TTL: 86400, urgency: aviso.k === 'urg' ? 'high' : 'normal' });
      n++;
    } catch (e: any) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await admin.from('push_subs').delete().eq('id', s.id); // subscrição morta
      else console.warn('push falhou', s.conta, e && (e.statusCode || e.message));
    }
  }));
  return n;
}

const todas = async (menos: (c: any) => boolean = () => false) => ((await q(admin.from('contas').select('id,nome,pub')) as any[]).filter((c) => !menos(c)));
const lisboa = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: 'numeric' }).formatToParts(new Date()).map((x) => [x.type, x.value])); return { ano: +p.year, mes: +p.month }; };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!SEGREDO || req.headers.get('x-notificar-segredo') !== SEGREDO) return json({ ok: false }, 401);
  try {
    const b = await req.json();
    const nome = async (id: string) => ((await q(admin.from('contas').select('nome').eq('id', id)) as any[])[0]?.nome) || id;
    if (b.tipo === 'chat') {
      const m = (await q(admin.from('chat').select('autor,txt,urg').eq('id', b.id)) as any[])[0];
      if (!m) return json({ ok: false });
      return json({ ok: true, enviadas: await enviar(A.chat(m, await nome(m.autor)), (await todas((c) => c.id === m.autor)).map((c) => c.id)) });
    }
    if (b.tipo === 'cot') {
      const c = (await q(admin.from('cotacoes').select('*').eq('dia', b.dia)) as any[])[0];
      if (!c) return json({ ok: false });
      return json({ ok: true, enviadas: await enviar(A.cot(c, await nome(c.autor)), (await todas((x) => x.id === c.autor)).map((x) => x.id)) });
    }
    if (b.tipo === 'pub') {
      const p = (await q(admin.from('pub').select('titulo').eq('id', b.id)) as any[])[0];
      if (!p) return json({ ok: false });
      return json({ ok: true, enviadas: await enviar(A.pub(p), (await todas((c) => c.pub)).map((c) => c.id)) });
    }
    if (b.tipo === 'fecho') {
      const classif = await q(admin.rpc('fg_classificacao_servico'));
      const ja = new Set(((await q(admin.from('avisos_enviados').select('chave')) as any[]).map((x) => x.chave)));
      let enviadas = 0;
      for (const f of A.decideFecho(classif, lisboa(), ja)) {
        // reclamar a chave primeiro: se outra execução já a tomou, não repete
        const r = await admin.from('avisos_enviados').upsert({ chave: f.id }, { onConflict: 'chave', ignoreDuplicates: true }).select();
        if (r.error || !r.data || !r.data.length) continue;
        if (f.semVencedora) continue;
        await q(admin.from('avisos').upsert({ id: f.id, tipo: f.tipo, titulo: f.titulo, corpo: f.corpo }, { onConflict: 'id' }));
        enviadas += await enviar(A.avisoDeFecho(f), (await todas()).map((c) => c.id));
      }
      return json({ ok: true, enviadas });
    }
    return json({ ok: false, erro: 'tipo desconhecido' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, erro: 'Erro no servidor.' }, 500); }
});
