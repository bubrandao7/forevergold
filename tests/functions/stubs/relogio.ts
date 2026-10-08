/* Relógio falso para os testes: fixa "agora" na data de FG_TESTE_AGORA (só para as funções que usam new Date()). */
const t = Date.parse(Deno.env.get('FG_TESTE_AGORA') || '');
if (!isNaN(t)) {
  const Real = Date;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).Date = class extends Real {
    constructor(...a: any[]) { if (a.length === 0) super(t); else super(...(a as [any])); }
    static now() { return t; }
  };
}
