import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const REF = 'http://127.0.0.1:5000/ForeverGold%20App.dc.html';
export const APP = 'http://127.0.0.1:4173/';
export const NOW = '2026-10-08T14:30:00+01:00'; // horário de verão em Lisboa
const OUT = path.join(ROOT, 'tests/visual/__out__');
fs.mkdirSync(OUT, { recursive: true });

export const CONTAS = ['cliente', 'forevervalbom', 'foreverstovidio', 'foreverpedroucos', 'foreverriotinto', 'foreverarrifana', 'foreveroficina', 'foreverbu', 'foreverfilipe'];
const SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2';
export const pinRec = (pin) => ({ salt: SALT, hash: 's:' + crypto.createHash('sha256').update('fg|' + SALT + '|' + pin).digest('hex'), at: 1 });

/* Router: React por UMD local, fontes locais. Igual nos dois lados. */
async function rotas(page, origin) {
  const nm = (p) => path.join(ROOT, 'node_modules', p);
  await page.route('https://unpkg.com/react@18.3.1/umd/react.production.min.js', (r) => r.fulfill({ path: nm('react/umd/react.production.min.js'), contentType: 'application/javascript' }));
  await page.route('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', (r) => r.fulfill({ path: nm('react-dom/umd/react-dom.production.min.js'), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => {
    const css = fs.readFileSync(path.join(ROOT, 'src/fonts/fonts.css'), 'utf8').replace(/url\('\.\/([^']+)'\)/g, `url('${origin}/__fonts/$1')`);
    r.fulfill({ body: css, contentType: 'text/css' });
  });
  await page.route('**/__fonts/*', (r) => r.fulfill({ path: path.join(ROOT, 'src/fonts', r.request().url().split('/').pop()), contentType: 'font/woff2' }));
}

/* Abre a referência ('ref') ou a app nova ('app'), com o relógio fixo e Math.random com semente. */
export async function open(page, which, { conta = null, pins = {}, extra = null } = {}) {
  const url = which === 'ref' ? REF : APP;
  await rotas(page, new URL(url).origin);
  await page.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(url);
  await pronta(page);
  // 1.ª carga criou o seed; agora junto códigos e sessão e recarrego
  await page.evaluate(({ pins, conta, extra }) => {
    const d = JSON.parse(localStorage.getItem('fg-app-v1'));
    Object.assign(d.pins, pins);
    if (extra) extra.forEach((f) => new Function('d', f)(d));
    localStorage.setItem('fg-app-v1', JSON.stringify(d));
    if (conta) localStorage.setItem('fg-sessao', conta); else localStorage.removeItem('fg-sessao');
  }, { pins, conta, extra });
  await page.reload();
  await pronta(page);
}

export async function pronta(page) {
  await page.waitForFunction(() => document.querySelector('[data-dots], [data-scroll], [data-acc-name]'), null, { timeout: 15000 });
  await page.waitForTimeout(700);
  await assenta(page);
}

export async function assenta(page) {
  if (page.__motion) {
    // modo com movimento: espera as contagens e congela tudo no mesmo instante (WAAPI e SMIL)
    await page.waitForTimeout(1800);
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => { try { a.pause(); a.currentTime = 4000; } catch (e) {} });
      document.querySelectorAll('svg').forEach((s) => { try { s.pauseAnimations(); s.setCurrentTime(4); } catch (e) {} });
    });
  } else await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
  // os ponteiros do relógio só recebem o transform no tique seguinte; esperar por isso evita corridas
  await page.waitForFunction(() => [...document.querySelectorAll('[data-hand]')].every((e) => e.hasAttribute('transform')), null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
}

/* HTML renderizado, sem diferenças que não existem no ecrã: data-dc-tpl do runtime e nomes scpN */
export async function dom(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.sc-host') || document.querySelector('#root');
    const clone = root.cloneNode(true);
    clone.querySelectorAll('x-dc, script, template, link, meta, style').forEach((n) => n.remove());
    clone.querySelectorAll('*').forEach((n) => n.removeAttribute('data-dc-tpl'));
    let h = clone.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/blob:[^"')\s]+/g, 'blob:X');
    const map = {}; let n = 0;
    h = h.replace(/\bscp[0-9a-z]+\b/g, (m) => (map[m] = map[m] || 'P' + n++));
    return h;
  });
}

export function compararPng(a, b, nome) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { diff: -1, msg: `tamanhos diferentes ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  const D = new PNG({ width: A.width, height: A.height });
  const diff = pixelmatch(A.data, B.data, D.data, A.width, A.height, { threshold: 0 });
  if (diff) { fs.writeFileSync(path.join(OUT, nome + '.ref.png'), a); fs.writeFileSync(path.join(OUT, nome + '.app.png'), b); fs.writeFileSync(path.join(OUT, nome + '.diff.png'), PNG.sync.write(D)); }
  return { diff };
}

export function escreve(nome, ext, txt) { fs.writeFileSync(path.join(OUT, nome + ext), txt); }

/* Abre as duas páginas e devolve [ref, app] */
export async function par(browser, opts = {}) {
  const mk = async () => (await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, reducedMotion: opts.motion ? 'no-preference' : 'reduce', locale: 'pt-PT', timezoneId: 'Europe/Lisbon' })).newPage();
  const ref = await mk(), app = await mk();
  for (const [w, p] of [['ref', ref], ['app', app]]) { p.__motion = !!opts.motion; p.on('pageerror', (e) => console.log(w, 'pageerror:', e.message.slice(0, 300))); await open(p, w, opts); }
  return { ref, app };
}

/* Aplica a mesma ação nas duas páginas */
export async function ambos(pg, fn) { await Promise.all([fn(pg.ref), fn(pg.app)]); await Promise.all([assenta(pg.ref), assenta(pg.app)]); }

/* Compara DOM e pixels; devolve texto de erro ou '' */
export async function igual(pg, nome, mask = []) {
  const [a, b] = await Promise.all([dom(pg.ref), dom(pg.app)]);
  let erro = '';
  if (a !== b) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    escreve(nome, '.ref.html', a); escreve(nome, '.app.html', b);
    erro += `DOM difere na posição ${i}: ref «${a.slice(Math.max(0, i - 80), i + 120)}» | app «${b.slice(Math.max(0, i - 80), i + 120)}»\n`;
  }
  const sel = ['[data-clock]', 'canvas', ...mask];
  const shot = (p) => p.screenshot({ mask: sel.map((s) => p.locator(s)), animations: 'disabled', caret: 'hide' });
  const r = compararPng(await shot(pg.ref), await shot(pg.app), nome);
  if (r.diff) erro += `pixels diferentes: ${r.diff} (${r.msg || ''})\n`;
  return erro;
}
