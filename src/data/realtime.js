/* Tempo real: cada alteração feita noutro telemóvel chega aqui e é aplicada a `data` (o mesmo objeto que a app usa).
   Depois chama `avisar()` e a app decide se mostra banner (feed/showBanner/notifySys, como no protótipo). */
import { ms, lojaDe, pecaDe, chatDe, cotDe, lucroDe, pubDe } from './mapper.js';

const TABELAS = ['lojas', 'pecas', 'peca_fotos', 'chat', 'cotacoes', 'lucro', 'pub', 'pub_partilhas', 'vistos'];

/* aplica um evento a data; devolve true se mudou algo que o ecrã mostra */
export function aplica(data, reg, tabela, tipo, n, a) {
  const del = tipo === 'DELETE', r = del ? a : n;
  const porId = (lista, id) => lista.findIndex((x) => x.id === id);
  const poe = (lista, obj, cmp) => { const i = porId(lista, obj.id); if (i >= 0) lista[i] = obj; else { lista.push(obj); if (cmp) lista.sort(cmp); } };
  switch (tabela) {
    case 'lojas': if (!del) data.lojas[r.id] = lojaDe(r); return true;
    case 'pecas': {
      if (del) { data.pecas = data.pecas.filter((p) => p.id !== r.id); return true; }
      const antiga = data.pecas.find((p) => p.id === r.id);
      const novo = pecaDe(r, (antiga ? antiga.fotos : []).map((id) => ({ id })));
      poe(data.pecas, novo, (x, y) => y.at - x.at);
      return true;
    }
    case 'peca_fotos': {
      if (del) {
        const f = reg.fotos[r.id]; delete reg.fotos[r.id];
        const p = f && data.pecas.find((x) => x.id === f.peca);
        if (p) p.fotos = p.fotos.filter((id) => id !== r.id);
        return true;
      }
      reg.fotos[r.id] = { peca: r.peca, pos: r.pos, path: r.path };
      const p = data.pecas.find((x) => x.id === r.peca);
      if (p) {
        const todas = Object.entries(reg.fotos).filter(([, v]) => v.peca === r.peca).sort((x, y) => x[1].pos - y[1].pos).map(([id]) => id);
        p.fotos = todas;
      }
      return true;
    }
    case 'chat': if (!del) poe(data.chat, chatDe(r), (x, y) => x.at - y.at); return !del;
    case 'cotacoes': {
      if (del) { delete data.cot[r.dia]; return true; }
      data.cot[r.dia] = cotDe(r); return true;
    }
    case 'lucro': {
      if (del) { const Y = data.lucro[r.ano], L = Y && Y[r.loja]; if (L) delete L[r.mes]; return true; }
      const Y = (data.lucro[r.ano] = data.lucro[r.ano] || {}), L = (Y[r.loja] = Y[r.loja] || {}); L[r.mes] = lucroDe(r); return true;
    }
    case 'pub': {
      if (del) { data.pub = data.pub.filter((p) => p.id !== r.id); return true; }
      const antiga = data.pub.find((p) => p.id === r.id);
      if (r.media_path) reg.pubs[r.media_id] = { path: r.media_path, nome: r.media_nome };
      poe(data.pub, pubDe(r, antiga ? antiga.partilhas : {}), (x, y) => y.at - x.at);
      return true;
    }
    case 'pub_partilhas': {
      const p = data.pub.find((x) => x.id === r.pub);
      if (!p) return false;
      p.partilhas = Object.assign({}, p.partilhas);
      if (del) delete p.partilhas[r.loja]; else p.partilhas[r.loja] = ms(r.at);
      return true;
    }
    case 'vistos': {
      if (del) return false;
      const s = (data.seen[r.conta] = Object.assign({}, data.seen[r.conta]));
      s[r.kind] = ms(r.at); return true;
    }
  }
  return false;
}

/* Subscreve o Realtime. `aposEvento(tabela)` corre depois de cada alteração aplicada;
   `aposReligar()` corre quando o canal volta depois de uma quebra (para recarregar o que se perdeu). */
export function subscreve(sb, data, reg, { staff, aposEvento, aposReligar }) {
  const tabelas = staff ? TABELAS : ['lojas', 'pecas', 'peca_fotos'];
  let primeiro = true;
  const canal = sb.channel('fg-' + Math.random().toString(36).slice(2, 8));
  tabelas.forEach((t) => {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => {
      try { if (aplica(data, reg, t, p.eventType, p.new, p.old)) aposEvento(t); } catch (e) { console.warn('[tempo real]', t, e); }
    });
  });
  canal.subscribe((estado) => {
    if (estado === 'SUBSCRIBED') { if (!primeiro) aposReligar(); primeiro = false; }
  });
  return () => { sb.removeChannel(canal); };
}
