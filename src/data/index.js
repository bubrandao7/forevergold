/* Liga a camada de dados à app: acrescenta a FGCore o modo, a autenticação, o repositório e o suporte de ficheiros.
   modo "local": dados só neste navegador (o do protótipo; usado em desenvolvimento e nos testes visuais).
   modo "servidor": Supabase (dados partilhados, tempo real, Storage, códigos no servidor). */
import { MODO, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export async function instala() {
  const C = window.FGCore;
  C.modo = MODO;
  if (MODO === 'local') {
    C.auth = null; C.repo = null;
    const get = C.media.get.bind(C.media);
    C.media.url = async (id) => { const b = await get(id); return b ? URL.createObjectURL(b) : ''; };
    C.media.pathFoto = (loja, peca, id) => id;
    C.media.pathPub = (pub, id) => id;
    return;
  }
  const [{ createClient }, { criaMedia }, { criaRepo }, { criaAuth, criaBloqueioCache }, rt] = await Promise.all([
    import('@supabase/supabase-js'), import('./media.js'), import('./repo.js'), import('./auth.js'), import('./realtime.js')
  ]);
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'fg-auth' },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  const reg = { fotos: {}, pubs: {} };
  const media = criaMedia(sb, reg);
  const repo = criaRepo(sb, media, reg);
  const bloqueio = criaBloqueioCache();
  C.sb = sb; C.reg = reg; C.repo = repo; C.rt = rt;
  C.bloqueio = bloqueio;
  C.auth = criaAuth(sb, repo, bloqueio);
  // ficheiros: o resto do código usa só put / del / url / pathFoto / pathPub
  C.media = {
    put: (id, blob, ctx) => media.put(ctx.bucket, ctx.path, blob),
    del: async () => {}, // a limpeza do Storage faz-se depois de a base de dados aceitar a alteração (repo.*)
    url: (id) => media.url(id),
    pathFoto: media.pathFoto,
    pathPub: media.pathPub
  };
  // sessão: o servidor é que sabe; localStorage só guarda o último estado para arrancar depressa
  C.sessao = {
    get: () => { try { return localStorage.getItem('fg-sessao'); } catch (e) { return null; } },
    set: (v) => { try { localStorage.setItem('fg-sessao', v); } catch (e) {} },
    del: () => { try { localStorage.removeItem('fg-sessao'); } catch (e) {} }
  };
}
