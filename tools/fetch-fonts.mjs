/* Descarrega Bodoni Moda e Jost (licença OFL) do Google Fonts para src/fonts e gera src/fonts/fonts.css.
   Só se corre uma vez; os ficheiros ficam no repositório (a app não depende do Google em runtime). */
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/fonts');
const url = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400;1,6..96,500&family=Jost:wght@400;500;600&display=swap';
const css = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' } })).text();
const blocks = css.split('/* ').slice(1).map((b) => { const m = b.match(/^([\w-]+) \*\/\s*(@font-face \{[\s\S]*?\})/); return m && { subset: m[1], face: m[2] }; }).filter(Boolean);
let outCss = '/* GERADO por tools/fetch-fonts.mjs */\n';
for (const { subset, face } of blocks) {
  if (!['latin', 'latin-ext'].includes(subset)) continue;
  const u = face.match(/url\((https:[^)]+)\)/)[1];
  const fam = face.match(/font-family: '([^']+)'/)[1].replace(/\s/g, '');
  const sty = face.match(/font-style: (\w+)/)[1], wt = face.match(/font-weight: ([\d ]+);/)[1].trim().replace(/ /g, '-');
  const name = `${fam}-${sty}-${wt}-${subset}.woff2`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await (await fetch(u)).arrayBuffer()));
  outCss += face.replace(/url\([^)]+\)/, `url('./${name}')`) + '\n';
}
fs.writeFileSync(path.join(dir, 'fonts.css'), outCss);
console.log(blocks.length, 'blocos;', fs.readdirSync(dir).length - 1, 'ficheiros');
