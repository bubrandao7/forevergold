(function () {
  'use strict';
  /* ============ utilitários ============ */
  const D = document, W = window;
  const $ = (s, r) => (r || D).querySelector(s);
  const $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digitos = (s) => String(s || '').replace(/\D/g, '');
  const fmtTel = (s) => { const d = digitos(s).replace(/^351(?=\d{9}$)/, ''); return d.length === 9 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : String(s || ''); };
  const telHref = (s) => { const d = digitos(s); return 'tel:+' + (d.length === 9 ? '351' + d : d); };
  const euro = (n) => { try { return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }); } catch (e) { return Number(n).toFixed(2).replace('.', ',') + ' €'; } };
  const waLink = (texto) => { const d = digitos(S.marca.whatsapp); return 'https://wa.me/' + (d.length === 9 ? '351' + d : d) + (texto ? '?text=' + encodeURIComponent(texto) : ''); };
  const mapa = (l) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Forevergold ' + (l.morada || (l.nome + ' ' + l.zona)));
  const gmaps = (l) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Forevergold ' + l.nome + ' ' + l.zona);
  const reduz = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const guarda = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  const S = W.FG_DADOS, LOGO = W.FG_LOGO;
  const CATS = [
    { id: 'relogios', nome: 'Relógios' }, { id: 'prata', nome: 'Artigos em prata' }, { id: 'curso', nome: 'Anéis de curso' },
    { id: 'aliancas', nome: 'Alianças' }, { id: 'bilaminados', nome: 'Bilaminados' }, { id: 'religioso', nome: 'Religioso' },
  ];
  const catNome = (id) => (CATS.find((c) => c.id === id) || { nome: '' }).nome;
  const lojasReais = () => S.lojas.filter((l) => !l.sede);

  /* ============ ícones e desenhos ============ */
  const IC = {
    saco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8h18M3 16h18"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    lapis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/><path d="M14 7l3 3"/></svg>',
    hora: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    fora: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 16 18 6M10 6h8v8"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    whats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-4.3A8.5 8.5 0 1 1 8.5 19L4 20Z"/><path d="M9 9h6M9 12.500h4" stroke-linecap="round"/></svg>',
    estrela: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.6 2.8 6 6.600.7-4.900 4.500 1.300 6.500L12 17.100 6.200 20.300l1.300-6.500L2.600 9.300l6.600-.7L12 2.600Z"/></svg>',
  };
  const TR = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const BRILHO = '<path d="M96 22l2.600 7.400L106 32l-7.400 2.600L96 42l-2.600-7.400L86 32l7.400-2.600L96 22Z" fill="currentColor" stroke="none"/>';
  const GLIFOS = {
    relogios: '<g ' + TR + '><rect x="46" y="8" width="28" height="24" rx="3"/><rect x="46" y="88" width="28" height="24" rx="3"/><circle cx="60" cy="60" r="29"/><circle cx="60" cy="60" r="23"/><path d="M60 44v16l10 7M89 56h5v8h-5M60 39v3M60 78v3M39 60h3M78 60h3"/></g>',
    prata: '<g ' + TR + '><path d="M78 36a32 32 0 1 0 12 30"/><circle cx="81" cy="38" r="4.500"/><circle cx="91" cy="62" r="4.500"/><path d="M68 44a22 22 0 1 0 12 22"/></g>' + BRILHO,
    curso: '<g ' + TR + '><ellipse cx="60" cy="76" rx="30" ry="26"/><ellipse cx="60" cy="76" rx="22" ry="19"/><path d="M42 44h36l6 12H36l6-12ZM48 44l4 12M72 44l-4 12M60 44v12"/><path d="M40 56l8-18h24l8 18"/></g>',
    aliancas: '<g ' + TR + '><circle cx="46" cy="64" r="26"/><circle cx="46" cy="64" r="19"/><path d="M62 43a26 26 0 1 1 0 42M66 49a19 19 0 1 1 0 30"/></g>' + BRILHO,
    bilaminados: '<g ' + TR + '><path d="M20 18c6 22 22 40 40 48 18-8 34-26 40-48"/><path d="M60 66v8"/><path d="M60 74c-10 12-14 18-14 25a14 14 0 0 0 28 0c0-7-4-13-14-25Z"/><path d="M54 98a6 6 0 0 0 6 6"/></g>',
    religioso: '<g ' + TR + '><circle cx="60" cy="16" r="7"/><path d="M52 26h16v22h22v16H68v44H52V64H30V48h22V26Z"/></g>',
  };
  const glifo = (cat) => '<svg class="glifo" viewBox="0 0 120 120" aria-hidden="true">' + (GLIFOS[cat] || GLIFOS.aliancas) + '</svg>';
  const estrelas = (n) => '<span class="estrelas" role="img" aria-label="' + n + ' em 5 estrelas">' + [1, 2, 3, 4, 5].map((i) => (i <= n ? IC.estrela : IC.estrela.replace('<svg', '<svg class="off"'))).join('') + '</span>';
  const logoS = (cls) => '<svg class="' + cls + '" viewBox="0 0 ' + LOGO.symw + ' 1000" aria-hidden="true"><use href="#fg-s"/></svg>';
  const logoW = (cls) => '<svg class="' + cls + '" viewBox="0 0 ' + LOGO.ww + ' ' + LOGO.wh + '" aria-hidden="true"><use href="#fg-w"/></svg>';

  /* ============ secções ============ */
  const NAV = [['casa', 'A casa'], ['compra', 'Compramos'], ['penhor', 'Penhor'], ['laser', 'Gravação'], ['oficina', 'Oficina'], ['loja', 'Loja'], ['lojas', 'Lojas']];
  const navLinks = () => NAV.map((n) => '<a href="#' + n[0] + '" data-ir="' + n[0] + '">' + n[1] + '</a>').join('');

  function defs() {
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      '<symbol id="fg-s" viewBox="0 0 ' + LOGO.symw + ' 1000"><path fill="currentColor" fill-rule="evenodd" d="' + LOGO.sym.join('') + '"/></symbol>' +
      '<symbol id="fg-w" viewBox="0 0 ' + LOGO.ww + ' ' + LOGO.wh + '"><path fill="currentColor" d="' + LOGO.word + '"/></symbol>' +
      '<linearGradient id="fg-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9C7E3F"/><stop offset=".28" stop-color="#E9D39A"/><stop offset=".5" stop-color="#B8964F"/><stop offset=".74" stop-color="#F3E3B5"/><stop offset="1" stop-color="#A6894B"/></linearGradient>' +
      '<linearGradient id="fg-prata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8D9391"/><stop offset=".3" stop-color="#F1F3F2"/><stop offset=".52" stop-color="#B4B9B7"/><stop offset=".76" stop-color="#FFFFFF"/><stop offset="1" stop-color="#989E9C"/></linearGradient>' +
      '<linearGradient id="fg-sheen" x1="0" y1="0" x2="1" y2=".35"><stop offset=".38" stop-color="#FFF8DC" stop-opacity="0"/><stop offset=".5" stop-color="#FFF8DC" stop-opacity=".6"/><stop offset=".62" stop-color="#FFF8DC" stop-opacity="0"/>' + (reduz ? '' : '<animateTransform attributeName="gradientTransform" type="translate" values="-1.1 0;1.1 0;1.1 0" keyTimes="0;.55;1" dur="6.5s" begin="3s" repeatCount="indefinite"/>') + '</linearGradient>' +
      '<linearGradient id="fg-cauda" gradientUnits="userSpaceOnUse" x1="120" y1="162" x2="260" y2="90"><stop offset="0" stop-color="#A6894B" stop-opacity="0"/><stop offset="1" stop-color="#A6894B"/></linearGradient>' +
      '<filter id="fg-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '</defs></svg>';
  }

  function topo() {
    return '<header class="topo" id="topo"><div class="wrap topo__in">' +
      '<a class="marca" href="#inicio" data-ir="inicio" aria-label="Forevergold, voltar ao início">' + logoS('marca__s') + logoW('marca__w') + '</a>' +
      '<nav class="nav" aria-label="Secções do site">' + navLinks() + '</nav>' +
      '<div class="topo__acoes"><button class="icone-btn" data-act="cesto" aria-label="Abrir o carrinho">' + IC.saco + '<span class="carrinho-n" data-cesto-n>0</span></button>' +
      '<button class="icone-btn menu-btn" data-act="menu" aria-label="Abrir o menu">' + IC.menu + '</button></div>' +
      '</div></header>' +
      '<div class="menu" id="menu" aria-hidden="true"><div class="menu__topo"><span class="marca">' + logoS('marca__s') + '</span><button class="icone-btn" data-act="menu-fechar" aria-label="Fechar o menu">' + IC.fechar + '</button></div><nav aria-label="Menu">' + navLinks() + '</nav></div>';
  }

  function tituloHero(t) {
    let i = 0;
    return esc(t).split(/\s+/).map((p) => {
      const d = /ouro|prata/i.test(p) ? ' class="dour"' : '';
      return '<span class="pal" style="--i:' + (i++) + '"><span' + d + '>' + p + '</span></span>';
    }).join(' ');
  }

  function hero() {
    const fita = ['Compra de ouro', 'Compra de prata', 'Penhor', 'Gravação a laser', 'Reparação de relógios', 'Alianças', 'Anéis de curso', 'Artigos em prata'];
    const g = '<div class="fita__g">' + fita.map((f) => '<span>' + f + '</span><i></i>').join('') + '</div>';
    return '<section class="hero" id="inicio"><canvas class="hero__po" aria-hidden="true"></canvas>' +
      '<div class="wrap hero__grid"><div class="hero__txt">' +
      '<p class="kicker sobe2" style="--d:.1s">' + esc(S.hero.kicker) + '</p>' +
      '<h1 class="hero__h">' + tituloHero(S.hero.titulo) + '</h1>' +
      '<p class="hero__sub sobe2" style="--d:.9s">' + esc(S.hero.sub) + '</p>' +
      '<div class="botoes sobe2" style="--d:1.1s"><a class="btn btn--ouro" href="#compra" data-ir="compra">Vender ouro ou prata</a><a class="btn btn--linha" href="#loja" data-ir="loja">Ver artigos à venda</a></div>' +
      '</div><div class="hero__simbolo" aria-hidden="true"><svg viewBox="-70 -70 ' + (LOGO.symw + 140) + ' 1140">' +
      '<ellipse class="hs-halo" cx="' + LOGO.symw / 2 + '" cy="500" rx="' + (LOGO.symw / 2 + 60) + '" ry="560"/>' +
      '<path class="hs-cheio" fill-rule="evenodd" d="' + LOGO.sym.join('') + '"/>' +
      '<path class="hs-cheio" fill-rule="evenodd" style="fill:url(#fg-sheen)" d="' + LOGO.sym.join('') + '"/>' +
      LOGO.sym.map((d) => '<path class="hs-traco" pathLength="1" d="' + d + '"/>').join('') +
      '</svg></div></div>' +
      '<div class="fita" aria-hidden="true"><div class="fita__in">' + g + g + '</div></div></section>';
  }

  function casa() {
    const nomes = lojasReais().map((l) => esc(l.nome)).join(' · ');
    const sede = S.lojas.find((l) => l.sede);
    return '<section class="sec tema-claro" id="casa"><div class="wrap"><div class="casa__grid">' +
      '<div class="casa__esq"><p class="kicker" data-r>A casa</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.casa.titulo) + '</h2>' + logoS('casa__s') + '</div>' +
      '<div class="casa__dir"><p data-r>' + esc(S.casa.p1) + '</p><p data-r style="--d:.1s">' + esc(S.casa.p2) + '</p><p data-r style="--d:.2s">' + esc(S.casa.p3) + '</p></div>' +
      '</div><dl class="ficha">' +
      '<div data-r><dt>Sede</dt><dd>' + esc(sede ? sede.zona : 'Gondomar') + '</dd></div>' +
      '<div data-r style="--d:.1s"><dt>' + lojasReais().length + ' lojas</dt><dd>' + nomes + '</dd></div>' +
      '<div data-r style="--d:.2s"><dt>Serviços</dt><dd>Compra e venda · Penhor · Reparação · Gravação a laser</dd></div>' +
      '</dl></div></section>';
  }

  const TOQUES = [
    ['9 kt', 375, ''], ['14 kt', 585, ''], ['18 kt', 750, ''], ['19,2 kt', 800, 'ouro português'], ['24 kt', 999, 'ouro fino'],
  ];
  function compra() {
    const tq = TOQUES.map((t, i) => '<div class="tq"><b>' + t[0] + (t[2] ? '<small>' + t[2] + '</small>' : '') + '</b><span class="tq__b"><i style="--v:' + (t[1] / 1000) + ';--d:' + (0.15 + i * 0.12) + 's"></i></span><span class="tq__v">' + t[1] + ' ‰</span></div>').join('') +
      '<div class="tq tq--prata"><b>Prata<small>de lei</small></b><span class="tq__b"><i style="--v:.925;--d:.8s"></i></span><span class="tq__v">925 ‰</span></div>';
    const passos = [1, 2, 3].map((n) => '<li class="passo" data-r style="--d:' + (n - 1) * 0.12 + 's"><span class="passo__n">' + n + '</span><h3>' + esc(S.compra['passo' + n + 't']) + '</h3><p>' + esc(S.compra['passo' + n]) + '</p></li>').join('');
    return '<section class="sec tema-escuro compra" id="compra"><div class="gigante" aria-hidden="true" data-desliza>Ouro · Prata · Ouro · Prata</div><div class="wrap">' +
      '<div class="compra__grid"><div class="pilha"><p class="kicker" data-r>Compra de ouro e prata</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.compra.titulo) + '</h2><p class="lead" data-r style="--d:.16s">' + esc(S.compra.texto) + '</p>' +
      '<div class="botoes" data-r style="--d:.24s"><a class="btn btn--ouro" href="#lojas" data-ir="lojas">Encontrar uma loja</a><a class="btn btn--linha" data-wa="Olá, Forevergold! Tenho peças de ouro/prata para vender e gostava de saber mais." target="_blank" rel="noopener" href="#">' + IC.whats + 'Enviar mensagem</a></div></div>' +
      '<aside class="toque" data-r="dir"><h3 class="toque__t">O que é o toque?</h3><p class="toque__s">É a pureza do metal: quantas partes em cada mil são ouro ou prata. O valor de uma peça depende do toque e do peso.</p><div class="toque__l">' + tq + '</div></aside></div>' +
      '<ol class="passos">' + passos + '</ol></div></section>';
  }

  function penhor() {
    const nos = [[260, 90, '0s'], [407.2, 345, '-8s'], [112.8, 345, '-4s']];
    return '<section class="sec tema-claro" id="penhor"><div class="wrap penhor__grid">' +
      '<div class="orb" data-r="zoom" aria-hidden="true"><svg viewBox="0 0 520 520"><circle class="orb__pista" cx="260" cy="260" r="170"/>' +
      '<g class="orb__gira"><path class="orb__cauda" d="M120.7 162.5A170 170 0 0 1 260 90"/><circle class="orb__ponto" cx="260" cy="90" r="7"/></g>' +
      nos.map((n, i) => '<g class="orb__no" style="--t:' + n[2] + '"><circle cx="' + n[0] + '" cy="' + n[1] + '" r="26" style="transform-origin:' + n[0] + 'px ' + n[1] + 'px"/><text x="' + n[0] + '" y="' + (n[1] + 7.5) + '">' + (i + 1) + '</text></g>').join('') +
      '<svg x="205" y="196" width="110" height="71.600" viewBox="0 0 ' + LOGO.symw + ' 1000" style="color:#A6894B"><use href="#fg-s"/></svg>' +
      '<text class="orb__centro" x="260" y="300">À sua espera</text><text class="orb__centro2" x="260" y="322">AS PEÇAS FICAM GUARDADAS</text></svg></div>' +
      '<div class="pilha"><p class="kicker" data-r>Penhor de ouro e prata</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.penhor.titulo) + '</h2><p class="lead" data-r style="--d:.16s">' + esc(S.penhor.texto) + '</p>' +
      '<ol class="ciclo" data-r style="--d:.22s"><li><b>1</b><span>Entrega as suas peças numa loja.</span></li><li><b>2</b><span>Recebe o valor acordado.</span></li><li><b>3</b><span>Liquida e recupera as peças.</span></li></ol>' +
      '<p class="nota" data-r style="--d:.28s">' + IC.info + '<span>' + esc(S.penhor.nota) + '</span></p>' +
      '<div class="botoes" data-r style="--d:.34s"><a class="btn btn--linha" href="#lojas" data-ir="lojas">Falar com uma loja</a></div></div>' +
      '</div></section>';
  }

  const OBJETOS = [
    { id: 'medalha', nome: 'Medalha', metal: 'ouro', x: 300, y: 222, tam: 44, max: 200,
      svg: '<circle cx="300" cy="62" r="17" fill="none" stroke="url(#fg-ouro)" stroke-width="6"/><circle cx="300" cy="212" r="136" fill="url(#fg-ouro)"/><circle cx="300" cy="212" r="121" fill="none" stroke="#7A6230" stroke-opacity=".55" stroke-width="1.5"/><circle cx="300" cy="212" r="115" fill="none" stroke="#FFF6D8" stroke-opacity=".5" stroke-width="1"/>' },
    { id: 'alianca', nome: 'Aliança', metal: 'ouro', x: 300, y: 214, tam: 38, max: 330,
      svg: '<rect x="70" y="150" width="460" height="104" rx="52" fill="url(#fg-ouro)"/><path d="M96 168h408M96 236h408" stroke="#7A6230" stroke-opacity=".45" stroke-width="1.5"/><path d="M100 172h400" stroke="#FFF6D8" stroke-opacity=".5"/>', leg: 'Interior da aliança' },
    { id: 'caneta', nome: 'Caneta', metal: 'prata', x: 262, y: 209, tam: 24, max: 250,
      svg: '<path d="M474 180l76 22-76 22Z" fill="url(#fg-ouro)"/><rect x="60" y="178" width="416" height="48" rx="24" fill="url(#fg-prata)"/><rect x="398" y="178" width="14" height="48" fill="url(#fg-ouro)"/><rect x="92" y="166" width="150" height="9" rx="4.500" fill="url(#fg-ouro)"/><path d="M84 186h300" stroke="#fff" stroke-opacity=".6"/>' },
    { id: 'portachaves', nome: 'Porta-chaves', metal: 'prata', x: 352, y: 216, tam: 34, max: 220,
      svg: '<circle cx="150" cy="202" r="46" fill="none" stroke="url(#fg-prata)" stroke-width="9"/><path d="M190 202h34" stroke="url(#fg-ouro)" stroke-width="8"/><rect x="216" y="128" width="272" height="148" rx="26" fill="url(#fg-prata)"/><circle cx="246" cy="202" r="10" fill="#12201B"/><rect x="230" y="142" width="244" height="120" rx="16" fill="none" stroke="#7B817F" stroke-opacity=".5"/>' },
    { id: 'moldura', nome: 'Moldura', metal: 'prata', x: 300, y: 329, tam: 26, max: 300,
      svg: '<rect x="110" y="36" width="380" height="316" rx="6" fill="url(#fg-prata)"/><rect x="152" y="76" width="296" height="218" fill="#1A2B25"/><path d="M152 294l96-110 70 70 46-40 84 80Z" fill="#24382F"/><circle cx="392" cy="128" r="20" fill="#2E463B"/><rect x="152" y="76" width="296" height="218" fill="none" stroke="#7B817F" stroke-opacity=".6"/>' },
    { id: 'jarra', nome: 'Jarra', metal: 'prata', x: 300, y: 252, tam: 30, max: 170,
      svg: '<path d="M250 40h100c0 0-8 14-8 46 0 44 66 74 66 150 0 76-44 114-108 114s-108-38-108-114c0-76 66-106 66-150 0-32-8-46-8-46Z" fill="url(#fg-prata)"/><path d="M250 40h100" stroke="url(#fg-ouro)" stroke-width="7" stroke-linecap="round"/><path d="M236 150c-22 24-30 50-30 86" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/>' },
  ];
  let grav = { obj: 'medalha', letra: 'classica' };
  function laser() {
    const chips = OBJETOS.map((o) => '<button type="button" class="chip" data-obj="' + o.id + '" aria-pressed="' + (o.id === grav.obj) + '">' + o.nome + '</button>').join('');
    return '<section class="sec tema-escuro" id="laser"><div class="wrap laser__grid">' +
      '<div class="pilha"><p class="kicker" data-r>Gravação a laser</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.laser.titulo) + '</h2><p class="lead" data-r style="--d:.16s">' + esc(S.laser.texto) + '</p>' +
      '<form class="gravador" id="gravador" data-r style="--d:.24s" novalidate><div class="campo"><label for="grav-txt">Experimente: escreva o que quer gravar</label><input class="inp" id="grav-txt" maxlength="22" autocomplete="off" value="' + esc(S.laser.exemplo) + '"></div>' +
      '<div class="campo"><span class="rot" id="rot-obj">Onde</span><div class="chips" role="group" aria-labelledby="rot-obj">' + chips + '</div></div>' +
      '<div class="campo"><span class="rot" id="rot-letra">Letra</span><div class="chips" role="group" aria-labelledby="rot-letra"><button type="button" class="chip" data-letra="classica" aria-pressed="' + (grav.letra === 'classica') + '">Clássica</button><button type="button" class="chip" data-letra="manuscrita" aria-pressed="' + (grav.letra === 'manuscrita') + '">Manuscrita</button></div></div>' +
      '<div class="botoes"><button class="btn btn--ouro" type="submit">Gravar</button></div><p class="mini" style="color:var(--fg2)">Demonstração ilustrativa. O trabalho final é combinado consigo em loja.</p></form></div>' +
      '<div class="palco" data-r="dir" id="palco"><svg viewBox="0 0 600 400" role="img" aria-label="Demonstração de gravação a laser"></svg><span class="palco__leg" id="palco-leg"></span></div>' +
      '</div></section>';
  }

  function engrenagem(cx, cy, ro, ri, n) {
    let d = ''; const st = Math.PI * 2 / n;
    const p = (r, t) => (cx + r * Math.cos(t)).toFixed(1) + ' ' + (cy + r * Math.sin(t)).toFixed(1);
    for (let i = 0; i < n; i++) { const a = i * st; d += (i ? 'L' : 'M') + p(ri, a) + 'L' + p(ro, a + st * 0.16) + 'L' + p(ro, a + st * 0.42) + 'L' + p(ri, a + st * 0.58); }
    return d + 'Z';
  }
  function oficina() {
    let marcas = '';
    for (let i = 0; i < 60; i++) {
      const g = i % 5 === 0, q = i % 15 === 0;
      marcas += '<line x1="200" y1="' + (g ? 86 : 78) + '" x2="200" y2="' + (g ? (q ? 106 : 100) : 82) + '" stroke="' + (g ? '#EBD7A4' : '#C6A766') + '" stroke-opacity="' + (g ? 1 : 0.45) + '" stroke-width="' + (q ? 4 : g ? 2.4 : 1) + '" transform="rotate(' + i * 6 + ' 200 220)"/>';
    }
    return '<section class="sec tema-veludo" id="oficina"><div class="wrap oficina__grid">' +
      '<div class="pilha"><p class="kicker" data-r>Oficina</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.oficina.titulo) + '</h2><p class="lead" data-r style="--d:.16s">' + esc(S.oficina.texto) + '</p>' +
      '<ul class="servs" data-r style="--d:.22s"><li>Reparação de relógios</li><li>Reparação de peças em ouro</li><li>Reparação de peças em prata</li><li>Gravação a laser</li></ul>' +
      '<div class="botoes" data-r style="--d:.3s"><a class="btn btn--linha" href="#lojas" data-ir="lojas">Levar a uma loja</a></div></div>' +
      '<div class="relogio" data-r="zoom" aria-hidden="true"><svg viewBox="0 0 400 440" id="relogio"><defs><clipPath id="fg-jan"><circle cx="200" cy="296" r="42"/></clipPath><radialGradient id="fg-most" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#1B332A"/><stop offset="1" stop-color="#09110E"/></radialGradient></defs>' +
      '<rect x="374" y="207" width="18" height="26" rx="5" fill="url(#fg-ouro)"/><circle cx="200" cy="220" r="178" fill="url(#fg-ouro)"/><circle cx="200" cy="220" r="162" fill="#0A120F"/><circle cx="200" cy="220" r="154" fill="url(#fg-most)"/>' + marcas +
      '<svg x="174" y="126" width="52" height="33.800" viewBox="0 0 ' + LOGO.symw + ' 1000" style="color:#C6A766"><use href="#fg-s"/></svg>' +
      '<svg x="141" y="168" width="118" height="10.100" viewBox="0 0 ' + LOGO.ww + ' ' + LOGO.wh + '" style="color:#C6A766"><use href="#fg-w"/></svg>' +
      '<circle cx="200" cy="296" r="42" fill="#060B09"/><g clip-path="url(#fg-jan)"><path id="rel-g1" d="' + engrenagem(184, 290, 30, 24, 14) + '" fill="none" stroke="#C6A766" stroke-width="2"/><circle cx="184" cy="290" r="12" fill="none" stroke="#C6A766" stroke-width="1.5"/><path id="rel-g2" d="' + engrenagem(226, 312, 21, 16, 10) + '" fill="none" stroke="#EBD7A4" stroke-width="2"/><circle cx="184" cy="290" r="3" fill="#B4472F"/><circle cx="226" cy="312" r="3" fill="#B4472F"/></g><circle cx="200" cy="296" r="42" fill="none" stroke="url(#fg-ouro)" stroke-width="3"/>' +
      '<line id="rel-h" x1="200" y1="232" x2="200" y2="142" stroke="url(#fg-ouro)" stroke-width="8" stroke-linecap="round"/><line id="rel-m" x1="200" y1="236" x2="200" y2="104" stroke="url(#fg-ouro)" stroke-width="5" stroke-linecap="round"/>' +
      '<g id="rel-s"><line x1="200" y1="252" x2="200" y2="90" stroke="#EEE7D7" stroke-width="1.6"/><circle cx="200" cy="246" r="5" fill="#EEE7D7"/></g><circle cx="200" cy="220" r="8" fill="url(#fg-ouro)"/><circle cx="200" cy="220" r="2.5" fill="#0A120F"/></svg>' +
      '<p class="rel-hora">A hora certa, agora: <span id="rel-txt">--:--:--</span></p></div>' +
      '</div></section>';
  }

  let abaLoja = 'todos';
  function cartao(p, i) {
    const img = p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.nome) + '" loading="lazy">' : glifo(p.cat);
    const preco = p.preco == null || p.preco === '' ? '<span class="prod__p consulta">Preço sob consulta</span>' : '<span class="prod__p">' + euro(p.preco) + '</span>';
    return '<article class="prod" style="--i:' + i + '" data-prod="' + esc(p.id) + '"><div class="prod__img">' + img + (p.exemplo ? '<span class="selo">Exemplo</span>' : '') + (p.esgotado ? '<span class="selo selo--esg">Esgotado</span>' : '') + '</div>' +
      '<div class="prod__c"><span class="prod__cat">' + esc(catNome(p.cat)) + '</span><h3 class="prod__n">' + esc(p.nome) + '</h3>' + (p.desc ? '<p class="prod__d">' + esc(p.desc) + '</p>' : '') +
      '<div class="prod__f">' + preco + '<button type="button" class="junta" data-junta="' + esc(p.id) + '"' + (p.esgotado ? ' disabled' : '') + '>Adicionar</button></div></div></article>';
  }
  function grelhaLoja() {
    const l = S.produtos.filter((p) => abaLoja === 'todos' || p.cat === abaLoja);
    return l.length ? l.map(cartao).join('') : '<p class="vazio">Ainda não há artigos nesta secção. Fale connosco para saber o que temos em loja.</p>';
  }
  function loja() {
    const n = (c) => S.produtos.filter((p) => p.cat === c).length;
    const abas = [{ id: 'todos', nome: 'Tudo', q: S.produtos.length }].concat(CATS.map((c) => ({ id: c.id, nome: c.nome, q: n(c.id) })))
      .map((c) => '<button type="button" role="tab" class="aba" data-aba="' + c.id + '" aria-selected="' + (c.id === abaLoja) + '">' + c.nome + '<sup>' + c.q + '</sup></button>').join('');
    return '<section class="sec tema-claro" id="loja"><div class="wrap">' +
      '<div class="loja__cab"><div class="pilha"><p class="kicker" data-r>Loja online</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.loja.titulo) + '</h2><p class="txt" data-r style="--d:.16s">' + esc(S.loja.texto) + '</p></div>' +
      '<button type="button" class="btn btn--linha" data-act="cesto" data-r style="--d:.2s">' + IC.saco + 'Ver carrinho (<span data-cesto-n>0</span>)</button></div>' +
      '<div class="abas-w"><div class="abas" role="tablist" aria-label="Secções da loja">' + abas + '<span class="abas__lin" aria-hidden="true"></span></div></div>' +
      '<div class="grelha" id="grelha">' + grelhaLoja() + '</div></div></section>';
  }

  function avaliacoes() {
    const rs = S.reviews.filter((r) => r.texto);
    const cartaoA = (r) => '<figure class="aval">' + estrelas(Math.max(1, Math.min(5, Number(r.estrelas) || 5))) + '<blockquote>«' + esc(r.texto) + '»</blockquote><figcaption><b>' + esc(r.nome || 'Cliente') + '</b>' + (r.loja ? ' · ' + esc(r.loja) : '') + ' · Google</figcaption></figure>';
    let corpo = '';
    if (rs.length > 3 && !reduz) {
      const g = rs.map(cartaoA).join('');
      corpo = '<div class="aval-fita" data-r><div class="aval-fita__in" style="--dur:' + Math.max(40, rs.length * 9) + 's">' + g + g.replace(/<figure /g, '<figure aria-hidden="true" ') + '</div></div>';
    } else if (rs.length) {
      corpo = '<div class="aval-grelha">' + rs.map((r, i) => cartaoA(r).replace('<figure class="aval"', '<figure class="aval" data-r style="--d:' + i * 0.1 + 's"')).join('') + '</div>';
    }
    const links = lojasReais().map((l) => '<a class="glink" target="_blank" rel="noopener" href="' + esc(gmaps(l)) + '">' + esc(l.nome) + IC.fora + '</a>').join('');
    return '<section class="sec tema-escuro" id="avaliacoes"><div class="wrap">' +
      '<div class="aval__cab"><div class="pilha"><p class="kicker" data-r>Avaliações</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.avaliacoes.titulo) + '</h2><p class="txt" data-r style="--d:.16s">' + esc(S.avaliacoes.texto) + '</p></div></div>' +
      '</div>' + (corpo ? '<div class="' + (rs.length > 3 && !reduz ? '' : 'wrap') + '">' + corpo + '</div>' : '') +
      '<div class="wrap"><div class="glinks" data-r style="--d:.2s" aria-label="Avaliações no Google, por loja">' + links + '</div></div></section>';
  }

  function telBloco(t) {
    return '<p class="tel"><a href="' + telHref(t) + '">' + esc(fmtTel(t)) + '</a><button type="button" class="copia" data-copia="' + esc(fmtTel(t)) + '">Copiar</button></p>';
  }
  function lojas() {
    const ord = S.lojas.filter((l) => !l.sede).concat(S.lojas.filter((l) => l.sede));
    const cart = ord.map((l, i) => '<article class="lj' + (l.sede ? ' lj--sede' : '') + '" data-r style="--d:' + (i % 3) * 0.1 + 's"><span class="lj__z">' + esc(l.zona) + '</span><h3 class="lj__n">' + esc(l.nome) + '</h3>' +
      (l.morada ? '<p class="lj__m">' + esc(l.morada) + '</p>' : '') + (l.horario ? '<p class="lj__h">' + IC.hora + esc(l.horario) + '</p>' : '') +
      '<a class="lk" target="_blank" rel="noopener" href="' + esc(mapa(l)) + '">Ver no mapa</a>' + telBloco(l.tel) + '</article>').join('');
    const info = S.marca.info ? '<article class="lj lj--info" data-r><span class="lj__z">Mais informações</span><h3 class="lj__n">+info</h3><p class="lj__m">Tem uma dúvida? Ligue-nos ou envie mensagem.</p>' +
      (S.marca.email ? '<p class="lj__m" style="user-select:all">' + esc(S.marca.email) + '</p>' : '') + telBloco(S.marca.info) + '</article>' : '';
    return '<section class="sec tema-veludo" id="lojas"><div class="wrap"><div class="pilha"><p class="kicker" data-r>Lojas e contactos</p><h2 class="h2" data-r style="--d:.08s">' + esc(S.contactos.titulo) + '</h2><p class="txt" data-r style="--d:.16s">' + esc(S.contactos.texto) + '</p></div>' +
      '<div class="lojas-g">' + cart + info + '</div></div></section>';
  }

  function rodape() {
    const url = (u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
    const redes = [S.marca.instagram && ['Instagram', S.marca.instagram], S.marca.facebook && ['Facebook', S.marca.facebook]].filter(Boolean)
      .map((r) => '<a class="lk" target="_blank" rel="noopener" href="' + esc(url(r[1])) + '">' + r[0] + '</a>').join('');
    return '<footer class="rodape"><div class="wrap"><div class="rodape__g"><div class="rodape__logo">' + logoS('s') + logoW('w') + '</div><nav aria-label="Rodapé">' + navLinks() + '</nav></div>' +
      '<div class="rodape__b"><span>© ' + new Date().getFullYear() + ' Forevergold · Compra e venda de ouro e prata</span><span class="redes">' + redes + '</span></div></div></footer>';
  }

  /* ============ montagem ============ */
  const app = $('#app');
  app.innerHTML = '<div id="fg-site"></div><div id="fg-ui"></div>';
  const site = $('#fg-site'), ui = $('#fg-ui');
  let limpezas = [];

  function desenhaSite() {
    limpezas.forEach((f) => { try { f(); } catch (e) {} }); limpezas = [];
    site.innerHTML = defs() + topo() + '<main>' + hero() + casa() + compra() + penhor() + laser() + oficina() + loja() + avaliacoes() + lojas() + '</main>' + rodape();
    $$('[data-wa]', site).forEach((a) => { a.href = waLink(a.getAttribute('data-wa')); });
    atualizaContador();
    ligaAnimacoes();
  }

  /* ============ animações ============ */
  function ligaAnimacoes() {
    const raiz = D.documentElement;
    const anima = !reduz && 'IntersectionObserver' in W;
    raiz.classList.toggle('anim', anima);
    if (anima) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      $$('[data-r],.filete', site).forEach((el) => io.observe(el));
      limpezas.push(() => io.disconnect());
    }
    // topo sólido + palavra gigante a deslizar + secção ativa
    const top = $('#topo'), gig = $('[data-desliza]', site), secs = NAV.map((n) => $('#' + n[0])).filter(Boolean), links = $$('.nav a', site);
    let marcado = false;
    const aoRolar = () => {
      marcado = false;
      const y = W.scrollY;
      top.classList.toggle('solido', y > 30);
      if (gig && !reduz) { const r = gig.parentElement.getBoundingClientRect(); if (r.bottom > 0 && r.top < W.innerHeight) gig.style.transform = 'translateX(' + (-(W.innerHeight - r.top) * 0.18).toFixed(1) + 'px)'; }
      let ativo = '';
      secs.forEach((s) => { if (s.getBoundingClientRect().top < W.innerHeight * 0.4) ativo = s.id; });
      links.forEach((a) => a.classList.toggle('ativo', a.getAttribute('data-ir') === ativo));
    };
    const pede = () => { if (!marcado) { marcado = true; requestAnimationFrame(aoRolar); } };
    W.addEventListener('scroll', pede, { passive: true }); aoRolar();
    limpezas.push(() => W.removeEventListener('scroll', pede));
    poeira(); inclina(); relogio(); gravador(); linhaAbas();
  }

  function poeira() {
    const c = $('.hero__po', site); if (!c || reduz) return;
    const ctx = c.getContext('2d'); let w = 0, h = 0, pts = [], vivo = true, visivel = true, id = 0;
    const mede = () => { const r = c.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1); w = r.width; h = r.height; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.min(90, Math.round(w / 15)); pts = Array.from({ length: n }, () => novo(true)); };
    const novo = (ini) => ({ x: Math.random() * w, y: ini ? Math.random() * h : h + 10, r: 0.5 + Math.random() * 1.7, vy: 0.08 + Math.random() * 0.32, vx: (Math.random() - 0.5) * 0.14, f: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6 });
    const passo = (t) => {
      if (!vivo) return; id = requestAnimationFrame(passo); if (!visivel) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; p.y -= p.vy; p.x += p.vx + Math.sin(t / 2400 + p.f) * 0.1;
        if (p.y < -10) pts[i] = novo(false);
        const a = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t / 900 * p.s + p.f));
        ctx.globalAlpha = a; ctx.fillStyle = p.r > 1.6 ? '#F3E3B5' : '#C6A766';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
    mede(); id = requestAnimationFrame(passo);
    const io = new IntersectionObserver((e) => { visivel = e[0].isIntersecting; }); io.observe(c);
    W.addEventListener('resize', mede);
    limpezas.push(() => { vivo = false; cancelAnimationFrame(id); io.disconnect(); W.removeEventListener('resize', mede); });
  }

  function inclina() {
    const h = $('.hero', site), s = $('.hero__simbolo>svg', site);
    if (!h || !s || reduz || !W.matchMedia('(hover:hover)').matches) return;
    const mexe = (e) => { const r = h.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; s.style.transform = 'rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)'; };
    const sai = () => { s.style.transform = ''; };
    h.addEventListener('pointermove', mexe); h.addEventListener('pointerleave', sai);
    limpezas.push(() => { h.removeEventListener('pointermove', mexe); h.removeEventListener('pointerleave', sai); });
  }

  function relogio() {
    const sv = $('#relogio', site); if (!sv) return;
    const H = $('#rel-h', sv), M = $('#rel-m', sv), Sg = $('#rel-s', sv), g1 = $('#rel-g1', sv), g2 = $('#rel-g2', sv), txt = $('#rel-txt', site);
    let vivo = true, visivel = true, id = 0, ultimo = -1;
    const rot = (el, a, cx, cy) => el.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + cx + ' ' + cy + ')');
    const passo = () => {
      if (!vivo) return; if (!reduz) id = requestAnimationFrame(passo); if (!visivel) return;
      const d = new Date(), ms = d.getMilliseconds(), s = d.getSeconds() + (reduz ? 0 : ms / 1000), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
      rot(H, h * 30, 200, 220); rot(M, m * 6, 200, 220); rot(Sg, s * 6, 200, 220);
      const t = d.getTime() / 1000; rot(g1, (t * 24) % 360, 184, 290); rot(g2, -(t * 33.6) % 360, 226, 312);
      if (d.getSeconds() !== ultimo) { ultimo = d.getSeconds(); txt.textContent = d.toLocaleTimeString('pt-PT'); }
    };
    passo();
    let tic = 0; if (reduz) tic = setInterval(passo, 1000);
    const io = new IntersectionObserver((e) => { visivel = e[0].isIntersecting; }); io.observe(sv);
    limpezas.push(() => { vivo = false; cancelAnimationFrame(id); clearInterval(tic); io.disconnect(); });
  }

  /* gravação a laser */
  function gravador() {
    const palco = $('#palco', site), form = $('#gravador', site); if (!palco) return;
    const sv = $(':scope>svg', palco), leg = $('#palco-leg', palco), inp = $('#grav-txt', form);
    const NS = 'http://www.w3.org/2000/svg';
    let anim = 0, jaTocou = false;
    const monta = (tocar) => {
      cancelAnimationFrame(anim);
      const o = OBJETOS.find((x) => x.id === grav.obj) || OBJETOS[0];
      const texto = (inp.value || '').trim() || S.laser.exemplo || 'Forevergold';
      const escuro = o.metal === 'ouro' ? '#5A4618' : '#4E5553', luz = o.metal === 'ouro' ? '#FFF3C9' : '#FFFFFF';
      const cls = 'grav-letra' + (grav.letra === 'manuscrita' ? ' manuscrita' : '');
      const tam = o.tam * (grav.letra === 'manuscrita' ? 1.22 : 1);
      leg.textContent = o.leg || o.nome;
      sv.innerHTML = '<defs><clipPath id="fg-rev"><rect id="grav-rev" x="0" y="0" width="0" height="400"/></clipPath></defs>' + o.svg +
        '<g clip-path="url(#fg-rev)"><text class="' + cls + '" x="' + (o.x + 0.9) + '" y="' + (o.y + 0.9) + '" text-anchor="middle" font-size="' + tam + '" fill="' + luz + '" fill-opacity=".7"></text>' +
        '<text class="' + cls + '" id="grav-t" x="' + o.x + '" y="' + o.y + '" text-anchor="middle" font-size="' + tam + '" fill="' + escuro + '"></text></g>' +
        '<g id="grav-fx"></g><g id="grav-cab" opacity="0"><line id="grav-raio" x1="0" y1="0" x2="0" y2="0" stroke="#FFD9A0" stroke-opacity=".5" stroke-width="1.2"/><circle r="11" fill="#FF9A4D" opacity=".75" filter="url(#fg-glow)"/><circle r="3" fill="#FFFDF5"/></g>';
      const ts = $$('text', sv); ts.forEach((t) => { t.textContent = texto; });
      const t = $('#grav-t', sv);
      let larg = 0; try { larg = t.getComputedTextLength(); } catch (e) { larg = texto.length * tam * 0.5; }
      if (larg > o.max) { const f = tam * o.max / larg; ts.forEach((x) => x.setAttribute('font-size', f.toFixed(1))); larg = o.max; }
      const fs = parseFloat(t.getAttribute('font-size')), x0 = o.x - larg / 2 - 4, x1 = o.x + larg / 2 + 4;
      const rev = $('#grav-rev', sv), cab = $('#grav-cab', sv), raio = $('#grav-raio', sv), fx = $('#grav-fx', sv);
      if (!tocar || reduz) { rev.setAttribute('width', 600); return; }
      const dur = 1100 + texto.length * 120; let ini = 0, fa = [];
      cab.setAttribute('opacity', 1);
      const passo = (agora) => {
        if (!ini) ini = agora;
        const p = Math.min(1, (agora - ini) / dur), x = x0 + (x1 - x0) * p, y = o.y - fs * 0.32 + Math.sin(agora / 28) * fs * 0.3;
        rev.setAttribute('x', x0); rev.setAttribute('width', Math.max(0, x - x0));
        cab.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
        raio.setAttribute('x2', (300 - x) * 0.25); raio.setAttribute('y2', -y - 20);
        if (p < 1 && fa.length < 46) { const c = D.createElementNS(NS, 'circle'); c.setAttribute('r', (0.6 + Math.random() * 1.4).toFixed(1)); c.setAttribute('fill', Math.random() > 0.4 ? '#FFD9A0' : '#FFFFFF'); fx.appendChild(c); fa.push({ el: c, x: x, y: y, vx: (Math.random() - 0.5) * 3.2, vy: -1 - Math.random() * 3, v: 1 }); }
        fa = fa.filter((f) => { f.x += f.vx; f.y += f.vy; f.vy += 0.16; f.v -= 0.035; if (f.v <= 0) { f.el.remove(); return false; } f.el.setAttribute('cx', f.x.toFixed(1)); f.el.setAttribute('cy', f.y.toFixed(1)); f.el.setAttribute('opacity', f.v.toFixed(2)); return true; });
        if (p < 1 || fa.length) anim = requestAnimationFrame(passo); else cab.setAttribute('opacity', 0);
        if (p >= 1) cab.setAttribute('opacity', 0);
      };
      anim = requestAnimationFrame(passo);
    };
    monta(false);
    const aoSub = (e) => { e.preventDefault(); monta(true); };
    const aoClique = (e) => {
      const b = e.target.closest('[data-obj],[data-letra]'); if (!b) return;
      if (b.dataset.obj) grav.obj = b.dataset.obj; else grav.letra = b.dataset.letra;
      $$('[data-obj]', form).forEach((x) => x.setAttribute('aria-pressed', x.dataset.obj === grav.obj));
      $$('[data-letra]', form).forEach((x) => x.setAttribute('aria-pressed', x.dataset.letra === grav.letra));
      monta(true);
    };
    form.addEventListener('submit', aoSub); form.addEventListener('click', aoClique);
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !jaTocou) { jaTocou = true; setTimeout(() => monta(true), 500); } }, { threshold: 0.45 });
    io.observe(palco);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { if (!jaTocou && palco.isConnected) monta(false); });
    limpezas.push(() => { cancelAnimationFrame(anim); io.disconnect(); });
  }

  function linhaAbas() {
    const lin = $('.abas__lin', site), sel = $('.aba[aria-selected="true"]', site); if (!lin || !sel) return;
    lin.style.width = sel.offsetWidth + 'px'; lin.style.transform = 'translateX(' + sel.offsetLeft + 'px)';
  }

  /* ============ carrinho ============ */
  let cesto = {}; try { cesto = JSON.parse(guarda.get('fg-cesto') || '{}') || {}; } catch (e) { cesto = {}; }
  const ped = { nome: '', tel: '', entrega: 'loja', loja: '', morada: '', obs: '' };
  const linhasCesto = () => Object.keys(cesto).map((id) => ({ p: S.produtos.find((x) => x.id === id), q: cesto[id] })).filter((l) => l.p && l.q > 0);
  const totalQ = () => linhasCesto().reduce((a, l) => a + l.q, 0);
  function atualizaContador(salta) {
    const n = totalQ();
    $$('[data-cesto-n]').forEach((el) => { el.textContent = n; if (salta && el.classList.contains('carrinho-n')) { el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta'); } });
  }
  function gravaCesto() { guarda.set('fg-cesto', JSON.stringify(cesto)); }
  function textoEncomenda() {
    const ls = linhasCesto(); let tot = 0, cons = false;
    const itens = ls.map((l) => { const sp = l.p.preco == null || l.p.preco === ''; if (sp) cons = true; else tot += l.p.preco * l.q; return '• ' + l.q + ' × ' + l.p.nome + ' (' + (sp ? 'preço sob consulta' : euro(l.p.preco)) + ')'; });
    const ent = ped.entrega === 'loja' ? 'levantar na loja' + (ped.loja ? ' de ' + ped.loja : '') : 'envio para: ' + (ped.morada || '(morada por indicar)');
    return 'Olá, Forevergold! Gostava de fazer esta encomenda pelo site:\n\n' + itens.join('\n') + '\n\nTotal: ' + euro(tot) + (cons ? ' + artigos sob consulta' : '') + '\n\nNome: ' + ped.nome + '\nTelemóvel: ' + ped.tel + '\nEntrega: ' + ent + (ped.obs ? '\nObservações: ' + ped.obs : '');
  }
  function montaCesto() {
    ui.insertAdjacentHTML('beforeend', '<div class="veu" id="veu"></div>' +
      '<aside class="painel" id="cesto" aria-label="Carrinho" aria-hidden="true"><div class="painel__cab"><h2>O seu carrinho</h2><button class="icone-btn" data-act="fechar" aria-label="Fechar o carrinho">' + IC.fechar + '</button></div>' +
      '<div class="painel__corpo"><div id="cesto-itens" class="pilha" style="gap:16px"></div>' +
      '<form id="cesto-form" class="pilha" style="gap:14px" novalidate hidden>' +
      '<div class="campo"><label for="ped-nome">O seu nome</label><input class="inp" id="ped-nome" data-ped="nome" autocomplete="name"></div>' +
      '<div class="campo"><label for="ped-tel">Telemóvel</label><input class="inp" id="ped-tel" data-ped="tel" inputmode="tel" autocomplete="tel"></div>' +
      '<div class="campo"><span class="rot">Como quer receber?</span><div class="radios"><label class="radio"><input type="radio" name="ped-ent" id="ped-ent-loja" value="loja" checked><span>Levantar em loja</span></label><label class="radio"><input type="radio" name="ped-ent" id="ped-ent-envio" value="envio"><span>Envio para casa</span></label></div></div>' +
      '<div class="campo" id="ped-loja-c"><label for="ped-loja">Em que loja?</label><select class="inp" id="ped-loja" data-ped="loja"></select></div>' +
      '<div class="campo" id="ped-morada-c" hidden><label for="ped-morada">Morada de envio</label><textarea class="inp" id="ped-morada" data-ped="morada" autocomplete="street-address"></textarea></div>' +
      '<div class="campo"><label for="ped-obs">Observações (opcional)</label><textarea class="inp" id="ped-obs" data-ped="obs" placeholder="Tamanho do anel, gravação, etc."></textarea></div>' +
      '</form></div>' +
      '<div class="painel__pe" id="cesto-pe" hidden><div class="total"><span>Total</span><b id="cesto-total"></b></div><p class="mini" id="cesto-nota"></p>' +
      '<a class="btn btn--whats btn--cheio" id="cesto-wa" target="_blank" rel="noopener" href="#" aria-disabled="true">' + IC.whats + 'Enviar encomenda pelo WhatsApp</a>' +
      '<p class="mini" id="cesto-falta">Escreva o seu nome e telemóvel para continuar.</p>' +
      '<p class="mini" id="cesto-dep" hidden>O WhatsApp abre num novo separador com a encomenda já escrita. A encomenda só fica feita depois de carregar em enviar no WhatsApp. Se não abrir, copie o texto e envie para o ' + '<b id="cesto-num"></b>.</p>' +
      '<button type="button" class="lk" id="cesto-copia" hidden>Copiar o texto da encomenda</button></div></aside>');
    desenhaCesto();
  }
  function desenhaCesto() {
    const ls = linhasCesto(), itens = $('#cesto-itens'), form = $('#cesto-form'), pe = $('#cesto-pe');
    if (!itens) return;
    if (!ls.length) {
      itens.innerHTML = '<div class="cesto-vazio">' + glifo('aliancas').replace('class="glifo"', 'class="glifo" style="width:90px;color:#A6894B"') + '<p>O carrinho está vazio.</p><button type="button" class="btn btn--linha" data-act="fechar" data-ir="loja">Ver artigos</button></div>';
      form.hidden = true; pe.hidden = true; atualizaContador(); return;
    }
    let tot = 0, cons = false;
    itens.innerHTML = ls.map((l) => { const sp = l.p.preco == null || l.p.preco === ''; if (sp) cons = true; else tot += l.p.preco * l.q;
      return '<div class="item"><div class="item__i">' + (l.p.img ? '<img src="' + esc(l.p.img) + '" alt="">' : glifo(l.p.cat)) + '</div><div><p class="item__n">' + esc(l.p.nome) + '</p><p class="item__p">' + (sp ? 'Preço sob consulta' : euro(l.p.preco)) + '</p></div>' +
        '<div class="qtd"><button type="button" data-q="-1" data-id="' + esc(l.p.id) + '" aria-label="Tirar um">−</button><span>' + l.q + '</span><button type="button" data-q="1" data-id="' + esc(l.p.id) + '" aria-label="Juntar mais um">+</button></div></div>'; }).join('');
    form.hidden = false; pe.hidden = false;
    const sel = $('#ped-loja'); const atual = ped.loja || sel.value;
    sel.innerHTML = lojasReais().map((l) => '<option' + (l.nome === atual ? ' selected' : '') + '>' + esc(l.nome) + '</option>').join(''); ped.loja = sel.value;
    $('#cesto-total').textContent = euro(tot);
    $('#cesto-nota').textContent = (cons ? 'Há artigos com preço sob consulta: dizemos-lhe o valor na resposta. ' : '') + 'O pagamento e a entrega são combinados consigo depois de recebermos a encomenda.';
    $('#cesto-num').textContent = fmtTel(S.marca.whatsapp);
    atualizaEnvio(); atualizaContador();
  }
  function atualizaEnvio() {
    const a = $('#cesto-wa'); if (!a) return;
    const ok = ped.nome.trim().length > 1 && digitos(ped.tel).length >= 9 && (ped.entrega === 'loja' || ped.morada.trim().length > 5);
    a.setAttribute('aria-disabled', String(!ok)); a.href = ok ? waLink(textoEncomenda()) : '#';
    $('#cesto-falta').hidden = ok;
    $('#cesto-falta').textContent = ped.entrega === 'envio' && ped.nome.trim().length > 1 && digitos(ped.tel).length >= 9 ? 'Escreva a morada de envio para continuar.' : 'Escreva o seu nome e telemóvel para continuar.';
    $('#cesto-copia').hidden = !ok;
  }
  function junta(id, origem) {
    cesto[id] = (cesto[id] || 0) + 1; gravaCesto(); desenhaCesto(); atualizaContador(true);
    const alvo = $('.topo .carrinho-n') || $('.carrinho-n');
    if (origem && alvo && !reduz && origem.animate) {
      const a = origem.getBoundingClientRect(), b = alvo.getBoundingClientRect();
      const v = D.createElement('div'); v.className = 'voa'; v.innerHTML = origem.querySelector('img') ? '<img src="' + origem.querySelector('img').src + '" alt="">' : (origem.querySelector('.glifo') ? origem.querySelector('.glifo').outerHTML : '');
      const t = Math.min(a.width, a.height) * 0.6;
      v.style.cssText = 'left:' + (a.left + a.width / 2 - t / 2) + 'px;top:' + (a.top + a.height / 2 - t / 2) + 'px;width:' + t + 'px;height:' + t + 'px';
      D.body.appendChild(v);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      v.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(.6)', opacity: 1, offset: 0.55 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: 0.2 }], { duration: 850, easing: 'cubic-bezier(.3,.6,.2,1)' }).onfinish = () => v.remove();
    }
    aviso('Adicionado ao carrinho.');
  }

  /* ============ painéis, avisos ============ */
  let tAviso = 0;
  function aviso(msg, ms) {
    let t = $('#toast'); if (!t) { ui.insertAdjacentHTML('beforeend', '<div class="toast" id="toast" role="status" aria-live="polite"></div>'); t = $('#toast'); }
    t.textContent = msg; void t.offsetWidth; t.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => t.classList.remove('ver'), ms || 2600);
  }
  let aberto = null, focoAntes = null;
  function abre(id) {
    fecha(true); const p = $('#' + id); if (!p) return;
    focoAntes = D.activeElement; aberto = id; p.classList.add('aberto'); p.setAttribute('aria-hidden', 'false');
    $('#veu').classList.add('aberto'); D.documentElement.classList.add('trancado');
    const f = $('button,[href],input', p); if (f) setTimeout(() => f.focus({ preventScroll: true }), 80);
  }
  function fecha(silencio) {
    if (!aberto) return; const p = $('#' + aberto); p.classList.remove('aberto'); p.setAttribute('aria-hidden', 'true');
    $('#veu').classList.remove('aberto'); D.documentElement.classList.remove('trancado');
    aberto = null; if (!silencio && focoAntes && focoAntes.focus) focoAntes.focus({ preventScroll: true });
  }
  function irPara(id) { const el = $('#' + id); if (el) el.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' }); }
  function copiar(txt, ok) {
    const feito = () => aviso(ok || 'Copiado.');
    const falhou = () => aviso('Não foi possível copiar. Selecione o texto e copie à mão.', 4200);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(feito, falhou); else falhou(); } catch (e) { falhou(); }
  }

  /* ============ eventos (delegados) ============ */
  D.addEventListener('click', (e) => {
    const t = e.target;
    const ir = t.closest('[data-ir]');
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'cesto') { desenhaCesto(); abre('cesto'); }
      else if (a === 'fechar') fecha();
      else if (a === 'menu') { $('#menu').classList.add('aberto'); $('#menu').setAttribute('aria-hidden', 'false'); D.documentElement.classList.add('trancado'); }
      else if (a === 'menu-fechar') fechaMenu();
    }
    if (ir) { e.preventDefault(); fechaMenu(); const id = ir.dataset.ir; setTimeout(() => irPara(id), act ? 250 : 0); return; }
    if (t.id === 'veu') { fecha(); return; }
    const j = t.closest('[data-junta]'); if (j) { junta(j.dataset.junta, j.closest('.prod').querySelector('.prod__img')); return; }
    const q = t.closest('[data-q]'); if (q) { const id = q.dataset.id; cesto[id] = (cesto[id] || 0) + Number(q.dataset.q); if (cesto[id] <= 0) delete cesto[id]; gravaCesto(); desenhaCesto(); return; }
    const ab = t.closest('[data-aba]'); if (ab) { abaLoja = ab.dataset.aba; $$('.aba', site).forEach((x) => x.setAttribute('aria-selected', x === ab)); $('#grelha').innerHTML = grelhaLoja(); linhaAbas(); return; }
    const cp = t.closest('[data-copia]'); if (cp) { copiar(cp.dataset.copia, 'Número copiado: ' + cp.dataset.copia); return; }
    if (t.closest('#cesto-copia')) { copiar(textoEncomenda(), 'Texto da encomenda copiado.'); return; }
    const wa = t.closest('#cesto-wa'); if (wa) { if (wa.getAttribute('aria-disabled') === 'true') { e.preventDefault(); aviso('Falta preencher o nome e o telemóvel.'); } else { $('#cesto-dep').hidden = false; } }
  });
  function fechaMenu() { const m = $('#menu'); if (m && m.classList.contains('aberto')) { m.classList.remove('aberto'); m.setAttribute('aria-hidden', 'true'); D.documentElement.classList.remove('trancado'); } }
  D.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.ped) { ped[t.dataset.ped] = t.value; atualizaEnvio(); }
  });
  D.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'ped-ent') { ped.entrega = t.value; $('#ped-loja-c').hidden = t.value !== 'loja'; $('#ped-morada-c').hidden = t.value !== 'envio'; atualizaEnvio(); }
    if (t.id === 'ped-loja') { ped.loja = t.value; atualizaEnvio(); }
  });
  D.addEventListener('submit', (e) => { if (e.target.closest('#fg-ui')) e.preventDefault(); });
  D.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fechaMenu(); if (aberto) fecha(); } });
  W.addEventListener('resize', linhaAbas);

  /* ============ arranque ============ */
  (function dadosEstruturados() {
    const tel = (t) => '+351' + digitos(t).replace(/^351/, '');
    const g = {
      '@context': 'https://schema.org', '@type': 'JewelryStore', name: 'Forevergold',
      description: 'Compra e venda de ouro e prata, penhor, reparação de relógios e gravação a laser.',
      email: S.marca.email || undefined, telephone: tel(S.marca.info || S.marca.whatsapp),
      areaServed: 'Porto',
      department: lojasReais().map((l) => ({ '@type': 'JewelryStore', name: 'Forevergold ' + l.nome, telephone: tel(l.tel), address: { '@type': 'PostalAddress', streetAddress: l.morada || undefined, addressLocality: l.zona, addressCountry: 'PT' } })),
    };
    const el = D.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(g); D.head.appendChild(el);
  })();
  desenhaSite();
  montaCesto();
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(linhaAbas);
})();
