/* Repositório: operações por entidade sobre o Supabase.
   A app mantém `data` na forma do protótipo ({ lojas, pecas, chat, cot, lucro, pub, seen, pins, class }); aqui é onde
   se carrega do servidor, se aplicam alterações em tempo real e se gravam as operações. */
import { rel, ms, iso, lojaDe, pecaDe, chatDe, cotDe, cotPara, lucroDe, pubDe } from './mapper.js';

const TAM = 1000; // máximo de linhas por pedido no Supabase
const KINDS = ['chat', 'cot', 'pub', 'lucro'];

export function criaRepo(sb, media, reg) {
  const R = { conta: null, loja: null, staff: false };
  const falha = (e) => { if (e) throw Object.assign(new Error(e.message || 'Erro'), { code: e.code }); };
  const ok = async (p) => { const { data, error } = await p; falha(error); return data; };

  /* lê todas as páginas de uma consulta */
  async function todos(mk) {
    const out = [];
    for (let i = 0; ; i += TAM) {
      const { data, error } = await mk().range(i, i + TAM - 1);
      falha(error);
      out.push(...data);
      if (data.length < TAM) return out;
    }
  }

  const vazio = () => ({ v: 1, lojas: {}, pecas: [], chat: [], cot: {}, lucro: {}, pub: [], pins: {}, seen: {}, class: null });

  /* Carrega o que o papel pode ver. cliente (sem sessão): lojas, peças e fotos. Equipa: tudo. */
  async function carregar(parcial) {
    const quer = parcial || ['lojas', 'pecas', 'chat', 'cot', 'lucro', 'pub', 'seen', 'class'];
    const d = parcial ? {} : vazio();
    const t0 = Date.now();
    const agora = await ok(sb.rpc('fg_agora'));
    rel.skew = Date.parse(agora) - (t0 + Date.now()) / 2; // meio da viagem

    if (quer.includes('lojas')) {
      d.lojas = {};
      (await todos(() => sb.from('lojas').select('*').order('ordem'))).forEach((r) => { d.lojas[r.id] = lojaDe(r); });
    }
    if (quer.includes('pecas')) {
      const fotos = await todos(() => sb.from('peca_fotos').select('id,peca,pos,path').order('peca').order('pos'));
      const por = {};
      reg.fotos = {};
      fotos.forEach((f) => { (por[f.peca] = por[f.peca] || []).push(f); reg.fotos[f.id] = { peca: f.peca, pos: f.pos, path: f.path }; });
      d.pecas = (await todos(() => sb.from('pecas').select('*').order('at', { ascending: false }).order('id'))).map((r) => pecaDe(r, por[r.id]));
    }
    if (R.staff) {
      if (quer.includes('chat')) d.chat = (await todos(() => sb.from('chat').select('*').order('at').order('id'))).map(chatDe);
      if (quer.includes('cot')) { d.cot = {}; (await todos(() => sb.from('cotacoes').select('*').order('dia'))).forEach((r) => { d.cot[r.dia] = cotDe(r); }); }
      if (quer.includes('lucro')) {
        d.lucro = {};
        (await todos(() => sb.from('lucro').select('*').order('ano').order('mes'))).forEach((r) => {
          const Y = (d.lucro[r.ano] = d.lucro[r.ano] || {}), L = (Y[r.loja] = Y[r.loja] || {}); L[r.mes] = lucroDe(r);
        });
      }
      if (quer.includes('pub')) {
        const sh = await todos(() => sb.from('pub_partilhas').select('pub,loja,at').order('pub').order('loja'));
        const por = {};
        sh.forEach((s) => { (por[s.pub] = por[s.pub] || {})[s.loja] = ms(s.at); });
        reg.pubs = {};
        d.pub = (await todos(() => sb.from('pub').select('*').order('at', { ascending: false }).order('id'))).map((r) => {
          if (r.media_path) reg.pubs[r.media_id] = { path: r.media_path, nome: r.media_nome };
          return pubDe(r, por[r.id]);
        });
      }
      if (quer.includes('seen')) {
        d.seen = { [R.conta]: {} };
        (await ok(sb.from('vistos').select('kind,at').eq('conta', R.conta))).forEach((r) => { d.seen[R.conta][r.kind] = ms(r.at); });
      }
      if (quer.includes('class')) d.class = await ok(sb.rpc('fg_classificacao'));
    }
    return d;
  }

  return {
    R, carregar, vazio,
    definirConta(c) { R.conta = c ? c.id : null; R.loja = c ? c.loja || null : null; R.staff = !!c && c.tipo !== 'cliente'; },
    async estadoContas() { return ok(sb.rpc('fg_estado_contas')); },

    pecas: {
      /* rec: { id, loja, titulo, preco, cat, mat, peso, estado, fotos: [{id, path}] } */
      async upsert(rec) {
        const r = await ok(sb.rpc('fg_guardar_peca', { p: rec }));
        await media.remover('pecas', r.removidas).catch(() => {});
      },
      async setEstado(id, estado) { falha((await sb.from('pecas').update({ estado }).eq('id', id)).error); },
      async remove(id) {
        const paths = await ok(sb.rpc('fg_apagar_peca', { pid: id }));
        await media.remover('pecas', paths).catch(() => {});
      }
    },
    lojas: {
      async updateInfo(id, f) { falha((await sb.from('lojas').update({ morada: f.morada, horario: f.horario, tel: f.tel, whats: f.whats, email: f.email }).eq('id', id)).error); }
    },
    chat: {
      async send(m) { falha((await sb.from('chat').insert({ id: m.id, autor: R.conta, txt: m.txt, urg: !!m.urg })).error); }
    },
    cot: {
      async set(dia, c) { falha((await sb.from('cotacoes').upsert({ ...cotPara(dia, c), autor: R.conta }, { onConflict: 'dia' })).error); }
    },
    lucro: {
      async set(ano, mes, valor) { falha((await sb.from('lucro').upsert({ ano, mes, loja: R.loja, valor, autor: R.conta }, { onConflict: 'ano,mes,loja' })).error); }
    },
    pub: {
      /* p: { id, titulo, texto, media: {id, tipo, nome, path?} | null }; rm: ids de ficheiros substituídos/retirados */
      async upsert(p, rm = []) {
        const m = p.media && { ...p.media, path: p.media.path || (reg.pubs[p.media.id] && reg.pubs[p.media.id].path) || null };
        const apagar = rm.map((id) => reg.pubs[id] && reg.pubs[id].path).filter(Boolean);
        const row = { id: p.id, titulo: p.titulo, texto: p.texto, media_tipo: m ? m.tipo : null, media_id: m ? m.id : null, media_nome: m ? m.nome : null, media_path: m ? m.path : null };
        falha((await sb.from('pub').upsert({ ...row, autor: R.conta }, { onConflict: 'id' })).error);
        await media.remover('pub', apagar).catch(() => {});
      },
      async remove(id, mediaId) {
        const path = mediaId && reg.pubs[mediaId] && reg.pubs[mediaId].path;
        falha((await sb.from('pub').delete().eq('id', id)).error);
        if (path) await media.remover('pub', [path]).catch(() => {});
      },
      async marcarPartilhada(id) { falha((await sb.from('pub_partilhas').insert({ pub: id, loja: R.loja, conta: R.conta })).error); },
      async desmarcarPartilhada(id) { falha((await sb.from('pub_partilhas').delete().eq('pub', id).eq('loja', R.loja)).error); }
    },
    vistos: {
      async mark(kinds) {
        const k = kinds.filter((x) => KINDS.includes(x));
        if (!k.length) return;
        falha((await sb.from('vistos').upsert(k.map((kind) => ({ conta: R.conta, kind, at: iso(Date.now()) })), { onConflict: 'conta,kind' })).error);
      }
    },
    ex: {
      async apagar() {
        const paths = await ok(sb.rpc('fg_apagar_exemplos'));
        // caminhos de fotos têm 3 partes (loja/peça/ficheiro); os de publicidade têm 2 (publicação/ficheiro)
        await media.remover('pecas', paths.filter((x) => x.split('/').length === 3)).catch(() => {});
        await media.remover('pub', paths.filter((x) => x.split('/').length === 2)).catch(() => {});
      }
    },
    classificacao: () => ok(sb.rpc('fg_classificacao'))
  };
}
