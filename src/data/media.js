/* Fotografias e ficheiros de publicidade no Supabase Storage.
   Buckets: `pecas` (público: o cliente vê as fotos) e `pub` (privado, só equipa; URL assinado). */
export function criaMedia(sb, reg) {
  const ext = (nome, tipo) => {
    const m = /\.([a-z0-9]{2,5})$/i.exec(nome || '');
    return (m ? m[1] : tipo === 'video' ? 'mp4' : 'jpg').toLowerCase();
  };
  const erro = (e) => { throw new Error((e && e.message) || 'Erro ao guardar o ficheiro.'); };
  return {
    pathFoto: (loja, peca, id) => `${loja}/${peca}/${id}.jpg`,
    pathPub: (pub, id, nome, tipo) => `${pub}/${id}.${ext(nome, tipo)}`,
    async put(bucket, path, blob) {
      const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: blob.type || undefined, upsert: true, cacheControl: '31536000' });
      if (error) erro(error);
      return path;
    },
    async remover(bucket, paths) {
      const p = (paths || []).filter(Boolean);
      if (!p.length) return;
      const { error } = await sb.storage.from(bucket).remove(p);
      if (error) erro(error);
    },
    /* id (de foto ou de ficheiro de publicidade) → URL utilizável em <img>, <video> e <a download> */
    async url(id) {
      const f = reg.fotos[id];
      if (f) return sb.storage.from('pecas').getPublicUrl(f.path).data.publicUrl;
      const m = reg.pubs[id];
      if (m) {
        const { data, error } = await sb.storage.from('pub').createSignedUrl(m.path, 86400, { download: m.nome || true });
        if (error) erro(error);
        return data.signedUrl;
      }
      return '';
    }
  };
}
