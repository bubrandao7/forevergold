import { test, expect } from '@playwright/test';
import { par, pinRec, CONTAS } from './helpers.js';
import { runner, tab, scrollTo, pausa, ri } from './flows.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));

test('com movimento (animações congeladas no mesmo instante): login e equipa', async ({ browser }) => {
  const pg = await par(browser, { conta: null, pins, motion: true });
  const r = runner(pg);
  await r.run('mov-login', pausa(100));
  await r.run('mov-login-pin', async (p) => { for (const d of '12') await p.locator('button', { has: p.locator(`span:text-is("${d}")`) }).first().click(); await p.waitForTimeout(300); });
  expect(r.erros.join('\n')).toBe('');
});

test('com movimento: app (cliente e loja)', async ({ browser }) => {
  for (const conta of ['cliente', 'forevervalbom']) {
    const pg = await par(browser, { conta, pins, motion: true });
    const r = runner(pg);
    await r.run(`mov-${conta}-inicio`, pausa(300));
    for (const y of [700, 1400, 2100, 2800]) await r.run(`mov-${conta}-scroll${y}`, scrollTo(y));
    await r.run(`mov-${conta}-lojas`, async (p) => { await scrollTo(0)(p); await tab('Lojas')(p); await p.waitForTimeout(400); });
    if (conta !== 'cliente') {
      await r.run(`mov-${conta}-equipa`, async (p) => { await tab('Equipa')(p); await p.waitForTimeout(400); });
      await r.run(`mov-${conta}-cot`, async (p) => { await p.getByRole('button', { name: /^cotação diária/i }).click(); await p.waitForTimeout(500); });
      await r.run(`mov-${conta}-lucro`, async (p) => { await p.getByRole('button', { name: /^‹ Equipa/ }).click(); await p.waitForTimeout(300); await p.getByRole('button', { name: /^lucro do mês/i }).click(); await p.waitForTimeout(600); });
      await r.run(`mov-${conta}-chat`, async (p) => { await tab('Chat')(p); await p.waitForTimeout(500); });
    }
    expect(r.erros.join('\n')).toBe('');
  }
});
