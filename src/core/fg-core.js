/* ForeverGold — camada de dados e utilitários.
   Hoje guarda tudo no dispositivo (localStorage + IndexedDB para fotos e vídeos).
   Para ligar a um servidor, basta substituir FGCore.db e FGCore.media mantendo as mesmas funções. */
(function () {
  'use strict';
  var Date = window.LDate || window.Date; // hora de Lisboa (src/core/lisboa.js)
  var KEY = 'fg-app-v1', SKEY = 'fg-sessao', LKEY = 'fg-bloqueio';

  var CONTAS = [
    { id: 'cliente', nome: 'Cliente', tipo: 'cliente' },
    { id: 'forevervalbom', nome: 'Valbom', tipo: 'loja', loja: 'valbom' },
    { id: 'foreverstovidio', nome: 'Santo Ovídio', tipo: 'loja', loja: 'stovidio' },
    { id: 'foreverpedroucos', nome: 'Pedrouços', tipo: 'loja', loja: 'pedroucos' },
    { id: 'foreverriotinto', nome: 'Rio Tinto', tipo: 'loja', loja: 'riotinto' },
    { id: 'foreverarrifana', nome: 'Arrifana', tipo: 'loja', loja: 'arrifana' },
    { id: 'foreveroficina', nome: 'Oficina', tipo: 'equipa' },
    { id: 'foreverbu', nome: 'BU', tipo: 'equipa', pub: true },
    { id: 'foreverfilipe', nome: 'Filipe', tipo: 'equipa' }
  ];
  var LOJAS_ORDEM = ['valbom', 'stovidio', 'pedroucos', 'riotinto', 'arrifana'];
  var LOJAS_BASE = [
    { id: 'valbom', nome: 'Valbom', zona: 'Gondomar', morada: 'Rua Novais da Cunha, 1135, Valbom 4420-226', horario: '9h30 – 13h00 · 14h00 – 18h30', tel: '220180168', whats: '932656581', email: 'geralforevergold@gmail.com' },
    { id: 'stovidio', nome: 'Santo Ovídio', zona: 'Vila Nova de Gaia', morada: 'Rua Conceição Fernandes, 72, 4430-062 Vila Nova de Gaia', horario: '9h30 – 12h30 · 14h00 – 19h00', tel: '220935909', whats: '932656581', email: 'geralforevergold@gmail.com' },
    { id: 'pedroucos', nome: 'Pedrouços', zona: 'Maia', morada: 'Rua D. Afonso Henriques, 1502, 4435-003', horario: '9h30 – 12h30 · 14h00 – 19h00', tel: '223174709', whats: '932656581', email: 'geralforevergold@gmail.com' },
    { id: 'riotinto', nome: 'Rio Tinto', zona: 'Gondomar', morada: 'Av. Dr. Domingos Gonçalves de Sá 434 Lj 12, 4435-213 Rio Tinto', horario: '9h30 – 13h00 · 14h00 – 18h30', tel: '220920620', whats: '932656581', email: 'geralforevergold@gmail.com' },
    { id: 'arrifana', nome: 'Arrifana', zona: 'Santa Maria da Feira', morada: 'Rua Terras de Santa Maria, 1521, 3700-398 Arrifana', horario: '9h30 – 12h30 · 14h00 – 19h00', tel: '256038450', whats: '932656581', email: 'forevergold.arrifana@gmail.com' }
  ];
  var CATS = [
    { id: 'aneis', nome: 'Anéis', g: 'aliancas' }, { id: 'aliancas', nome: 'Alianças', g: 'aliancas' },
    { id: 'fios', nome: 'Fios', g: 'bilaminados' }, { id: 'pulseiras', nome: 'Pulseiras', g: 'prata' },
    { id: 'brincos', nome: 'Brincos', g: 'prata' }, { id: 'relogios', nome: 'Relógios', g: 'relogios' },
    { id: 'curso', nome: 'Anéis de curso', g: 'curso' }, { id: 'religioso', nome: 'Religioso', g: 'religioso' },
    { id: 'outros', nome: 'Outros', g: 'aliancas' }
  ];
  var MATERIAIS = ['Ouro 19,2 kt', 'Ouro 18 kt', 'Ouro 14 kt', 'Ouro 9 kt', 'Prata 925', 'Bilaminado', 'Aço', 'Outro'];
  var ESTADOS = [{ id: 'disponivel', nome: 'Disponível' }, { id: 'reservada', nome: 'Reservada' }, { id: 'vendida', nome: 'Vendida' }];
  var PECAS_BASE = [
    { loja: 'valbom', cat: 'aliancas', titulo: 'Par de alianças clássicas', preco: 420, mat: 'Ouro 19,2 kt', peso: 9.4, estado: 'disponivel' },
    { loja: 'valbom', cat: 'relogios', titulo: 'Relógio clássico de senhora', preco: 149, mat: 'Aço', peso: 28, estado: 'reservada' },
    { loja: 'valbom', cat: 'pulseiras', titulo: 'Pulseira escrava em prata', preco: 59, mat: 'Prata 925', peso: 18.5, estado: 'disponivel' },
    { loja: 'valbom', cat: 'religioso', titulo: 'Medalha de Nossa Senhora de Fátima', preco: 35, mat: 'Prata 925', peso: 3.2, estado: 'vendida' },
    { loja: 'stovidio', cat: 'relogios', titulo: 'Relógio automático de homem', preco: 289, mat: 'Aço', peso: 86, estado: 'disponivel' },
    { loja: 'stovidio', cat: 'aneis', titulo: 'Aliança de noivado com pedra', preco: 260, mat: 'Ouro 19,2 kt', peso: 3.1, estado: 'disponivel' },
    { loja: 'stovidio', cat: 'fios', titulo: 'Fio bilaminado', preco: 45, mat: 'Bilaminado', peso: 6, estado: 'disponivel' },
    { loja: 'pedroucos', cat: 'curso', titulo: 'Anel de curso de Direito', preco: null, mat: 'Ouro 19,2 kt', peso: null, estado: 'disponivel' },
    { loja: 'pedroucos', cat: 'fios', titulo: 'Fio em prata, 50 cm', preco: 39, mat: 'Prata 925', peso: 4.8, estado: 'disponivel' },
    { loja: 'pedroucos', cat: 'religioso', titulo: 'Crucifixo com fio', preco: 49, mat: 'Prata 925', peso: 5.5, estado: 'reservada' },
    { loja: 'riotinto', cat: 'aliancas', titulo: 'Par de alianças em prata', preco: 75, mat: 'Prata 925', peso: 7, estado: 'disponivel' },
    { loja: 'riotinto', cat: 'relogios', titulo: 'Relógio de bolso com corrente', preco: 120, mat: 'Aço', peso: 64, estado: 'disponivel' },
    { loja: 'riotinto', cat: 'pulseiras', titulo: 'Pulseira bilaminada', preco: 38, mat: 'Bilaminado', peso: 5.2, estado: 'vendida' },
    { loja: 'arrifana', cat: 'curso', titulo: 'Anel de curso de Enfermagem', preco: null, mat: 'Ouro 19,2 kt', peso: null, estado: 'disponivel' },
    { loja: 'arrifana', cat: 'brincos', titulo: 'Brincos em prata', preco: 29, mat: 'Prata 925', peso: 2.4, estado: 'disponivel' },
    { loja: 'arrifana', cat: 'religioso', titulo: 'Terço em prata', preco: 65, mat: 'Prata 925', peso: 12, estado: 'disponivel' }
  ];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MESES_C = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var DIAS_C = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var DIAS_L = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  /* ---------- utilitários ---------- */
  var INICIO = { y: 2026, m: 10 };
  function emJogo(y, m) { return y * 12 + m >= INICIO.y * 12 + INICIO.m; }
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseYmd = function (s) { var a = String(s).split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
  function weeksOfMonth(y, m) {
    var first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, last = new Date(y, m + 1, 0), weeks = [];
    var start = new Date(y, m, 1 - off);
    while (start <= last) {
      var w = [];
      for (var i = 0; i < 7; i++) w.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      weeks.push(w);
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    }
    return weeks;
  }
  var digitos = function (s) { return String(s == null ? '' : s).replace(/\D/g, ''); };
  function parseNum(s) {
    var t = String(s == null ? '' : s).replace(/[\s€]/g, '');
    if (!t) return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }
  function euro(n, dec) {
    if (n == null || isNaN(n)) return '';
    var d = dec == null ? 2 : dec;
    try { return Number(n).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }); }
    catch (e) { return Number(n).toFixed(d).replace('.', ',') + ' €'; }
  }
  function numero(n, dec) {
    var d = dec || 0;
    try { return Number(n).toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true }); }
    catch (e) { return Number(n).toFixed(d); }
  }
  function fmtTel(s) { var d = digitos(s).replace(/^351(?=\d{9}$)/, ''); return d.length === 9 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : String(s || ''); }
  function telHref(s) { var d = digitos(s); return d ? 'tel:+' + (d.length === 9 ? '351' + d : d) : ''; }
  function waHref(s, txt) { var d = digitos(s); if (!d) return ''; return 'https://wa.me/' + (d.length === 9 ? '351' + d : d) + (txt ? '?text=' + encodeURIComponent(txt) : ''); }
  function mapHref(l) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Forevergold ' + (l.morada || l.nome)); }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hora(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function quando(t, agora) {
    var n = agora || Date.now(), d = new Date(t), hoje = new Date(n); hoje.setHours(0, 0, 0, 0);
    var diff = n - t;
    if (diff < 60e3) return 'agora';
    if (diff < 3600e3) return 'há ' + Math.floor(diff / 60e3) + ' min';
    if (t >= hoje.getTime()) return 'hoje, ' + hora(t);
    if (t >= hoje.getTime() - 864e5) return 'ontem, ' + hora(t);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ', ' + hora(t);
  }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- dados de exemplo ---------- */
  function seed() {
    var now = new Date(), t = now.getTime(), H = 3600e3, D = 864e5, R = rng(20261007);
    var lojas = {};
    LOJAS_BASE.forEach(function (l) { lojas[l.id] = Object.assign({}, l); });
    var pecas = PECAS_BASE.map(function (p, i) { return Object.assign({ id: 'pex' + i, fotos: [], ex: true, at: t - (i + 1) * H }, p); });
    var chat = [
      { id: 'cex1', by: 'foreverfilipe', at: t - 2 * D - 2 * H, txt: 'Bom dia a todos. A partir de segunda-feira começamos a preparar as montras de Natal. Cada loja recebe o material durante a semana.', urg: false, ex: true },
      { id: 'cex2', by: 'foreveroficina', at: t - D - 5 * H, txt: 'A balança grande da oficina está em calibração até quinta-feira. Até lá, as pesagens de ouro para compra fazem-se só nas lojas.', urg: true, ex: true },
      { id: 'cex3', by: 'forevervalbom', at: t - 40 * 60e3, txt: 'Recebido. Obrigada!', urg: false, ex: true }
    ];
    var cot = {}, v = 63.2, d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), n = 0, quem = ['forevervalbom', 'foreverriotinto', 'foreverfilipe', 'foreverstovidio'];
    while (n < 12) {
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) {
        var r2 = function (x) { return Math.round(x * 100) / 100; };
        cot[ymd(d)] = { of: r2(v), ou: r2(v * 0.915), pf: r2(0.86 + (R() - 0.5) * 0.04), pu: r2(0.71 + (R() - 0.5) * 0.04), nota: '', by: quem[n % quem.length], at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 20 + n).getTime(), ex: true };
        v -= (R() - 0.45) * 0.9; n++;
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    }
    var lucro = {};
    var seen = {};
    CONTAS.forEach(function (c) { if (c.tipo !== 'cliente') seen[c.id] = { chat: t - 2 * D, cot: t - 2 * D, pub: t - 4 * H, lucro: t - 2 * D }; });
    var pub = [{
      id: 'uex1', by: 'foreverbu', at: t - 3 * H, titulo: 'Compra de ouro · outubro', media: null, ex: true,
      texto: 'Tem ouro parado na gaveta? Anéis que já não usa, fios partidos, alianças antigas. Traga-os a uma loja Forevergold: avaliamos cada peça pelo peso e pelo toque e dizemos-lhe quanto vale. A decisão é sempre sua.\n\n#forevergold #ouro #prata #gondomar #porto'
    }];
    return { v: 1, lojas: lojas, pecas: pecas, chat: chat, cot: cot, lucro: lucro, pub: pub, pins: {}, seen: seen };
  }
  function normaliza(d) {
    var s = seed();
    if (!d || typeof d !== 'object' || d.v !== 1) return s;
    ['lojas', 'cot', 'lucro', 'pins', 'seen'].forEach(function (k) { if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = k === 'lojas' ? s.lojas : {}; });
    ['pecas', 'chat', 'pub'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    LOJAS_BASE.forEach(function (l) { if (!d.lojas[l.id]) d.lojas[l.id] = Object.assign({}, l); });
    Object.keys(d.lucro).forEach(function (y) { var Y = d.lucro[y]; if (!Y || typeof Y !== 'object') { delete d.lucro[y]; return; } Object.keys(Y).forEach(function (l) { var L = Y[l] || {}; Object.keys(L).forEach(function (m) { if (!L[m] || L[m].ex || !emJogo(+y, +m)) delete L[m]; }); }); });
    Object.keys(d.cot).forEach(function (k) { var e = d.cot[k]; if (!e || typeof e !== 'object') { delete d.cot[k]; return; } if (e.valor != null && e.of == null) { e.of = e.valor; delete e.valor; } if (e.ex && e.of != null && e.ou == null && e.pf == null) { e.ou = Math.round(e.of * 91.5) / 100; e.pf = 0.86; e.pu = 0.71; } });
    return d;
  }

  /* ---------- armazenamento ---------- */
  var canal = null;
  try { if ('BroadcastChannel' in window) canal = new BroadcastChannel('fg-app'); } catch (e) {}
  var db = {
    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) {}
      if (!raw) { var s = seed(); this.save(s, true); return s; }
      try { return normaliza(JSON.parse(raw)); } catch (e) { return seed(); }
    },
    save: function (data, silencio) {
      localStorage.setItem(KEY, JSON.stringify(data)); // lança erro se o espaço acabar: a app trata
      if (!silencio && canal) { try { canal.postMessage({ t: 'sync', at: Date.now() }); } catch (e) {} }
    },
    subscribe: function (cb) {
      var onMsg = function () { cb(); };
      var onStorage = function (e) { if (e.key === KEY) cb(); };
      if (canal) canal.addEventListener('message', onMsg);
      window.addEventListener('storage', onStorage);
      return function () { if (canal) canal.removeEventListener('message', onMsg); window.removeEventListener('storage', onStorage); };
    }
  };
  var sessao = {
    get: function () { try { return localStorage.getItem(SKEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(SKEY, v); } catch (e) {} },
    del: function () { try { localStorage.removeItem(SKEY); } catch (e) {} }
  };
  var bloqueio = {
    all: function () { try { return JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch (e) { return {}; } },
    get: function (id) { return this.all()[id] || { fails: 0, until: 0 }; },
    set: function (id, v) { var a = this.all(); a[id] = v; try { localStorage.setItem(LKEY, JSON.stringify(a)); } catch (e) {} }
  };

  /* ---------- fotos e vídeos (IndexedDB) ---------- */
  var media = {
    _db: null,
    open: function () {
      if (this._db) return this._db;
      this._db = new Promise(function (res, rej) {
        if (!window.indexedDB) { rej(new Error('Este navegador não guarda ficheiros.')); return; }
        var r = indexedDB.open('fg-media', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('m'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
      var self = this; this._db.catch(function () { self._db = null; });
      return this._db;
    },
    _tx: function (modo, fn) {
      return this.open().then(function (d) {
        return new Promise(function (res, rej) {
          var tx = d.transaction('m', modo), st = tx.objectStore('m'), out = fn(st);
          tx.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
          tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error('Sem espaço.')); };
        });
      });
    },
    put: function (id, blob) { return this._tx('readwrite', function (s) { s.put(blob, id); }).then(function () { return id; }); },
    get: function (id) { return this._tx('readonly', function (s) { return s.get(id); }); },
    del: function (id) { return this._tx('readwrite', function (s) { s.delete(id); }); }
  };
  function comprimeImagem(file, max) {
    max = max || 1400;
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) { rej(new Error('Esse ficheiro não é uma fotografia.')); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        var x = c.getContext('2d'); x.fillStyle = '#0B1411'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Não consegui preparar a fotografia.')); }, 'image/jpeg', 0.84);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Não consegui abrir esta fotografia. Experimente JPG ou PNG.')); };
      im.src = url;
    });
  }

  /* ---------- códigos ---------- */
  function sal() { var a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function hashPin(pin, salt) {
    var txt = 'fg|' + salt + '|' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) { return 's:' + Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); });
    }
    var h = 2166136261; for (var r = 0; r < 2000; r++) for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; }
    return Promise.resolve('f:' + h.toString(16));
  }

  window.FGCore = {
    INICIO: INICIO, emJogo: emJogo, CONTAS: CONTAS, LOJAS_ORDEM: LOJAS_ORDEM, CATS: CATS, MATERIAIS: MATERIAIS, ESTADOS: ESTADOS,
    MESES: MESES, MESES_C: MESES_C, DIAS_C: DIAS_C, DIAS_L: DIAS_L,
    db: db, sessao: sessao, bloqueio: bloqueio, media: media,
    seed: seed, comprimeImagem: comprimeImagem, sal: sal, hashPin: hashPin,
    pad: pad, ymd: ymd, parseYmd: parseYmd, weeksOfMonth: weeksOfMonth, digitos: digitos, parseNum: parseNum,
    euro: euro, numero: numero, fmtTel: fmtTel, telHref: telHref, waHref: waHref, mapHref: mapHref, uid: uid, hora: hora, quando: quando
  };
})();
