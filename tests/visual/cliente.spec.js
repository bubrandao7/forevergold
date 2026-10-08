import { test, expect } from '@playwright/test';
import { par } from './helpers.js';
import { runner, clica, tab, scrollTo, pausa, percorre } from './flows.js';

test('cliente: início, lojas, detalhe, peça, perfil', async ({ browser }) => {
  const pg = await par(browser, {});
  const r = runner(pg);
  await r.run('cli-login', clica(/Conta anterior/));
  await r.run('cli-entrar', clica(/Entrar como cliente/));
  await r.run('cli-inicio', pausa(600));
  await percorre(r, 'cli-inicio');
  await r.run('cli-lojas', async (p) => { await scrollTo(0)(p); await tab('Lojas')(p); await p.waitForTimeout(500); });
  await r.run('cli-loja-detalhe', async (p) => { await p.locator('button', { hasText: 'à venda' }).first().click(); await p.waitForTimeout(500); });
  await r.run('cli-loja-scroll', scrollTo(400));
  await r.run('cli-peca', async (p) => { await scrollTo(0)(p); await p.locator('button', { hasText: 'Par de alianças clássicas' }).first().click(); await p.waitForTimeout(700); });
  await r.run('cli-peca-fechar', clica(/^Fechar/));
  await r.run('cli-perfil', async (p) => { await p.getByRole('button', { name: 'Perfil' }).click(); await p.waitForTimeout(700); });
  expect(r.erros.join('\n')).toBe('');
});
