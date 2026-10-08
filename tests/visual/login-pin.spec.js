import { test, expect } from '@playwright/test';
import { par, pinRec, CONTAS } from './helpers.js';
import { runner, clica, digita, pausa } from './flows.js';

const pins = Object.fromEntries(CONTAS.filter((c) => c !== 'cliente').map((c) => [c, pinRec('1234')]));

test('código novo: escolher, confirmar, não coincidem, guardar', async ({ browser }) => {
  const pg = await par(browser, {});
  const r = runner(pg);
  await r.run('pin-novo', pausa(100));
  await r.run('pin-novo-2digitos', digita('12'));
  await r.run('pin-confirmar', digita('34'));
  await r.run('pin-confirmar-voltar', clica(/^Voltar/));
  await r.run('pin-novo-de-novo', digita('1234'));
  await r.run('pin-nao-coincide', digita('4321'));
  await r.run('pin-novo-3', digita('1234'));
  await r.run('pin-guardar', digita('1234'));
  await r.run('pin-entrou', pausa(800));
  expect(r.erros.join('\n')).toBe('');
});

test('código existente: errado, bloqueio, esqueci, certo', async ({ browser }) => {
  const pg = await par(browser, { pins });
  const r = runner(pg);
  await r.run('pin-enter', pausa(100));
  await r.run('pin-errado-1', digita('9999'));
  await r.run('pin-errado-4', async (p) => { for (let i = 0; i < 3; i++) await digita('9999')(p); });
  await r.run('pin-errado-5-bloqueio', digita('9999'));
  await r.run('pin-bloqueado-tecla', digita('1'));
  await r.run('pin-esqueci-ainda-bloqueado', pausa(200));
  expect(r.erros.join('\n')).toBe('');
});

test('esqueci-me e confirmar', async ({ browser }) => {
  const pg = await par(browser, { pins });
  const r = runner(pg);
  await r.run('pin-esqueci', clica(/^Esqueci/));
  await r.run('pin-esqueci-cancelar', clica(/^Cancelar$/));
  await r.run('pin-esqueci-2', clica(/^Esqueci/));
  await r.run('pin-esqueci-ok', clica(/Repor código/));
  await r.run('pin-entrar-certo', async (p) => { await p.reload(); await p.waitForTimeout(900); });
  expect(r.erros.join('\n')).toBe('');
});

test('entrar com código certo e alterar código', async ({ browser }) => {
  const pg = await par(browser, { pins });
  const r = runner(pg);
  await r.run('pin-certo', digita('1234'));
  await r.run('pin-app', pausa(900));
  await r.run('pin-perfil', async (p) => { await p.getByRole('button', { name: 'Perfil' }).click(); await p.waitForTimeout(600); });
  await r.run('pin-alterar', clica(/Mudar o meu código/));
  await r.run('pin-alterar-atual', digita('1234'));
  await r.run('pin-alterar-novo', digita('5555'));
  await r.run('pin-alterar-confirmar', digita('5555'));
  await r.run('pin-alterar-fim', pausa(900));
  await r.run('pin-sair', async (p) => { await p.getByRole('button', { name: 'Perfil' }).click(); await p.waitForTimeout(500); await p.getByRole('button', { name: /Sair da conta/ }).first().click(); await p.waitForTimeout(700); });
  expect(r.erros.join('\n')).toBe('');
});
