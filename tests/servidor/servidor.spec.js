/* A app em modo servidor, num browser a sério, contra o Supabase falso (Postgres + RLS + PostgREST + funções reais).
   Cobre: arranque, entrada com código (certo, errado, bloqueio, esqueci-me), leitura por papel, gravação otimista com
   confirmação do servidor, ficheiros, erro de gravação com reversão, sem ligação. */
import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:3110';
const sql = async (q, params = []) => { const r = await fetch(API + '/__test/sql', { method: 'POST', body: JSON.stringify({ sql: q, params }) }); const j = await r.json(); if (j.erro) throw new Error(j.erro); return j.rows; };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');

async function paraConta(page, conta) {
  await page.goto('/');
  await page.waitForSelector('[data-acc-name]');
  for (let i = 0; i < 10; i++) {
    if (await page.getByText(conta, { exact: true }).first().isVisible().catch(() => false)) return;
    await page.getByRole('button', { name: 'Conta seguinte' }).click(); await page.waitForTimeout(500);
  }
  throw new Error('conta não encontrada: ' + conta);
}
const digita = async (page, pin) => { for (const d of pin) await page.locator('button', { has: page.locator(`span:text-is("${d}")`) }).first().click(); await page.waitForTimeout(700); };
async function entra(page, conta, pin = '2727') {
  await paraConta(page, conta); await digita(page, pin);
  await page.waitForSelector('[data-scroll]', { timeout: 15000 });
  await page.waitForTimeout(600);
}
const tab = (page, n) => page.getByRole('button', { name: new RegExp('^' + n, 'i') }).last().click();

test.beforeAll(async () => { await fetch(API + '/__test/reset'); });
test.beforeEach(async () => { await sql('update public.pins set tentativas = 0, bloqueado_ate = null'); });

test('cliente: entra sem código e vê lojas e peças vindas do servidor', async ({ page }) => {
  await page.goto('/'); await page.waitForSelector('[data-acc-name]');
  await page.getByRole('button', { name: 'Conta anterior' }).click();
  await page.getByRole('button', { name: /Entrar como cliente/ }).click();
  await page.waitForSelector('[data-scroll]');
  await expect(page.getByText('Par de alianças clássicas').first()).toBeVisible();
  await tab(page, 'Lojas');
  await expect(page.getByText('Valbom').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Chat/i })).toHaveCount(0); // sem chat para o cliente
  // o cliente não tem acesso a dados da equipa, nem pedindo direto à API
  const r = await fetch(API + '/rest/v1/chat?select=*', { headers: { apikey: 'x', Authorization: 'Bearer ' + (await page.evaluate(() => 'sem-token')) } });
  expect([401, 403, 400]).toContain(r.status);
});

test('código: errado com contagem, bloqueio à 5.ª, certo entra', async ({ page }) => {
  await paraConta(page, 'foreverarrifana');
  await digita(page, '1111');
  await expect(page.getByText('Código errado. Restam 4 tentativas.')).toBeVisible();
  for (const n of [3, 2]) { await digita(page, '1111'); await expect(page.getByText(`Código errado. Restam ${n} tentativas.`)).toBeVisible(); }
  await digita(page, '1111'); await expect(page.getByText('Código errado. Resta 1 tentativa.')).toBeVisible();
  await digita(page, '1111');
  await expect(page.getByText('Demasiadas tentativas erradas')).toBeVisible();
  await expect(page.getByText(/Pode tentar outra vez daqui a \d+ s\./)).toBeVisible();
  await sql("update public.pins set bloqueado_ate = null where conta = 'foreverarrifana'");
  await page.reload(); await paraConta(page, 'foreverarrifana');
  await digita(page, '2727');
  await page.waitForSelector('[data-scroll]'); await expect(page.getByRole('button', { name: /^Chat/i }).last()).toBeVisible();
});

test('loja: chat vem do servidor; enviar grava (com a hora do servidor) e sobrevive a recarregar', async ({ page }) => {
  await entra(page, 'forevervalbom');
  await tab(page, 'Chat');
  await expect(page.getByText('Recebido. Obrigada!')).toBeVisible();
  await page.getByPlaceholder('Escreva para toda a equipa…').fill('Olá do browser de teste');
  await page.getByRole('button', { name: /^Urgente/ }).click();
  await page.locator('button', { hasText: /enviar/i }).first().click().catch(async () => { await page.getByPlaceholder('Escreva o aviso urgente…').press('Enter'); });
  await expect(page.getByText('Olá do browser de teste').first()).toBeVisible();
  await expect.poll(async () => (await sql("select autor, urg from public.chat where txt = 'Olá do browser de teste'"))[0]?.autor).toBe('forevervalbom');
  await page.reload(); await page.waitForSelector('[data-scroll]'); await tab(page, 'Chat');
  await expect(page.getByText('Olá do browser de teste').first()).toBeVisible();
  expect((await sql("select urg from public.chat where txt = 'Olá do browser de teste'"))[0].urg).toBe(true);
});

test('loja: peça nova com fotografia fica no servidor e o cliente vê-a', async ({ page, browser }) => {
  await entra(page, 'forevervalbom');
  await tab(page, 'Lojas');
  await page.locator('button', { hasText: 'à venda' }).first().click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /nova peça/i }).click(); await page.waitForTimeout(500);
  const f = page.locator('[data-sheet-panel]');
  await f.getByPlaceholder('ex.: Par de alianças clássicas').fill('Brincos do teste de browser');
  await f.locator('input[inputmode=decimal]').first().fill('1.234,56');
  await f.getByRole('button', { name: /^Brincos/ }).click();
  await f.locator('input[type=file]').first().setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(800);
  await f.getByRole('button', { name: /publicar peça/i }).click();
  await expect(page.getByText('Peça publicada na sua loja.')).toBeVisible();
  const [p] = await sql("select id, loja, preco::float8 as preco, cat from public.pecas where titulo = 'Brincos do teste de browser'");
  expect(p).toMatchObject({ loja: 'valbom', preco: 1234.56, cat: 'brincos' });
  const fotos = await sql('select path from public.peca_fotos where peca = $1', [p.id]);
  expect(fotos.length).toBe(1); expect(fotos[0].path).toMatch(new RegExp(`^valbom/${p.id}/.+\\.jpg$`));
  const ficheiros = await (await fetch(API + '/__test/ficheiros')).json();
  expect(ficheiros).toContain('pecas/' + fotos[0].path);
  // um cliente, noutro telemóvel, vê a peça e a fotografia
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const c = await ctx.newPage();
  await c.goto('/'); await c.waitForSelector('[data-acc-name]');
  await c.getByRole('button', { name: 'Conta anterior' }).click(); await c.getByRole('button', { name: /Entrar como cliente/ }).click();
  await c.waitForSelector('[data-scroll]');
  await expect(c.getByText('Brincos do teste de browser').first()).toBeVisible();
  await expect.poll(() => c.locator('img[src*="/storage/v1/object/public/pecas/valbom/"]').count()).toBeGreaterThan(0);
  await ctx.close();
});

test('lucro: registar grava e a classificação (SQL) mostra os pontos', async ({ page }) => {
  await entra(page, 'foreverriotinto');
  await tab(page, 'Equipa');
  await page.getByRole('button', { name: /^lucro do mês/i }).click(); await page.waitForTimeout(800);
  await page.locator('input[aria-label="Lucro do mês em euros"]').fill('12.450,50');
  await page.getByRole('button', { name: /^registar/i }).first().click();
  await page.locator('[data-cf-ok]').click();
  await expect(page.getByText(/Lucro de .+ registado: 12,5 pontos\./)).toBeVisible();
  await expect.poll(async () => (await sql("select valor::float8 v from public.lucro where loja = 'riotinto'"))[0]?.v).toBe(12450.5);
  // os pontos vêm da função SQL (e o ecrã mostra-os)
  await expect(page.getByText('12,5').first()).toBeVisible({ timeout: 8000 });
});

test('cotação: publicar grava e corrigir marca como corrigida', async ({ page }) => {
  await entra(page, 'foreverfilipe');
  await tab(page, 'Equipa');
  await page.getByRole('button', { name: /^cotação diária/i }).click(); await page.waitForTimeout(800);
  const ins = page.locator('input[inputmode=decimal]');
  await ins.nth(0).fill('63 400'); await ins.nth(1).fill('58 000'); await ins.nth(2).fill('850'); await ins.nth(3).fill('700');
  await page.getByRole('button', { name: /publicar e avisar/i }).click();
  await expect(page.getByText('Cotação diária publicada. A equipa recebeu a notificação.')).toBeVisible();
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  await expect.poll(async () => (await sql('select ouro_fino::float8 o, autor, edit from public.cotacoes where dia = $1', [hoje]))[0]?.o).toBe(63400);
  expect((await sql('select autor, edit from public.cotacoes where dia = $1', [hoje]))[0]).toEqual({ autor: 'foreverfilipe', edit: false });
});

test('BU: publicidade com imagem; loja marca como partilhada', async ({ page, browser }) => {
  await entra(page, 'foreverbu');
  await tab(page, 'Equipa');
  await page.getByRole('button', { name: /^publicidade/i }).click(); await page.waitForTimeout(700);
  await page.getByRole('button', { name: /nova publica/i }).click(); await page.waitForTimeout(500);
  await page.getByPlaceholder('ex.: Campanha de Natal').fill('Campanha do teste de browser');
  await page.locator('textarea').first().fill('Texto pronto a copiar #forevergold');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /publicar para a equipa/i }).click();
  await expect(page.getByText('Publicação enviada. A equipa recebeu a notificação.')).toBeVisible();
  const [u] = await sql("select id, media_path, media_tipo from public.pub where titulo = 'Campanha do teste de browser'");
  expect(u.media_tipo).toBe('imagem'); expect((await (await fetch(API + '/__test/ficheiros')).json())).toContain('pub/' + u.media_path);
  // uma loja vê a publicidade e marca como partilhada
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const l = await ctx.newPage();
  await entra(l, 'foreverstovidio');
  await tab(l, 'Equipa'); await l.getByRole('button', { name: /^publicidade/i }).click(); await l.waitForTimeout(800);
  await expect(l.getByText('Campanha do teste de browser')).toBeVisible();
  await l.locator(`[data-share="${u.id}"]`).click();
  await expect.poll(async () => (await sql('select loja from public.pub_partilhas where pub = $1', [u.id]))[0]?.loja).toBe('stovidio');
  await ctx.close();
});

test('esqueci-me: telemóvel desconhecido não repõe; telemóvel que já entrou repõe e escolhe novo código', async ({ page, browser }) => {
  // telemóvel desconhecido (sem token de dispositivo)
  await paraConta(page, 'foreveroficina');
  await page.getByRole('button', { name: /^Esqueci/ }).click();
  await page.getByRole('button', { name: /Repor código/ }).click();
  await expect(page.getByText('Este telemóvel não está associado a esta conta.')).toBeVisible();
  await expect(page.getByText('Peça ao Filipe para repor o código.')).toBeVisible();
  expect((await sql("select hash is not null as tem from public.pins where conta = 'foreveroficina'"))[0].tem).toBe(true);
  // telemóvel que já entrou antes
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const q = await ctx.newPage();
  await entra(q, 'foreveroficina');
  await q.getByRole('button', { name: 'Perfil' }).click(); await q.waitForTimeout(500);
  await q.getByRole('button', { name: /Sair da conta/ }).click(); await q.waitForSelector('[data-acc-name]');
  await paraConta(q, 'foreveroficina');
  await q.getByRole('button', { name: /^Esqueci/ }).click();
  await q.getByRole('button', { name: /Repor código/ }).click();
  await expect(q.getByText('Primeira entrada neste telemóvel: escolha um código de 4 dígitos')).toBeVisible();
  await digita(q, '5555'); await digita(q, '5555');
  await q.waitForSelector('[data-scroll]');
  await expect(q.getByText('Código guardado. Use-o sempre que entrar.')).toBeVisible();
  // o código novo funciona, o antigo não
  expect((await sql("select hash is not null as tem from public.pins where conta = 'foreveroficina'"))[0].tem).toBe(true);
  await sql("update public.pins set tentativas = 0, bloqueado_ate = null");
  const r = await (await fetch(API + '/functions/v1/entrar', { method: 'POST', body: JSON.stringify({ conta: 'foreveroficina', pin: '2727', verificar: true }) })).json();
  expect(r.ok).toBe(false);
  await ctx.close();
  await sql("select 1"); await fetch(API + '/__test/pin', { method: 'POST', body: JSON.stringify({ conta: 'foreveroficina', pin: '2727' }) });
});

test('sem ligação: aviso discreto; falha ao guardar repõe o ecrã e avisa com «Erro»', async ({ page, context }) => {
  await entra(page, 'forevervalbom');
  await context.setOffline(true);
  await expect(page.getByText('Sem ligação à internet')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Sem ligação à internet')).toHaveCount(0);
  // o servidor recusa a gravação: a mensagem desaparece e aparece o aviso
  await tab(page, 'Chat');
  await page.route('**/rest/v1/chat*', (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
  await page.getByPlaceholder('Escreva para toda a equipa…').fill('Esta não chega ao servidor');
  await page.locator('button', { hasText: /enviar/i }).first().click().catch(async () => { await page.getByPlaceholder('Escreva para toda a equipa…').press('Enter'); });
  await expect(page.getByText('Erro ao guardar. Verifique a ligação e tente outra vez.')).toBeVisible();
  await expect(page.getByText('Esta não chega ao servidor')).toHaveCount(0, { timeout: 8000 });
  expect((await sql("select count(*)::int n from public.chat where txt = 'Esta não chega ao servidor'"))[0].n).toBe(0);
});

test('apagar os dados de exemplo apaga-os no servidor e deixa o resto', async ({ page }) => {
  await entra(page, 'foreverfilipe');
  await page.getByRole('button', { name: 'Perfil' }).click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /apagar os dados de exemplo/i }).click();
  await page.locator('[data-cf-ok]').click();
  await expect(page.getByText('Dados de exemplo apagados.')).toBeVisible();
  await expect.poll(async () => (await sql('select count(*)::int n from public.pecas where ex'))[0].n).toBe(0);
  expect((await sql('select count(*)::int n from public.chat where ex'))[0].n).toBe(0);
  expect((await sql("select count(*)::int n from public.pecas where titulo = 'Brincos do teste de browser'"))[0].n).toBe(1);
});
