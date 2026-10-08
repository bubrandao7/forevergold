import { par, ambos, igual, assenta } from './helpers.js';

/* Corre passos nas duas páginas e compara cada um. Devolve lista de erros. */
export function runner(pg) {
  const erros = [];
  const run = async (nome, fn, mask = []) => {
    try { await ambos(pg, fn); } catch (e) { erros.push(`[${nome}] PASSO FALHOU: ${e.message.split('\n')[0]}`); return; }
    const e = await igual(pg, nome.replace(/[^\w-]+/g, '_'), mask);
    if (e) erros.push(`[${nome}]\n${e}`);
  };
  return { run, erros };
}

export const ri = (re) => (p) => p.getByRole('button', { name: re }).first().click();
export const btn = (p, re) => p.getByRole('button', { name: re }).first();
export const clica = (re) => (p) => btn(p, re).click();
export const tab = (nome) => (p) => p.getByRole('button', { name: new RegExp('^' + nome, 'i') }).last().click();
export const scrollTo = (y) => (p) => p.evaluate((y) => { const s = [...document.querySelectorAll('[data-scroll]')].find((e) => e.offsetParent); if (s) s.scrollTop = y; }, y);
export const pausa = (ms = 350) => (p) => p.waitForTimeout(ms);
export const digita = (digs) => async (p) => { for (const d of digs) { await p.locator('button', { has: p.locator(`span:text-is("${d}")`) }).first().click(); } await p.waitForTimeout(450); };

/* percorre o scroll da página atual de 600 em 600 px */
export async function percorre(r, prefixo) {
  for (let i = 0; i < 6; i++) {
    await r.run(`${prefixo}-scroll${i}`, scrollTo(i * 600));
  }
}
