/* Linhas da base de dados ⇄ objetos que a app já usa (a forma do antigo `data` do protótipo).
   Os instantes do servidor são convertidos para o relógio deste telemóvel (menos o desacerto medido ao arrancar),
   para as comparações com Date.now() (banners, "novas", "há 5 min") continuarem certas. */
export const rel = { skew: 0 }; // skew = relógio do servidor − relógio do telemóvel (ms)
export const ms = (iso) => (iso ? Date.parse(iso) - rel.skew : undefined);
export const iso = (t) => new Date(t + rel.skew).toISOString();
const num = (x) => (x == null ? null : Number(x));

export const lojaDe = (r) => ({ id: r.id, nome: r.nome, zona: r.zona, morada: r.morada, horario: r.horario, tel: r.tel, whats: r.whats, email: r.email });

export const pecaDe = (r, fotos) => ({
  id: r.id, loja: r.loja, cat: r.cat, titulo: r.titulo, preco: num(r.preco), mat: r.mat, peso: num(r.peso), estado: r.estado,
  fotos: (fotos || []).map((f) => f.id), ex: !!r.ex, at: ms(r.at), upd: r.upd ? ms(r.upd) : undefined
});

export const chatDe = (r) => ({ id: r.id, by: r.autor, at: ms(r.at), txt: r.txt, urg: !!r.urg, ex: !!r.ex });

export const cotDe = (r) => ({ of: num(r.ouro_fino), ou: num(r.ouro_usado), pf: num(r.prata_fina), pu: num(r.prata_usada), nota: r.nota || '', by: r.autor, at: ms(r.at), edit: !!r.edit, ex: !!r.ex });
export const cotPara = (dia, c) => ({ dia, ouro_fino: c.of ?? null, ouro_usado: c.ou ?? null, prata_fina: c.pf ?? null, prata_usada: c.pu ?? null, nota: c.nota || '' });

export const lucroDe = (r) => ({ valor: num(r.valor), at: ms(r.at), by: r.autor });

export const pubDe = (r, partilhas) => ({
  id: r.id, by: r.autor, at: ms(r.at), titulo: r.titulo, texto: r.texto || '',
  media: r.media_path ? { id: r.media_id, tipo: r.media_tipo, nome: r.media_nome } : null,
  partilhas: partilhas || {}, ex: !!r.ex, upd: r.upd ? ms(r.upd) : undefined
});
