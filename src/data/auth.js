/* Entrada com código de 4 dígitos, no servidor.
   Cada conta da equipa é um utilizador Supabase Auth cuja palavra-passe nunca sai do servidor.
   As Edge Functions `entrar`, `definir-pin` e `repor-pin` verificam o código e devolvem a sessão. */
import { rel } from './mapper.js';
const DISP = (conta) => 'fg-disp-' + conta;
const relogio = (iso) => (iso ? Date.parse(iso) - rel.skew : 0); // hora do servidor → relógio deste telemóvel

export function criaAuth(sb, repo, bloqueioCache) {
  const guarda = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const le = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let bilhete = null; // bilhete de reposição (uso único), em memória

  async function chama(nome, body) {
    const { data, error } = await sb.functions.invoke(nome, { body });
    if (error) {
      let msg = error.message || 'Erro';
      try { const j = await error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) {}
      return { ok: false, erro: msg };
    }
    return data || { ok: false, erro: 'Resposta vazia' };
  }
  async function iniciaSessao(r) {
    if (r.session) {
      const { error } = await sb.auth.setSession({ access_token: r.session.access_token, refresh_token: r.session.refresh_token });
      if (error) return { ok: false, erro: error.message };
    }
    if (r.dispositivo) guarda(DISP(r.conta), r.dispositivo);
    return r;
  }

  return {
    /* conta guardada neste telemóvel (ou null) */
    async restaurar() {
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      const conta = s && s.user && s.user.app_metadata && s.user.app_metadata.conta;
      return conta || null;
    },
    /* quais as contas com código e quais estão bloqueadas */
    async estado() {
      const linhas = await repo.estadoContas();
      const out = {};
      linhas.forEach((l) => { out[l.conta] = { temPin: !!l.tem_pin, bloqueadoAte: relogio(l.bloqueado_ate) }; });
      return out;
    },
    async entrar(conta, pin, { verificar = false } = {}) {
      const r = await chama('entrar', { conta, pin, verificar, dispositivo: le(DISP(conta)) });
      if (r.ok === false && r.bloqueado_ate) bloqueioCache.set(conta, { fails: 0, until: relogio(r.bloqueado_ate) });
      if (r.ok && !verificar) { const x = await iniciaSessao({ ...r, conta }); if (x.ok === false) return x; }
      return { ok: !!r.ok, restantes: r.restantes, bloqueadoAte: relogio(r.bloqueado_ate), erro: r.erro };
    },
    /* primeiro código, ou novo código (depois de verificar o atual, ou de uma reposição aceite) */
    async definirPin(conta, pin) {
      const r = await chama('definir-pin', { conta, pin, dispositivo: le(DISP(conta)), bilhete });
      if (r.ok) { bilhete = null; const x = await iniciaSessao({ ...r, conta }); if (x.ok === false) return x; }
      return { ok: !!r.ok, erro: r.erro };
    },
    /* "Esqueci-me": só aceite com o token deste telemóvel */
    async repor(conta) {
      const r = await chama('repor-pin', { conta, dispositivo: le(DISP(conta)) });
      if (r.ok) { bilhete = r.bilhete || null; return { ok: true }; }
      return { ok: false, naoAssociado: r.motivo === 'nao_associado', erro: r.erro };
    },
    async sair() { try { await sb.auth.signOut(); } catch (e) {} }
  };
}

/* O bloqueio do protótipo vivia no telemóvel; agora é o servidor que decide e aqui só ficam os dados para o ecrã. */
export function criaBloqueioCache() {
  const m = {};
  return {
    get: (id) => m[id] || { fails: 0, until: 0 },
    set: (id, v) => { m[id] = v; },
    all: () => m
  };
}
