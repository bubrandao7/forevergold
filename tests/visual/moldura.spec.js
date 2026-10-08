import { test, expect } from '@playwright/test';
import { par, pinRec, CONTAS } from './helpers.js';
import { runner, tab, pausa } from './flows.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));

test('moldura de telemóvel em ecrã de computador (1280×900)', async ({ browser }) => {
  const pg = await par(browser, { conta: null, pins, viewport: { width: 1280, height: 900 } });
  const r = runner(pg);
  await r.run('mold-login', pausa(100));
  for (const conta of ['forevervalbom']) {
    const q = await par(browser, { conta, pins, viewport: { width: 1280, height: 900 } });
    const rr = runner(q);
    await rr.run('mold-inicio', pausa(500));
    await rr.run('mold-chat', async (p) => { await tab('Chat')(p); await p.waitForTimeout(400); });
    r.erros.push(...rr.erros);
  }
  expect(r.erros.join('\n')).toBe('');
});
