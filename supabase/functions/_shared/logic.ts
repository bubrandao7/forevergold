/* Regras dos códigos de 4 dígitos. Sem imports: tudo o que toca no exterior entra por `deps`,
   para se poder testar em Node (tests/functions) e correr em Deno (Edge Functions) com o mesmo código. */

export type Sessao = { access_token: string; refresh_token: string };
export type LinhaPin = { hash: string | null; bilhete_hash: string | null; bilhete_ate: string | null } | null;

export interface Deps {
  contaExiste(conta: string): Promise<boolean>;
  reservar(conta: string): Promise<{ estado: 'ok' | 'sem_pin' | 'bloqueado'; hash?: string; bloqueado_ate?: string }>;
  resultado(conta: string, certo: boolean): Promise<{ ok: boolean; restantes?: number; bloqueado_ate?: string }>;
  getPin(conta: string): Promise<LinhaPin>;
  setPin(conta: string, v: { hash: string | null; bilhete_hash: string | null; bilhete_ate: string | null }): Promise<void>;
  dispositivoValido(conta: string, tokenHash: string): Promise<boolean>;
  addDispositivo(conta: string, tokenHash: string, ua: string | null): Promise<void>;
  apagarDispositivos(conta: string): Promise<void>;
  hashar(conta: string, pin: string): Promise<string>;
  comparar(conta: string, pin: string, hash: string): Promise<boolean>;
  sessao(conta: string): Promise<Sessao>;
  quemEh(jwt: string | null): Promise<string | null>;
  aleatorio(): string;
  sha256(txt: string): Promise<string>;
  agora(): number;
}

const PIN = /^\d{4}$/;
const BILHETE_MS = 10 * 60 * 1000;

export function criaPins(d: Deps) {
  /* devolve o token do dispositivo se for preciso criar um (a primeira entrada bem-sucedida neste telemóvel) */
  async function dispositivoPara(conta: string, dispositivo: string | null | undefined, ua: string | null) {
    if (dispositivo && (await d.dispositivoValido(conta, await d.sha256(dispositivo)))) return undefined;
    const t = d.aleatorio();
    await d.addDispositivo(conta, await d.sha256(t), ua);
    return t;
  }

  return {
    async entrar(b: any, ua: string | null = null) {
      const conta = String(b?.conta || ''), pin = String(b?.pin || '');
      if (!(await d.contaExiste(conta))) return { ok: false, erro: 'Conta desconhecida.' };
      if (!PIN.test(pin)) return { ok: false, erro: 'O código tem 4 algarismos.' };
      const r = await d.reservar(conta);
      if (r.estado === 'sem_pin') return { ok: false, semPin: true, erro: 'Esta conta ainda não tem código.' };
      if (r.estado === 'bloqueado') return { ok: false, restantes: 0, bloqueado_ate: r.bloqueado_ate };
      const certo = await d.comparar(conta, pin, r.hash as string);
      const res = await d.resultado(conta, certo);
      if (!certo) return { ok: false, restantes: res.restantes, bloqueado_ate: res.bloqueado_ate };
      if (b?.verificar) return { ok: true };
      const dispositivo = await dispositivoPara(conta, b?.dispositivo, ua);
      return { ok: true, session: await d.sessao(conta), ...(dispositivo ? { dispositivo } : {}) };
    },

    /* jwt: o token de sessão de quem pede (ou null) */
    async definirPin(b: any, jwt: string | null, ua: string | null = null) {
      const conta = String(b?.conta || ''), pin = String(b?.pin || '');
      if (!(await d.contaExiste(conta))) return { ok: false, erro: 'Conta desconhecida.' };
      if (!PIN.test(pin)) return { ok: false, erro: 'O código tem 4 algarismos.' };
      const p = await d.getPin(conta);
      const daConta = (await d.quemEh(jwt)) === conta;
      let autorizado = daConta;
      if (!autorizado) {
        if (!p) autorizado = true;                                   // nunca teve código: primeiro uso
        else if (p.hash === null) {
          if (!p.bilhete_hash) autorizado = true;                    // reposta pelo administrador: escolhe já
          else autorizado = !!b?.bilhete && new Date(p.bilhete_ate as string).getTime() > d.agora() && (await d.sha256(String(b.bilhete))) === p.bilhete_hash;
        }
      }
      if (!autorizado) return { ok: false, erro: 'Sem permissão para mudar este código.' };
      await d.setPin(conta, { hash: await d.hashar(conta, pin), bilhete_hash: null, bilhete_ate: null });
      await d.resultado(conta, true);
      const dispositivo = await dispositivoPara(conta, b?.dispositivo, ua);
      return { ok: true, session: await d.sessao(conta), ...(dispositivo ? { dispositivo } : {}) };
    },

    /* "Esqueci-me": só com o token de confiança deste telemóvel */
    async reporPin(b: any) {
      const conta = String(b?.conta || '');
      if (!(await d.contaExiste(conta))) return { ok: false, erro: 'Conta desconhecida.' };
      const disp = b?.dispositivo ? String(b.dispositivo) : '';
      if (!disp || !(await d.dispositivoValido(conta, await d.sha256(disp)))) return { ok: false, motivo: 'nao_associado' };
      const bilhete = d.aleatorio();
      await d.setPin(conta, { hash: null, bilhete_hash: await d.sha256(bilhete), bilhete_ate: new Date(d.agora() + BILHETE_MS).toISOString() });
      await d.resultado(conta, true);
      return { ok: true, bilhete };
    },

    /* administração (Filipe): repõe o código de uma conta (e esquece os telemóveis associados).
       Com `pin`, define já esse código; sem `pin`, deixa a conta sem código (escolhe no primeiro uso). */
    async adminRepor(b: any) {
      const conta = String(b?.conta || '');
      if (!(await d.contaExiste(conta))) return { ok: false, erro: 'Conta desconhecida.' };
      const pin = b?.pin == null ? null : String(b.pin);
      if (pin !== null && !PIN.test(pin)) return { ok: false, erro: 'O código tem 4 algarismos.' };
      await d.apagarDispositivos(conta);
      await d.setPin(conta, { hash: pin === null ? null : await d.hashar(conta, pin), bilhete_hash: null, bilhete_ate: null });
      await d.resultado(conta, true);
      return { ok: true };
    }
  };
}
