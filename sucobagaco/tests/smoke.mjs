/* Teste de fumo ponta a ponta com Playwright (Chromium).
   Uso: node tests/smoke.mjs   (usa o @playwright/test do projeto: npm install na raiz)
   Verifica: sem erros na consola nem violações da CSP, separadores, geolocalização (aceite e recusada),
   botão flutuante, ligações das lojas, e que o site funciona sem WebGL. */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { serve } from './serve.mjs';

const server = await serve(8091);
const url = 'http://127.0.0.1:8091/';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('  ok  ', name); } catch (e) { failed++; console.log('  FALHA', name, '\n       ', e.message); }
};
const newPage = async (opts = {}, { intro = false, init } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  const page = await ctx.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push('erro: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) page.problems.push(m.text()); });
  page.on('requestfailed', (r) => page.problems.push('pedido falhou: ' + r.url()));
  await page.addInitScript(([skip, extra]) => { if (skip) sessionStorage.setItem('sb-intro-visto', '1'); if (extra) eval(extra); }, [!intro, init || '']);
  await page.goto(url);
  return page;
};

console.log('Suco Bagaço — teste de fumo');

await test('carrega sem erros nem violações da CSP (com 3D)', async () => {
  const p = await newPage();
  await p.waitForTimeout(3500);
  assert.equal(await p.locator('h1').innerText().then((t) => t.replace(/\s+/g, ' ')), '100% fruta. Zero álcool. Todo o sabor.');
  const webgl = await p.evaluate(() => !!document.querySelector('[data-cups="hero"]') && !document.querySelector('.stage__fallback'));
  assert.ok(webgl, 'os copos 3D deviam estar ativos');
  assert.deepEqual(p.problems, []);
  await p.context().close();
});

await test('separadores do menu: clicar, setas, painéis e cor do cartão', async () => {
  const p = await newPage();
  const tab = (n) => p.locator(`#tab-${n}`);
  await tab('acai').click();
  assert.equal(await tab('acai').getAttribute('aria-selected'), 'true');
  assert.equal(await tab('verdes').getAttribute('aria-selected'), 'false');
  assert.ok(await p.locator('#painel-acai').isVisible());
  assert.ok(!(await p.locator('#painel-verdes').isVisible()));
  assert.match(await p.locator('#painel-acai').innerText(), /Açaí Power/);
  assert.equal(await p.locator('[data-card]').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(220, 195, 218)');
  await tab('acai').press('ArrowRight');
  assert.equal(await tab('verdes').getAttribute('aria-selected'), 'true');
  await tab('verdes').press('End');
  assert.equal(await tab('acai').getAttribute('aria-selected'), 'true');
  await p.locator('[data-go-frapes]').click();
  assert.equal(await tab('frapes').getAttribute('aria-selected'), 'true');
  await p.context().close();
});

await test('cardápio: 14 categorias, painéis, teclado e conteúdo completo', async () => {
  const p = await newPage();
  const tabs = p.locator('.ctabs [role="tab"]');
  assert.equal(await tabs.count(), 14);
  assert.equal(await p.locator('.citem').count(), 179);
  assert.ok(await p.locator('#cpanel-especiais').isVisible());
  await p.locator('#ctab-sopas').click();
  assert.ok(await p.locator('#cpanel-sopas').isVisible());
  assert.ok(!(await p.locator('#cpanel-especiais').isVisible()));
  assert.match(await p.locator('#cpanel-sopas').innerText(), /Canja de Galinha[\s\S]*Creme de Grão de Bico com Frango e Espinafre/);
  await p.locator('#ctab-iogurte').click();
  assert.match(await p.locator('#cpanel-iogurte').innerText(), /Atenas[\s\S]*Olimpo/);
  await p.locator('#ctab-vendidos').click();
  assert.match(await p.locator('#cpanel-vendidos').innerText(), /Sandes e wraps[\s\S]*Sucos/);
  await p.locator('#ctab-acai').click();
  assert.match(await p.locator('#cpanel-acai').innerText(), /chegou a Portugal/);
  await p.locator('#ctab-acai').press('ArrowRight');
  assert.equal(await p.locator('#ctab-vitaminas').getAttribute('aria-selected'), 'true');
  await p.locator('#ctab-vitaminas').press('Home');
  assert.equal(await p.locator('#ctab-especiais').getAttribute('aria-selected'), 'true');
  await p.locator('#ctab-especiais').press('End');
  assert.equal(await p.locator('#ctab-sopas').getAttribute('aria-selected'), 'true');
  // os separadores do «Escolhe o teu copo» continuam independentes
  assert.equal(await p.locator('.tabs [role="tab"]').count(), 4);
  assert.deepEqual(p.problems, []);
  await p.context().close();
});

await test('atalho para o Brasil, secção Franquia e ligações do rodapé', async () => {
  const p = await newPage();
  const br = p.locator('.nav .pill-link');
  assert.match(await br.getAttribute('href'), /sucobagaco\.com\.br/);
  assert.equal(await br.getAttribute('target'), '_blank');
  assert.deepEqual(await p.locator('.nav a').allInnerTexts().then((a) => a.map((x) => x.replace(/\s*↗/, '').trim())), ['Cardápio', 'Lojas', 'Franquia', 'Instagram', 'Suco Bagaço Brasil', 'Encontrar loja']);
  const f = p.locator('#franquia');
  assert.match(await f.locator('h2').innerText(), /Seja um franqueado\s+Suco Bagaço\./);
  assert.match(await f.innerText(), /10×[\s\S]*Melhor suco de São Paulo/);
  assert.match(await f.locator('a[href*="wa.me/351935353535"]').first().getAttribute('href'), /^https:/);
  assert.match(await f.locator('a[href*="wtennis"]').getAttribute('href'), /suco-bagaco\/$/);
  assert.equal(await p.locator('.foot-nav a[href="#franquia"]').count(), 1);
  assert.equal(await p.locator('.foot-nav a[href*="sucobagaco.com.br"]').count(), 1);
  await p.context().close();
});

await test('geolocalização aceite: lojas ordenadas e «Mais perto de ti»', async () => {
  const p = await newPage({ geolocation: { latitude: 37.14, longitude: -8.54 }, permissions: ['geolocation'] });
  const order = () => p.locator('.store h3').allInnerTexts();
  assert.deepEqual(await order(), ['Rio Tinto', 'Gaia', 'Lisboa', 'Portimão']);
  await p.locator('[data-locate]').click();
  await p.waitForFunction(() => document.querySelector('[data-geo-msg]').textContent.includes('ordenadas'));
  assert.deepEqual(await order(), ['Portimão', 'Lisboa', 'Gaia', 'Rio Tinto']);
  assert.ok(await p.locator('.store').first().locator('.store__badge').isVisible());
  assert.match(await p.locator('.store').first().locator('.store__dist').innerText(), /^a \d/);
  assert.ok(!(await p.locator('.store').nth(1).locator('.store__badge').isVisible()));
  assert.deepEqual(p.problems, []);
  await p.context().close();
});

await test('geolocalização recusada: mensagem clara e lista intacta', async () => {
  const p = await newPage({ permissions: [] });
  await p.locator('.nav [data-nearest]').click();
  await p.waitForFunction(() => document.querySelector('[data-geo-msg]').textContent.length > 0);
  assert.match(await p.locator('[data-geo-msg]').innerText(), /Escolhe a loja na lista/);
  assert.deepEqual(await p.locator('.store h3').allInnerTexts(), ['Rio Tinto', 'Gaia', 'Lisboa', 'Portimão']);
  await p.context().close();
});

await test('ligações das lojas: Google Maps e WhatsApp por loja', async () => {
  const p = await newPage();
  const hrefs = await p.locator('.store').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('a')].map((a) => a.href)));
  assert.equal(hrefs.length, 4);
  for (const [maps, wa] of hrefs) {
    assert.match(maps, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
    assert.match(wa, /^https:\/\/wa\.me\/351935353535\?text=/);
  }
  assert.match(decodeURIComponent(hrefs[1][1]), /loja de Gaia/);
  await p.context().close();
});

await test('botão flutuante: aparece depois do hero, esconde nas lojas e no rodapé', async () => {
  const p = await newPage();
  const on = () => p.locator('[data-fab]').evaluate((e) => e.classList.contains('is-on'));
  assert.equal(await on(), false);
  const jump = (y) => p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y);
  await jump(1600); await p.waitForTimeout(400);
  assert.equal(await on(), true, 'devia aparecer depois do hero');
  await jump(await p.evaluate(() => document.querySelector('#lojas').offsetTop)); await p.waitForTimeout(400);
  assert.equal(await on(), false, 'devia esconder-se na secção das lojas');
  await jump(1e6); await p.waitForTimeout(400);
  assert.equal(await on(), false, 'devia esconder-se no rodapé');
  await p.context().close();
});

await test('introdução: termina sozinha, mostra o site e não repete na mesma sessão', async () => {
  const p = await newPage({}, { intro: true });
  assert.ok(await p.evaluate(() => document.documentElement.classList.contains('intro-on')));
  await p.waitForFunction(() => !document.documentElement.classList.contains('intro-on'), null, { timeout: 9000 });
  assert.equal(await p.evaluate(() => sessionStorage.getItem('sb-intro-visto')), '1');
  assert.equal(await p.evaluate(() => document.documentElement.style.overflow), '');
  await p.reload();
  assert.ok(!(await p.evaluate(() => document.documentElement.classList.contains('intro-on'))));
  await p.context().close();
});

await test('«reduzir movimento»: sem introdução e com tudo visível', async () => {
  const p = await newPage({ reducedMotion: 'reduce' }, { intro: true });
  assert.ok(!(await p.evaluate(() => document.documentElement.classList.contains('intro-on'))));
  assert.match(await p.locator('h1 [data-up]').first().evaluate((e) => getComputedStyle(e).transform), /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  assert.equal(await p.locator('.eyebrow').first().evaluate((e) => getComputedStyle(e).opacity), '1');
  await p.context().close();
});

await test('sem WebGL: o site continua completo, com imagem de reserva nos copos', async () => {
  const p = await newPage({}, { init: "HTMLCanvasElement.prototype.getContext = () => null;" });
  await p.waitForTimeout(1500);
  assert.equal(await p.locator('.stage--hero .stage__fallback').count(), 1, 'hero com imagem de reserva');
  await p.evaluate(() => scrollTo({ top: document.querySelector('#sumos').offsetTop, behavior: 'instant' })); await p.waitForTimeout(800);
  assert.equal(await p.locator('.stage--bif .stage__fallback').count(), 1, 'Bifásico com imagem de reserva');
  assert.equal(await p.locator('[data-card] .stage__fallback').count(), 1, 'cartão do menu com imagem de reserva');
  assert.ok(await p.locator('#lojas').isVisible());
  await p.context().close();
});

await test('sem JavaScript: conteúdo todo no HTML e sem introdução a tapar a página', async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(url);
  assert.ok(await p.locator('h1').isVisible());
  assert.ok(await p.locator('.intro').evaluate((e) => getComputedStyle(e).display === 'none'));
  assert.equal(await p.locator('.store').count(), 4);
  assert.equal(await p.locator('.eyebrow').first().evaluate((e) => getComputedStyle(e).opacity), '1');
  await ctx.close();
});

await test('telemóvel (390px): sem scroll horizontal', async () => {
  const p = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.waitForTimeout(1000);
  for (const y of [0, 900, 1800, 2800, 3800, 4800]) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(120); }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, 'excede a largura em ' + over + 'px');
  await p.context().close();
});

await browser.close();
server.close();
console.log(failed ? `\n${failed} teste(s) falharam` : '\nTodos os testes passaram');
process.exit(failed ? 1 : 0);
