import { test, expect } from '@playwright/test';
import { par, pinRec, CONTAS } from './helpers.js';
import { runner, tab, scrollTo, pausa } from './flows.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));

/* O protótipo corre em Lisboa; a app nova corre num telemóvel de outro fuso e tem de mostrar exatamente o mesmo. */
for (const [tz, now] of [
  ['Asia/Dubai', '2026-10-31T23:30:00Z'],          // em Lisboa ainda é 31 de outubro; no Dubai já é novembro
  ['America/Los_Angeles', '2026-11-01T00:20:00Z'], // em Lisboa é 1 de novembro 00:20; em Los Angeles ainda é 31 de outubro
  ['Asia/Dubai', '2026-12-31T23:40:00Z'],          // véspera de Ano Novo
]) {
  test(`fuso do telemóvel ${tz} em ${now}`, async ({ browser }) => {
    const pg = await par(browser, { conta: 'forevervalbom', pins, tzApp: tz, now });
    const r = runner(pg);
    await r.run('fuso-inicio', pausa(500));
    await r.run('fuso-chat', async (p) => { await tab('Chat')(p); await p.waitForTimeout(500); });
    await r.run('fuso-equipa', async (p) => { await tab('Equipa')(p); await p.waitForTimeout(500); });
    await r.run('fuso-cot', async (p) => { await p.getByRole('button', { name: /^cotação diária/i }).click(); await p.waitForTimeout(700); });
    await r.run('fuso-lucro', async (p) => { await p.getByRole('button', { name: /^‹ Equipa/ }).click(); await p.waitForTimeout(300); await p.getByRole('button', { name: /^lucro do mês/i }).click(); await p.waitForTimeout(800); });
    await r.run('fuso-pub', async (p) => { await p.getByRole('button', { name: /^‹ Equipa/ }).click(); await p.waitForTimeout(300); await p.getByRole('button', { name: /^publicidade/i }).click(); await p.waitForTimeout(800); });
    expect(r.erros.join('\n')).toBe('');
  });
}
