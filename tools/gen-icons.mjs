/* Gera ícones PWA, apple-touch-icon e imagens de splash iOS a partir de FG_LOGO sobre #070D0B.
   Uso: node tools/gen-icons.mjs  (saída em public/) */
import { chromium } from '@playwright/test';
import { chromiumPath } from './browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'public');
fs.mkdirSync(path.join(out, 'splash'), { recursive: true });
const assets = fs.readFileSync(path.join(root, 'src/core/fg-assets.js'), 'utf8');

const SPLASH = [ // [largura, altura] em pixéis físicos, para iPhone/iPad correntes
  [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532], [1125, 2436], [1242, 2688], [828, 1792], [1242, 2208], [750, 1334], [640, 1136], [2048, 2732], [1668, 2388], [1640, 2360], [1668, 2224], [1536, 2048]
];

const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
await page.setContent('<body style="margin:0"></body>');
await page.evaluate(assets);

async function render(w, h, scale) { // scale = fração do lado menor ocupada pelo símbolo
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(({ w, h, scale }) => {
    const L = window.FG_LOGO, sym = L.sym.join(''), id = 'g' + Math.random().toString(36).slice(2, 6);
    const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9C7E3F"/><stop offset=".28" stop-color="#E9D39A"/><stop offset=".5" stop-color="#B8964F"/><stop offset=".74" stop-color="#F3E3B5"/><stop offset="1" stop-color="#A6894B"/></linearGradient></defs>`;
    const lado = Math.min(w, h) * scale, ratio = L.symw / 1000;
    document.body.style.cssText = `margin:0;width:${w}px;height:${h}px;background:#070D0B;display:grid;place-items:center`;
    document.body.innerHTML = `<svg viewBox="0 0 ${L.symw} 1000" style="width:${lado * (ratio > 1 ? 1 : ratio)}px;height:auto;display:block">${defs}<path fill="url(#${id})" fill-rule="evenodd" d="${sym}"/></svg>`;
  }, { w, h, scale });
  return page.screenshot({ type: 'png' });
}

const W = (f, buf) => fs.writeFileSync(path.join(out, f), buf);
W('icon-192.png', await render(192, 192, 0.6));
W('icon-512.png', await render(512, 512, 0.6));
W('icon-maskable-512.png', await render(512, 512, 0.42)); // zona segura de 80%
W('apple-touch-icon.png', await render(180, 180, 0.6));
W('favicon-32.png', await render(32, 32, 0.7));
// fontes para as lojas (npx @capacitor/assets generate): ícone 1024 sem transparência e splash 2732
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets/icon-only.png'), await render(1024, 1024, 0.6));
fs.writeFileSync(path.join(root, 'assets/icon-foreground.png'), await render(1024, 1024, 0.42));
fs.writeFileSync(path.join(root, 'assets/icon-background.png'), await render(1024, 1024, 0.0001));
fs.writeFileSync(path.join(root, 'assets/splash.png'), await render(2732, 2732, 0.2));
fs.writeFileSync(path.join(root, 'assets/splash-dark.png'), await render(2732, 2732, 0.2));
for (const [w, h] of SPLASH) W(`splash/${w}x${h}.png`, await render(w, h, 0.28));
await browser.close();
console.log('ícones e', SPLASH.length, 'imagens de splash gerados em public/');
