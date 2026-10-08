/* Auxiliares que o template convertido usa. Repetem o que o runtime do protótipo (support.js) fazia. */
import { isValidElement, Fragment, createElement } from 'react';

const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/* cssToObj do runtime: texto de estilo → objeto; se já for objeto, fica */
export function S(v) {
  if (typeof v !== 'string') return v;
  const o = {};
  for (const decl of v.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
}

/* value/checked indefinidos → '' / false (como o runtime) */
export function V(v, key) {
  return v === undefined ? (key === 'checked' ? false : '') : v;
}

/* texto interpolado: cada valor vai num <span class="sc-interp"> (walkText do runtime) */
export function I(v) {
  if (v === undefined || v === null || typeof v === 'boolean') return null;
  if (isValidElement(v) || Array.isArray(v)) return createElement(Fragment, null, v);
  return createElement('span', { className: 'sc-interp' }, String(v));
}
