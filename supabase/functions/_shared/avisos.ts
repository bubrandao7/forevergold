/* Textos das notificações e decisão do que anunciar. Sem imports: corre em Deno e em Node (testes).
   Os textos replicam o que a app construía no feed()/notifySys() do protótipo. */

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = (n: number) => String(n).padStart(2, '0');
export const numero = (n: number, dec = 0) => Number(n).toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true });

export interface Aviso { k: string; title: string; body: string; tag: string; vibrate?: number[]; url: string }

export function chat(m: { txt: string; urg: boolean }, nomeAutor: string): Aviso {
  return { k: m.urg ? 'urg' : 'chat', title: m.urg ? 'Aviso urgente · ' + nomeAutor : 'Chat · ' + nomeAutor, body: m.txt, tag: 'fg-' + (m.urg ? 'urg' : 'chat'), vibrate: m.urg ? [40, 60, 40] : undefined, url: '/?ir=chat' };
}

type Cot = { ouro_fino: number | null; ouro_usado: number | null; prata_fina: number | null; prata_usada: number | null; nota: string; dia: string };
export function cotResumo(c: Cot) {
  const f = (x: number | null) => (x == null ? '—' : numero(x, 2));
  const parts: string[] = [];
  if (c.ouro_fino != null || c.ouro_usado != null) parts.push('Ouro fino ' + f(c.ouro_fino) + ' · lei ' + f(c.ouro_usado));
  if (c.prata_fina != null || c.prata_usada != null) parts.push('Prata fina ' + f(c.prata_fina) + ' · lei ' + f(c.prata_usada));
  return parts.join(' | ') + ' €/kg';
}
export function cot(c: Cot, nomeAutor: string): Aviso {
  const [, mm, dd] = c.dia.split('-');
  return { k: 'cot', title: 'Cotação diária', body: `${dd}/${mm}: ${cotResumo(c)} · ${nomeAutor}${c.nota ? '. ' + c.nota : ''}`, tag: 'fg-cot', url: '/?ir=cot' };
}

export function pub(p: { titulo: string }): Aviso {
  return { k: 'pub', title: 'Publicidade', body: 'Nova publicação: ' + (p.titulo || 'sem título'), tag: 'fg-pub', url: '/?ir=pub' };
}

/* ---------- vencedoras ---------- */
const lista = (nomes: string[]) => (nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1] : nomes[0]);

export interface Fecho { id: string; tipo: 'mes' | 'temporada'; titulo: string; corpo: string; semVencedora: boolean }

/* Decide o que anunciar. `classif` é o resultado de fg_classificacao; `agora` o ano/mês atuais em Lisboa;
   `jaEnviados` as chaves já anunciadas. Só olha para os últimos 3 meses fechados (e a temporada que acabou de fechar). */
export function decideFecho(classif: any, agora: { ano: number; mes: number }, jaEnviados: Set<string>): Fecho[] {
  const out: Fecho[] = [];
  const mesesFechados: Array<[number, number]> = [];
  let y = agora.ano, m = agora.mes;
  for (let i = 0; i < 3; i++) { m--; if (m === 0) { m = 12; y--; } mesesFechados.unshift([y, m]); }
  for (const [ano, mes] of mesesFechados) {
    const id = `mes-${ano}-${pad(mes)}`;
    const k = classif[String(ano)];
    if (!k || jaEnviados.has(id)) continue;
    const w = k.winners[mes - 1];
    if (w.st !== 'fechado') continue; // antes do início do jogo
    if (!w.ids.length) { out.push({ id, tipo: 'mes', titulo: '', corpo: '', semVencedora: true }); continue; }
    const pts = numero(w.pts, 1), nome = MESES[mes - 1];
    out.push({ id, tipo: 'mes', semVencedora: false, titulo: 'Vencedora de ' + nome, corpo: `${lista(w.nomes)} ${w.nomes.length > 1 ? 'ganharam' : 'ganhou'} ${nome} com ${pts} pontos.` });
  }
  const ano = agora.ano - 1, id = `temporada-${ano}`;
  const k = classif[String(ano)];
  if (k && !jaEnviados.has(id)) {
    const top = k.std.length ? k.std[0].pts : 0;
    const ganhadoras = k.std.filter((s: any) => Math.abs(s.pts - top) < 1e-9).map((s: any) => s.nome);
    if (top > 0) out.push({ id, tipo: 'temporada', semVencedora: false, titulo: 'Vencedora de ' + ano, corpo: `${lista(ganhadoras)} ${ganhadoras.length > 1 ? 'ganharam' : 'ganhou'} a temporada ${ano} com ${numero(top, 1)} pontos. Parabéns!` });
    else out.push({ id, tipo: 'temporada', titulo: '', corpo: '', semVencedora: true });
  }
  return out;
}

export function avisoDeFecho(f: Fecho): Aviso {
  return { k: 'venc', title: f.titulo, body: f.corpo, tag: 'fg-venc', url: '/?ir=lucro' };
}
