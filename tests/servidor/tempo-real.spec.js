/* Dois telemóveis ao mesmo tempo, contas diferentes: o que um faz aparece no outro sem recarregar. */
import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:3110';
const sql = async (q, params = []) => { const r = await fetch(API + '/__test/sql', { method: 'POST', body: JSON.stringify({ sql: q, params }) }); const j = await r.json(); if (j.erro) throw new Error(j.erro); return j.rows; };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
const digita = async (page, pin) => { for (const d of pin) await page.locator('button', { has: page.locator(`span:text-is("${d}")`) }).first().click(); await page.waitForTimeout(700); };
async function entra(page, conta) {
  await page.goto('/'); await page.waitForSelector('[data-acc-name]');
  for (let i = 0; i < 10; i++) { if (await page.getByText(conta, { exact: true }).first().isVisible().catch(() => false)) break; await page.getByRole('button', { name: 'Conta seguinte' }).click(); await page.waitForTimeout(450); }
  await digita(page, '2727'); await page.waitForSelector('[data-scroll]', { timeout: 15000 }); await page.waitForTimeout(800);
}
const tab = (page, n) => page.getByRole('button', { name: new RegExp('^' + n, 'i') }).last().click();
const telemovel = async (browser) => (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' })).newPage();
const enviar = async (page, txt) => { await page.getByPlaceholder(/Escreva (para toda a equipa|o aviso urgente)…/).fill(txt); await page.locator('button', { hasText: /enviar/i }).first().click().catch(() => page.getByPlaceholder(/Escreva/).press('Enter')); };

test.beforeAll(async () => { await fetch(API + '/__test/reset'); });
test.beforeEach(async () => { await sql('update public.pins set tentativas = 0, bloqueado_ate = null'); });

test('chat: a mensagem de um telemóvel chega ao outro, com banner; urgente em vermelho', async ({ browser }) => {
  const a = await telemovel(browser), b = await telemovel(browser);
  await entra(a, 'foreverfilipe'); await entra(b, 'forevervalbom');
  await tab(b, 'Chat'); await b.waitForTimeout(500);
  await tab(a, 'Chat');
  await enviar(a, 'Mensagem em tempo real do Filipe');
  await expect(b.getByText('Mensagem em tempo real do Filipe').first()).toBeVisible({ timeout: 8000 });
  // outro separador no Valbom: o banner "Chat · Filipe" aparece
  await tab(b, 'In[ií]cio');
  await a.getByRole('button', { name: /^Urgente/ }).click();
  await enviar(a, 'Aviso urgente do Filipe');
  await expect(b.getByText('Aviso urgente · Filipe')).toBeVisible({ timeout: 8000 });
  await expect(b.getByText('Aviso urgente do Filipe').first()).toBeVisible();
  // quem escreveu não recebe banner da sua própria mensagem
  await expect(a.locator('div[style*="z-index: 90"]').filter({ hasText: 'Aviso urgente' })).toHaveCount(0);
});

test('mensagens ao mesmo tempo nos dois telemóveis: nenhuma se perde', async ({ browser }) => {
  const a = await telemovel(browser), b = await telemovel(browser);
  await entra(a, 'foreveroficina'); await entra(b, 'foreverriotinto');
  await tab(a, 'Chat'); await tab(b, 'Chat'); await a.waitForTimeout(500);
  await Promise.all([enviar(a, 'Do oficina 1'), enviar(b, 'Do Rio Tinto 1')]);
  await Promise.all([enviar(a, 'Do oficina 2'), enviar(b, 'Do Rio Tinto 2')]);
  for (const p of [a, b]) for (const t of ['Do oficina 1', 'Do oficina 2', 'Do Rio Tinto 1', 'Do Rio Tinto 2']) await expect(p.getByText(t).first()).toBeVisible({ timeout: 8000 });
  expect((await sql("select count(*)::int n from public.chat where txt like 'Do oficina%' or txt like 'Do Rio Tinto%'"))[0].n).toBe(4);
});

test('cotação: o outro telemóvel recebe o banner "Cotação diária" e vê o preço', async ({ browser }) => {
  const a = await telemovel(browser), b = await telemovel(browser);
  await entra(a, 'forevervalbom'); await entra(b, 'foreverfilipe');
  await tab(a, 'Equipa'); await a.getByRole('button', { name: /^cotação diária/i }).click(); await a.waitForTimeout(700);
  const ins = a.locator('input[inputmode=decimal]');
  await ins.nth(0).fill('64,25'); await ins.nth(2).fill('0,88');
  await a.getByRole('button', { name: /publicar e avisar/i }).click();
  await expect(b.getByText('Cotação diária').first()).toBeVisible({ timeout: 8000 });
  await expect(b.getByText(/Ouro fino 64,25 · usado —/)).toBeVisible();
});

test('lucro: sem banner nenhum; a classificação do outro telemóvel atualiza', async ({ browser }) => {
  const a = await telemovel(browser), b = await telemovel(browser);
  await entra(a, 'foreverpedroucos'); await entra(b, 'foreveroficina');
  await tab(b, 'Equipa'); await b.getByRole('button', { name: /^lucro do mês/i }).click(); await b.waitForTimeout(800);
  await tab(a, 'Equipa'); await a.getByRole('button', { name: /^lucro do mês/i }).click(); await a.waitForTimeout(800);
  await a.locator('input[aria-label="Lucro do mês em euros"]').fill('20000');
  await a.getByRole('button', { name: /^registar/i }).first().click(); await a.locator('[data-cf-ok]').click();
  // no outro telemóvel, a Pedrouços passa para 20,0 pontos e lidera, sem banner
  await expect(b.getByText('20').first()).toBeVisible({ timeout: 8000 });
  await expect.poll(async () => b.locator('[data-count], span').filter({ hasText: /^20(,0)?$/ }).count(), { timeout: 8000 }).toBeGreaterThan(0);
  await expect(b.locator('text=registou o lucro')).toHaveCount(0);
});

test('publicidade nova chega com banner; partilha da loja aparece na BU', async ({ browser }) => {
  const bu = await telemovel(browser), loja = await telemovel(browser);
  await entra(bu, 'foreverbu'); await entra(loja, 'foreverarrifana');
  await tab(bu, 'Equipa'); await bu.getByRole('button', { name: /^publicidade/i }).click(); await bu.waitForTimeout(700);
  await bu.getByRole('button', { name: /nova publica/i }).click(); await bu.waitForTimeout(500);
  await bu.getByPlaceholder('ex.: Campanha de Natal').fill('Campanha em tempo real');
  await bu.locator('textarea').first().fill('Texto da campanha');
  await bu.locator('input[type=file]').first().setInputFiles({ name: 'c.png', mimeType: 'image/png', buffer: png });
  await bu.waitForTimeout(800);
  await bu.getByRole('button', { name: /publicar para a equipa/i }).click();
  await expect(loja.getByText('Publicidade', { exact: true }).first()).toBeVisible({ timeout: 8000 });
  await expect(loja.getByText('Nova publicação: Campanha em tempo real')).toBeVisible();
  // a loja marca como partilhada e a BU vê o visto da Arrifana
  await tab(loja, 'Equipa'); await loja.getByRole('button', { name: /^publicidade/i }).click(); await loja.waitForTimeout(700);
  const id = (await sql("select id from public.pub where titulo = 'Campanha em tempo real'"))[0].id;
  await loja.locator(`[data-share="${id}"]`).click();
  await expect(bu.getByText('✓ Arrifana')).toBeVisible({ timeout: 8000 });
});

test('cliente: vê no ecrã, sem recarregar, quando a loja muda o estado de uma peça', async ({ browser }) => {
  const cli = await telemovel(browser), loja = await telemovel(browser);
  await cli.goto('/'); await cli.waitForSelector('[data-acc-name]');
  await cli.getByRole('button', { name: 'Conta anterior' }).click(); await cli.getByRole('button', { name: /Entrar como cliente/ }).click();
  await cli.waitForSelector('[data-scroll]'); await tab(cli, 'Lojas');
  await cli.locator('button', { hasText: 'à venda' }).first().click(); await cli.waitForTimeout(600);
  await expect(cli.getByText('Disponível').first()).toBeVisible();
  await entra(loja, 'forevervalbom'); await tab(loja, 'Lojas');
  await loja.locator('button', { hasText: 'à venda' }).first().click(); await loja.waitForTimeout(600);
  await loja.locator('button', { hasText: 'Par de alianças clássicas' }).first().click(); await loja.waitForTimeout(600);
  await loja.locator('[data-sheet-panel]').getByRole('button', { name: /^Vendida/ }).click();
  await loja.getByText('Estado alterado para «Vendida».').waitFor();
  await expect(cli.getByText('Vendida').first()).toBeVisible({ timeout: 8000 });
});

test('vencedora do mês: o aviso criado na base chega como banner e abre o Lucro do mês', async ({ browser }) => {
  const p = await telemovel(browser);
  await entra(p, 'foreverfilipe');
  await sql("insert into public.avisos (id, tipo, titulo, corpo) values ('mes-teste', 'mes', 'Vencedora de outubro', 'Valbom ganhou outubro com 12,5 pontos.') on conflict (id) do nothing");
  await expect(p.getByText('Vencedora de outubro')).toBeVisible({ timeout: 8000 });
  await expect(p.getByText('Valbom ganhou outubro com 12,5 pontos.').first()).toBeVisible();
  await p.getByText('Vencedora de outubro').first().click();
  await expect(p.getByRole('button', { name: /^cotação diária/i })).toHaveCount(0);      // saiu do hub…
  await expect(p.getByText(/Temporada|temporada/).first()).toBeVisible();               // …e está no Lucro do mês
});

test('abrir a app a partir de uma notificação (/?ir=cot) vai direto à Cotação', async ({ browser }) => {
  const p = await telemovel(browser);
  await entra(p, 'forevervalbom');
  await p.goto('/?ir=cot'); await p.waitForSelector('[data-scroll]');
  await expect(p.getByRole('button', { name: 'Mês anterior' })).toBeVisible({ timeout: 8000 });
  expect(new URL(p.url()).search).toBe('');                                               // o parâmetro sai do endereço
});
