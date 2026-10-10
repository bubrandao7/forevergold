/* Suco Bagaço — comportamento da página.
   Sem frameworks. O conteúdo (menu, lojas) vive no HTML; aqui só há interação e movimento. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const INTRO_KEY = 'sb-intro-visto';

const root = document.documentElement;
const hero = $('[data-hero]');

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
};

const enter = (els, { y = 14, duration = 650, step = 80 } = {}) => {
  if (REDUCE) return;
  els.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }],
    { duration, delay: i * step, easing: EASE, fill: 'both' }
  ));
};

/* ------------------------------------------------------------------ */
/* Animações de entrada do hero (arrancam depois da introdução)        */
/* ------------------------------------------------------------------ */

const heroAnims = [];
let heroStarted = false;
let cupsHero = null;

function prepareHero() {
  if (REDUCE) return;
  const mk = (el, keyframes, opts) => {
    const a = el.animate(keyframes, { easing: EASE, fill: 'both', ...opts });
    a.pause();
    heroAnims.push(a);
  };
  $$('[data-up]').forEach((el) => mk(el, [{ transform: 'translateY(112%)' }, { transform: 'none' }], { duration: 1200, delay: 150 + Number(el.dataset.up) * 120 }));
  $$('[data-wipe]').forEach((el) => mk(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 820, easing: 'cubic-bezier(.7,0,.2,1)' }));
  $$('[data-fade]').forEach((el) => mk(el, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: 200 + Number(el.dataset.fade) }));
}

function startHero() {
  if (heroStarted) return;
  heroStarted = true;
  heroAnims.forEach((a) => a.play());
  if (cupsHero) cupsHero.start();
}

/* ------------------------------------------------------------------ */
/* Revelar ao rolar                                                    */
/* ------------------------------------------------------------------ */

function setupReveal() {
  if (REDUCE) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target._rv && en.target._rv.play();
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  $$('[data-rv]').forEach((el) => {
    const a = el.animate(
      [{ opacity: 0, transform: 'translateY(42px)' }, { opacity: 1, transform: 'none' }],
      { duration: 1100, delay: Number(el.dataset.rv) || 0, easing: EASE, fill: 'both' }
    );
    a.pause();
    el._rv = a;
    io.observe(el);
  });
}

/* ------------------------------------------------------------------ */
/* Movimento contínuo: faixa, luz do hero, botões magnéticos, parallax  */
/* ------------------------------------------------------------------ */

function setupMotion() {
  if (REDUCE) return;
  const marquee = $$('[data-marquee]').map((el) => el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
    { duration: 48000, iterations: Infinity }
  ));

  const light = $('[data-light]');
  const par = $('[data-par]');
  let lx = hero ? hero.clientWidth * 0.68 : 600, ly = 360, tx = lx, ty = ly;
  let rate = 1, lastY = window.scrollY;

  if (hero && FINE_POINTER) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
    });
  }

  const mags = FINE_POINTER ? $$('[data-mag]').map((el) => {
    const m = { el, x: 0, y: 0, tx: 0, ty: 0 };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      m.tx = (e.clientX - r.left - r.width / 2) * 0.22;
      m.ty = (e.clientY - r.top - r.height / 2) * 0.38;
    });
    el.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; });
    return m;
  }) : [];

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    rate = Math.min(6, Math.max(rate, 1 + Math.abs(y - lastY) / 14));
    lastY = y;
  }, { passive: true });

  const tick = () => {
    requestAnimationFrame(tick);
    const y = window.scrollY;
    if (light) {
      lx += (tx - lx) * 0.06; ly += (ty - ly) * 0.06;
      light.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
    }
    rate += (1 - rate) * 0.05;
    marquee.forEach((a) => { a.playbackRate = rate; });
    mags.forEach((m) => {
      m.x += (m.tx - m.x) * 0.15; m.y += (m.ty - m.y) * 0.15;
      m.el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
    });
    if (par && hero) {
      const h = hero.offsetHeight;
      if (y < h * 1.2) {
        par.style.translate = `0 ${(y * 0.22).toFixed(1)}px`;
        par.style.opacity = Math.max(0, 1 - y / (h * 0.8)).toFixed(3);
      }
    }
  };
  tick();
}

/* ------------------------------------------------------------------ */
/* Introdução (logótipo + contador de 0 a 100 % fruta)                 */
/* ------------------------------------------------------------------ */

function runIntro() {
  const ov = $('[data-intro]');
  if (!ov || !root.classList.contains('intro-on')) { startHero(); return; }

  const box = $('[data-intro-tiles]', ov), logo = $('[data-intro-logo]', ov), cnt = $('[data-intro-count]', ov);
  const meta = $$('[data-intro-meta]', ov), head = $('[data-head-logo]');
  window.scrollTo(0, 0);
  if (head) head.style.opacity = '0';
  root.style.overflow = 'hidden';

  const END = 2310; // duração da contagem 0 → 100 %
  logo.animate([{ opacity: 0, transform: 'translate(-50%,-46%) scale(.9)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }],
    { duration: 900, easing: EASE, fill: 'both' });

  const t0 = performance.now();
  let flew = false, done = false, raf = 0, timer = 0;

  const finish = () => {
    if (done) return;
    done = true; cancelAnimationFrame(raf); clearTimeout(timer);
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* modo privado */ }
    root.style.overflow = '';
    root.classList.remove('intro-on');
    if (head) head.style.opacity = '1';
    window.removeEventListener('keydown', onKey);
  };

  const fly = () => {
    if (flew) return;
    flew = true; clearTimeout(timer);
    if (cnt) cnt.textContent = '100';
    startHero();
    ov.style.background = 'transparent'; ov.style.pointerEvents = 'none';
    meta.forEach((m) => m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }));
    box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 250, easing: 'ease', fill: 'forwards' });
    if (head) {
      logo.getAnimations().forEach((a) => a.cancel());
      const p = logo.getBoundingClientRect(), r = head.getBoundingClientRect();
      const dx = r.left + r.width / 2 - (p.left + p.width / 2), dy = r.top + r.height / 2 - (p.top + p.height / 2), sc = r.width / p.width;
      const f = logo.animate([
        { transform: 'translate(-50%,-50%)', filter: 'drop-shadow(0 18px 30px rgba(10,59,60,.25))' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${sc})`, filter: 'drop-shadow(0 0 0 rgba(10,59,60,0))' },
      ], { duration: 1000, easing: 'cubic-bezier(.75,0,.2,1)', fill: 'forwards' });
      f.onfinish = finish;
    } else finish();
    setTimeout(finish, 2200);
  };

  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') fly(); };
  window.addEventListener('keydown', onKey);
  ov.addEventListener('click', fly);

  const ioCurve = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const count = (now) => {
    if (flew || done) return;
    raf = requestAnimationFrame(count);
    if (cnt) cnt.textContent = String(Math.round(100 * ioCurve(Math.min(1, (now - t0) / END))));
  };
  raf = requestAnimationFrame(count);
  timer = setTimeout(fly, END + 150);
}

/* ------------------------------------------------------------------ */
/* Menu por separadores                                                */
/* ------------------------------------------------------------------ */

let cupsMenu = null;
const tabs = $$('[role="tab"]');
const card = $('[data-card]');

function selectTab(tab, { focus = false } = {}) {
  if (tab.getAttribute('aria-selected') === 'true') return;
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !on;
  });
  if (focus) tab.focus();
  if (card) card.style.backgroundColor = tab.dataset.bg;
  if (cupsMenu) cupsMenu.setFlavor(0, tab.dataset.flavor);
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  if (panel) enter($$('.item', panel));
}

function setupTabs() {
  const current = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
  if (card) card.style.backgroundColor = current().dataset.bg;
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = null;
      if (e.key in keys) next = tabs[(i + keys[e.key] + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, { focus: true }); }
    });
  });
  const frapes = $('#tab-frapes');
  $$('[data-go-frapes]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    if (frapes) selectTab(frapes);
    scrollToId('sumos');
  }));
}

/* ------------------------------------------------------------------ */
/* Lojas e geolocalização                                              */
/* ------------------------------------------------------------------ */

const storeList = $('[data-stores]');
const geoMsg = $('[data-geo-msg]');
const locateBtn = $('[data-locate]');
let geoState = 'idle';

const MESSAGES = {
  idle: '',
  loading: 'A procurar a tua localização…',
  ok: 'Lojas ordenadas pela distância a ti.',
  denied: 'Sem permissão para usar a localização. Escolhe a loja na lista.',
  fail: 'Não foi possível obter a localização. Escolhe a loja na lista.',
};

const haversineKm = (a, b) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const fmtKm = (d) => 'a ' + (d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)) + ' km';

function setGeo(state) {
  geoState = state;
  if (geoMsg) geoMsg.textContent = MESSAGES[state] || '';
  if (locateBtn) locateBtn.setAttribute('aria-busy', String(state === 'loading'));
}

function sortStores(me) {
  if (!storeList) return;
  const items = $$('.store', storeList).map((el) => ({
    el, d: haversineKm(me, { lat: Number(el.dataset.lat), lng: Number(el.dataset.lng) }),
  })).sort((a, b) => a.d - b.d);
  items.forEach(({ el, d }, i) => {
    storeList.appendChild(el);
    $('.store__badge', el).hidden = i !== 0;
    const dist = $('.store__dist', el);
    dist.hidden = false; dist.textContent = fmtKm(d);
  });
  if (!REDUCE) items.forEach(({ el }, i) => el.animate(
    [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }],
    { duration: 700, delay: i * 90, easing: EASE, fill: 'both' }
  ));
}

function locate() {
  if (geoState === 'loading') return;
  if (!('geolocation' in navigator)) { setGeo('fail'); return; }
  setGeo('loading');
  navigator.geolocation.getCurrentPosition(
    (p) => { setGeo('ok'); sortStores({ lat: p.coords.latitude, lng: p.coords.longitude }); },
    (err) => setGeo(err && err.code === 1 ? 'denied' : 'fail'),
    { timeout: 9000, maximumAge: 600000 }
  );
}

function setupStores() {
  if (locateBtn) locateBtn.addEventListener('click', locate);
  $$('[data-nearest]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToId('lojas');
    if (geoState !== 'ok') locate();
  }));
}

/* ------------------------------------------------------------------ */
/* Botão flutuante                                                     */
/* ------------------------------------------------------------------ */

function setupFab() {
  const fab = $('[data-fab]'), stores = $('#lojas'), foot = $('.foot');
  if (!fab) return;
  let on = false, ticking = false;
  const update = () => {
    ticking = false;
    const heroB = hero ? hero.offsetHeight : 700;
    const lr = stores ? stores.getBoundingClientRect() : { top: 9e9, bottom: -1 };
    const inStores = lr.top < window.innerHeight * 0.8 && lr.bottom > window.innerHeight * 0.2;
    const inFoot = foot ? foot.getBoundingClientRect().top < window.innerHeight - 40 : false;
    const next = window.scrollY > heroB * 0.9 && !inStores && !inFoot;
    if (next === on) return;
    on = next;
    fab.classList.toggle('is-on', on);
    fab.setAttribute('aria-hidden', String(!on));
    fab.tabIndex = on ? 0 : -1;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ------------------------------------------------------------------ */
/* Copos 3D (carregados à parte; o site funciona sem eles)             */
/* ------------------------------------------------------------------ */

function showFallback(canvas) {
  const wrap = canvas.parentElement;
  if (!wrap || $('.stage__fallback', wrap)) return;
  canvas.hidden = true;
  const img = new Image();
  img.className = 'stage__fallback';
  img.src = new URL('../img/logo.webp', import.meta.url).href;
  img.alt = '';
  wrap.appendChild(img);
}

async function setupCups() {
  const canvases = { hero: $('[data-cups="hero"]'), bif: $('[data-cups="bif"]'), sumos: $('[data-cups="sumos"]') };
  const all = Object.values(canvases).filter(Boolean);
  let mod;
  try {
    mod = await import('./cups3d.js');
  } catch (e) {
    console.warn('Copos 3D indisponíveis:', e);
    all.forEach(showFallback);
    return;
  }
  const logo = new URL('../img/logo-print.webp', import.meta.url).href;
  const mount = (canvas, opts) => {
    const ctl = mod.mount(canvas, { logo, ...opts });
    if (!ctl) showFallback(canvas);
    return ctl;
  };

  if (canvases.hero) {
    cupsHero = mount(canvases.hero, {
      env: '#19C2B6', view: { w: 6.1, h: 3.7, cy: 1.5 }, spin: 0, wait: !heroStarted,
      cups: [
        { x: -1.95, z: -0.55, s: 0.95, flavor: '#E8283A', ry: 0.34, phase: 0.8, delay: 0.15 },
        { x: 0, z: 0.55, s: 1, flavor: '#FFC21F', ry: 0, phase: 0, delay: 0 },
        { x: 1.95, z: -0.55, s: 0.95, flavor: '#FF6A13', ry: -0.34, phase: 2.2, delay: 0.3 },
      ],
    });
    if (cupsHero && heroStarted) cupsHero.start();
  }

  /* Os outros dois só se criam quando estão perto do ecrã (menos contextos WebGL de uma vez). */
  const lazy = (canvas, build) => {
    if (!canvas) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      build();
    }, { rootMargin: '400px 0px' });
    io.observe(canvas);
  };
  lazy(canvases.bif, () => mount(canvases.bif, {
    env: '#C8261E', view: { w: 2.6, h: 4.0, cy: 1.5 }, scrollSpin: Math.PI * 1.6,
    cups: [{ flavor: 'bifasico', swing: 0.2, drops: 7 }],
  }));
  lazy(canvases.sumos, () => {
    const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    cupsMenu = mount(canvases.sumos, {
      env: '#E9DCC4', view: { w: 2.6, h: 4.1, cy: 1.45 },
      cups: [{ flavor: active.dataset.flavor, swing: 0.45 }],
    });
  });
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

const year = $('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

prepareHero();
setupReveal();
setupMotion();
setupTabs();
setupStores();
setupFab();
runIntro();
setupCups();
root.classList.remove('anim');
