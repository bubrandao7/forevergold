/* Converte o template do protótipo (referencia/ForeverGold App.dc.html) em JSX.
   Usa o parser HTML do Chromium, tal como o runtime do protótipo (template.innerHTML),
   e repete as regras do runtime: ver PLANO.md §3.1.
   Saídas: src/ui/Template.jsx e src/ui/pseudo.css (gerados, não editar à mão). */
import { chromium } from '@playwright/test';
import { chromiumPath } from './browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'referencia/ForeverGold App.dc.html'), 'utf8');
const open = /<x-dc(?:\s[^>]*)?>/.exec(src);
const tpl = src.slice(open.index + open[0].length, src.lastIndexOf('</x-dc>'));

const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await browser.newPage();
const out = await page.evaluate((html) => {
  /* --- cópia de support.js (encodeCase) --- */
  const RAW_WRAP = { select: 'sc-raw-select', table: 'sc-raw-table', tbody: 'sc-raw-tbody', thead: 'sc-raw-thead', tfoot: 'sc-raw-tfoot', tr: 'sc-raw-tr', td: 'sc-raw-td', th: 'sc-raw-th', caption: 'sc-raw-caption' };
  const RAW_UNWRAP = Object.fromEntries(Object.entries(RAW_WRAP).map(([k, v]) => [v, k]));
  const CAMEL = 'sc-camel-';
  const encodeCase = (h) => {
    h = h.replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>');
    h = h.replace(/(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g, (_, sp, n, eq) => sp + CAMEL + n.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + eq);
    for (const [real, alias] of Object.entries(RAW_WRAP)) h = h.replace(new RegExp('(</?)' + real + '(?=[\\s>])', 'gi'), '$1' + alias);
    return h;
  };
  const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const EVENT = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onkeydown: 'onKeyDown', onpointerdown: 'onPointerDown', onpointerup: 'onPointerUp', onfocus: 'onFocus', onblur: 'onBlur' };
  const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const pseudo = new Map(); let pn = 0;
  const importantify = (css) => css.split(';').map((d) => d.trim()).filter(Boolean).map((d) => (/!\s*important$/i.test(d) ? d : d + ' !important')).join(';');

  /* nomes de atributos HTML → props do React */
  const HTML_PROP = { maxlength: 'maxLength', inputmode: 'inputMode', playsinline: 'playsInline', tabindex: 'tabIndex', readonly: 'readOnly', autocomplete: 'autoComplete', colspan: 'colSpan', rowspan: 'rowSpan', crossorigin: 'crossOrigin', srcset: 'srcSet', contenteditable: 'contentEditable', autofocus: 'autoFocus', enterkeyhint: 'enterKeyHint', autocapitalize: 'autoCapitalize', 'accept-charset': 'acceptCharset', 'http-equiv': 'httpEquiv' };
  const J = JSON.stringify;

  /* {{ a.b }} → expressão JS com cadeia opcional; o início pode ser variável de ciclo */
  const expr = (src, scope) => {
    const e = src.trim();
    if (!/^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(e)) throw new Error('Expressão não suportada: ' + e);
    const parts = e.split('.');
    const head = scope.includes(parts[0]) ? parts[0] : 'vals.' + parts[0];
    return head + parts.slice(1).map((p) => (/^\d+$/.test(p) ? '?.[' + p + ']' : '?.' + p)).join('');
  };
  const attrExpr = (raw, scope) => {
    const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
    if (whole) return expr(whole[1], scope);
    if (raw.includes('{{')) {
      const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
      return '[' + parts.map((s, i) => (i & 1 ? '(' + expr(s, scope) + ' ?? "")' : J(s))).join(',') + '].join("")';
    }
    return null;
  };

  const walk = (node, scope, ind) => {
    if (node.nodeType === 3) {
      const t = node.nodeValue || '';
      if (!t.includes('{{')) {
        if (!t.trim() && !t.includes(' ')) return null;
        return '{' + J(t) + '}';
      }
      const parts = t.split(/\{\{([\s\S]+?)\}\}/g);
      return '<>' + parts.map((p, i) => (i & 1 ? '{I(' + expr(p, scope) + ')}' : '{' + J(p) + '}')).join('') + '</>';
    }
    if (node.nodeType !== 1) return null;
    const tag = node.tagName.toLowerCase();
    const kids = (el, sc) => [...el.childNodes].map((c) => walk(c, sc, ind)).filter((x) => x != null);
    if (tag === 'sc-helmet') return null;
    if (tag === 'sc-if') {
      const v = attrExpr(node.getAttribute('value') || '', scope);
      return '{' + v + ' ? <>' + kids(node, scope).join('') + '</> : null}';
    }
    if (tag === 'sc-for') {
      const list = attrExpr(node.getAttribute('list') || '', scope), as = node.getAttribute('as') || 'item';
      const sc = scope.concat([as, '$index']);
      return '{(Array.isArray(' + list + ') ? ' + list + ' : []).map((' + as + ', $index) => <Fragment key={$index}>' + kids(node, sc).join('') + '</Fragment>)}';
    }
    const real = RAW_UNWRAP[node.localName] || node.localName;
    const props = []; let cls = null; const pcls = [];
    for (const { name, value } of [...node.attributes]) {
      let key = name;
      if (key === 'data-dc-tpl') continue;
      if (key.startsWith(CAMEL)) key = kebabToCamel(key.slice(CAMEL.length));
      if (key.startsWith('style-')) {
        const ps = key.slice(6), k = ps + '|' + value;
        if (!pseudo.has(k)) pseudo.set(k, { cls: 'scp' + (pn++).toString(36), ps, css: value });
        pcls.push(pseudo.get(k).cls); continue;
      }
      if (key === 'class') key = 'className';
      else if (key === 'for') key = 'htmlFor';
      else if (key.startsWith('on')) key = EVENT[key] || 'on' + key[2].toUpperCase() + key.slice(3);
      else if (HTML_PROP[key]) key = HTML_PROP[key];
      else if (key.includes('-') && !key.startsWith('data-') && !key.startsWith('aria-')) key = kebabToCamel(key);
      const e = attrExpr(value, scope);
      if (key === 'className') { cls = e || J(value); continue; }
      if (key === 'style') { props.push('style={S(' + (e || J(value)) + ')}'); continue; }
      if (key === 'value' || key === 'checked') { props.push(key + '={V(' + (e || J(value)) + ',' + J(key) + ')}'); continue; }
      if (e) props.push(key + '={' + e + '}'); else props.push(key + '={' + J(value) + '}');
    }
    if (pcls.length || cls) props.push('className={' + (pcls.length ? J(pcls.join(' ')) + (cls ? ' + " " + ' + cls : '') : cls) + '}');
    // runtime: [props.className, ...pseudo].join(" ") → className primeiro
    if (pcls.length && cls) props[props.length - 1] = 'className={[' + cls + ',' + J(pcls.join(' ')) + '].filter(Boolean).join(" ")}';
    const open = '<' + real + (props.length ? ' ' + props.join(' ') : '');
    if (VOID.has(real)) return open + ' />';
    return open + '>' + kids(node, scope).join('') + '</' + real + '>';
  };

  const t = document.createElement('template');
  t.innerHTML = encodeCase(html);
  const body = [...t.content.childNodes].map((c) => walk(c, [], 0)).filter((x) => x != null).join('\n');
  const css = [...pseudo.values()].map((p) => '.' + p.cls + ':' + p.ps + '{' + importantify(p.css) + '}').join('\n');
  return { body, css };
}, tpl);
await browser.close();

const header = `/* GERADO por tools/dc2jsx.mjs a partir de referencia/ForeverGold App.dc.html. Não editar à mão. */
import { Fragment } from 'react';
import { I, S, V } from './runtime.js';
import './pseudo.css';

export default function Template({ vals }) {
  return (
    <>
${out.body}
    </>
  );
}
`;
fs.mkdirSync(path.join(root, 'src/ui'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/ui/Template.jsx'), header);
fs.writeFileSync(path.join(root, 'src/ui/pseudo.css'), out.css + '\n');
console.log('Template.jsx:', header.length, 'bytes; pseudo.css:', out.css.split('\n').length, 'regras');
