import { test, expect } from '@playwright/test';
import { par, ambos, igual, CONTAS, pinRec } from './helpers.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));

test.describe('login', () => {
  test('percorrer todas as contas (entrar)', async ({ browser }) => {
    const pg = await par(browser, { pins });
    const erros = [];
    for (let i = 0; i < CONTAS.length; i++) {
      const e = await igual(pg, 'login-conta-' + i);
      if (e) erros.push(`conta ${i} (${CONTAS[i]}):\n${e}`);
      await ambos(pg, (p) => p.getByRole('button', { name: 'Conta seguinte' }).click());
      await pg.ref.waitForTimeout(400); await pg.app.waitForTimeout(400);
    }
    expect(erros.join('\n')).toBe('');
  });
});
