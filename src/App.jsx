import React from 'react';
import Template from './ui/Template.jsx';

export default class App extends React.Component {
  state = {
    ready: false, rev: 0, vw: 1200, vh: 900, now: Date.now(),
    screen: 'login', accIdx: 1, pin: '', stage: 'enter', first: '', pinMsg: '', lockUntil: 0, changing: false,
    user: null, tab: 'inicio', loja: null, cat: 'todas', equipa: null, sheet: null, peca: null, form: null, formErr: '', busy: false, inboxSnap: null,
    chatTxt: '', chatUrg: false, cotD: null, cotIn: { of: '', ou: '', pf: '', pu: '' }, cotSerie: 'of', cotNota: '', cotEdit: false, cotErr: '',
    lucroTxt: '', lucroEdit: false, lucroErr: '', lucroVer: null, regras: false,
    banner: null, toast: '', confirm: null, laserTxt: 'Para sempre', copied: '',
    perm: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  };

  /* ---------- ciclo de vida ---------- */
  componentDidMount() {
    this._dust = []; this.urls = {}; this.pend = {};
    this.reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.onResize = () => this.setState({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', this.onResize);
    this.boot();
  }
  componentWillUnmount() {
    clearTimeout(this._bt); clearInterval(this._tick); clearTimeout(this._toastT); clearTimeout(this._banT); clearTimeout(this._copT);
    cancelAnimationFrame(this._raf); cancelAnimationFrame(this._braf);
    window.removeEventListener('resize', this.onResize);
    if (this.unsub) this.unsub();
    Object.values(this.urls || {}).forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
  }
  componentDidUpdate(pp, ps) {
    this.fx();
    const st = this.state;
    if (st.screen === 'app' && st.tab === 'chat' && this.data) {
      const n = this.data.chat.length;
      if (ps.tab !== 'chat' || this._chatN !== n) {
        this._chatN = n;
        const sc = document.querySelector('[data-chat-scroll]');
        if (sc) sc.scrollTop = sc.scrollHeight;
      }
    }
  }
  boot() {
    if (!window.FGCore || !window.FG_LOGO || !window.FG_GLIFOS) { this._bt = setTimeout(() => this.boot(), 50); return; }
    const C = this.C = window.FGCore;
    this.data = C.db.load();
    this.lastNotif = Date.now();
    this.unsub = C.db.subscribe(() => this.sync());
    this._tick = setInterval(() => this.tick(), 1000);
    const s = C.sessao.get(), acc = C.CONTAS.find((a) => a.id === s);
    const up = { ready: true, vw: window.innerWidth, vh: window.innerHeight, now: Date.now() };
    if (acc) Object.assign(up, { screen: 'app', user: acc.id, accIdx: C.CONTAS.indexOf(acc) });
    this.setState(up, () => { if (!acc) this.setAcc(1); this.fx(); this.clock(); });
  }
  tick() {
    const n = Date.now(), st = this.state, up = {};
    if (st.lockUntil && st.lockUntil <= n) { up.lockUntil = 0; up.pinMsg = ''; }
    if (st.lockUntil > n || n - st.now >= 20000 || up.lockUntil === 0) up.now = n;
    if (Object.keys(up).length) this.setState(up);
    this.clock();
  }
  clock() {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    document.querySelectorAll('[data-hand]').forEach((el) => {
      const k = el.getAttribute('data-hand'), a = k === 'h' ? h * 30 : k === 'm' ? m * 6 : s * 6;
      el.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' 100 100)');
    });
    document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = d.toLocaleTimeString('pt-PT'); });
  }

  /* ---------- dados ---------- */
  commit(fn) {
    const snap = JSON.stringify(this.data);
    try { fn(this.data); this.C.db.save(this.data); }
    catch (e) {
      this.data = JSON.parse(snap);
      this.toastMsg('Não foi possível guardar: o espaço da app neste telemóvel está cheio. Apague fotografias ou vídeos antigos.');
      this.setState((s) => ({ rev: s.rev + 1 }));
      return false;
    }
    this.setState((s) => ({ rev: s.rev + 1 }));
    return true;
  }
  sync() {
    this.data = this.C.db.load();
    const me = this.me();
    if (this.state.screen === 'app' && this.staff(me)) {
      const novos = this.feed(me.id).filter((i) => i.at > this.lastNotif);
      if (novos.length) {
        this.lastNotif = Math.max.apply(null, novos.map((i) => i.at));
        this.showBanner(novos[0]);
        this.notifySys(novos[0]);
      }
      if (this.state.tab === 'chat') this.markSeen('chat');
    }
    this.setState((s) => ({ rev: s.rev + 1 }));
  }
  me() { return (this.C && this.C.CONTAS.find((a) => a.id === this.state.user)) || null; }
  staff(a) { return !!a && a.tipo !== 'cliente'; }
  nome(id) { const a = this.C.CONTAS.find((x) => x.id === id); return a ? a.nome : id; }
  ownerOf(lojaId) { const a = this.me(); return !!a && a.tipo === 'loja' && a.loja === lojaId; }
  url(id) {
    if (!id) return '';
    if (this.urls[id]) return this.urls[id];
    if (!this.pend[id]) {
      this.pend[id] = 1;
      this.C.media.get(id).then((b) => { if (b) { this.urls[id] = URL.createObjectURL(b); this.forceUpdate(); } }).catch(() => {});
    }
    return '';
  }
  feed(meId) {
    const C = this.C, d = this.data, out = [];
    d.chat.forEach((m) => out.push({ k: m.urg ? 'urg' : 'chat', at: m.at, by: m.by, kind: m.urg ? 'Aviso urgente · ' + this.nome(m.by) : 'Chat · ' + this.nome(m.by), body: m.txt }));
    Object.keys(d.cot).forEach((k) => {
      const c = d.cot[k], dt = C.parseYmd(k);
      out.push({ k: 'cot', at: c.at, by: c.by, ref: k, kind: 'Cotação diária', body: C.pad(dt.getDate()) + '/' + C.pad(dt.getMonth() + 1) + ': ' + this.cotResumo(c) + ' · ' + this.nome(c.by) + (c.nota ? '. ' + c.nota : '') });
    });
    d.pub.forEach((p) => out.push({ k: 'pub', at: p.at, by: p.by, kind: 'Publicidade', body: 'Nova publicação: ' + (p.titulo || 'sem título') }));
    Object.keys(d.lucro).forEach((y) => Object.keys(d.lucro[y]).forEach((l) => Object.keys(d.lucro[y][l]).forEach((m) => {
      const e = d.lucro[y][l][m];
      if (e && e.at) out.push({ k: 'lucro', at: e.at, by: e.by, kind: 'Lucro do mês', body: (d.lojas[l] ? d.lojas[l].nome : l) + ' registou o lucro de ' + C.MESES[m - 1] + '.' });
    })));
    return out.filter((i) => i.by !== meId).sort((a, b) => b.at - a.at);
  }
  unread(meId) {
    const d = this.data, s = d.seen[meId] || {}, o = (x) => x.by !== meId;
    const n = new Date(this.state.now), mes0 = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    const chat = d.chat.filter((m) => o(m) && m.at > (s.chat || 0)).length;
    const cot = Object.values(d.cot).filter((c) => o(c) && c.at > (s.cot || 0)).length;
    const pub = d.pub.filter((p) => o(p) && p.at > (s.pub || 0)).length;
    let lucro = 0;
    Object.values(d.lucro).forEach((Y) => Object.values(Y).forEach((L) => Object.values(L).forEach((e) => { if (e && o(e) && e.at > Math.max(s.lucro || 0, mes0)) lucro++; })));
    return { chat, cot, pub, lucro };
  }
  markSeen(k) {
    const me = this.state.user; if (!me || !this.staff(this.me())) return;
    const u = this.unread(me), kinds = k === 'all' ? ['chat', 'cot', 'pub', 'lucro'] : [k];
    if (!kinds.some((x) => u[x] > 0)) return;
    const t = Date.now();
    this.commit((d) => { const s = Object.assign({}, d.seen[me]); kinds.forEach((x) => { s[x] = t; }); d.seen[me] = s; });
  }
  standings(y) {
    const C = this.C, d = this.data, L = d.lucro[y] || {};
    const pubs = d.pub.filter((p) => new Date(p.at).getFullYear() === Number(y));
    return C.LOJAS_ORDEM.map((id) => {
      let lp = 0, bonus = 0; const meses = {};
      for (let m = 1; m <= 12; m++) {
        const jogo = C.emJogo(+y, m), e = jogo && L[id] && L[id][m], v = e ? e.valor : null;
        const pm = jogo ? pubs.filter((p) => new Date(p.at).getMonth() + 1 === m) : [];
        const sh = pm.filter((p) => p.partilhas && p.partilhas[id]).length;
        const b = pm.length > 0 && sh === pm.length ? 1 : 0;
        if (v != null) lp += v / 1000;
        bonus += b;
        meses[m] = { v, b, sh, total: pm.length };
      }
      return { id, nome: d.lojas[id].nome, lp, bonus, pts: lp + bonus, meses };
    }).sort((a, b) => b.pts - a.pts);
  }
  winners(y, std) {
    const n = new Date(this.state.now), cy = n.getFullYear(), cm = n.getMonth() + 1, S = std || this.standings(y);
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1, st = !this.C.emJogo(+y, m) ? 'fora' : +y < cy || (+y === cy && m < cm) ? 'fechado' : +y === cy && m === cm ? 'jogo' : 'futuro';
      const sc = S.map((s) => ({ id: s.id, nome: s.nome, pts: (s.meses[m].v || 0) / 1000 + s.meses[m].b }));
      const max = Math.max.apply(null, sc.map((s) => s.pts));
      const top = max > 0 ? sc.filter((s) => Math.abs(s.pts - max) < 1e-9) : [];
      return { m, st, ids: top.map((s) => s.id), nomes: top.map((s) => s.nome), pts: max };
    });
  }
  lucroPendente(a) {
    if (!a || a.tipo !== 'loja') return false;
    const n = new Date(this.state.now), L = this.data.lucro[n.getFullYear()];
    return !(L && L[a.loja] && L[a.loja][n.getMonth() + 1]);
  }

  /* ---------- avisos ---------- */
  toastMsg(t) { this.setState({ toast: t }); clearTimeout(this._toastT); this._toastT = setTimeout(() => this.setState({ toast: '' }), 3400); }
  showBanner(i) {
    this.setState({ banner: i }); clearTimeout(this._banT);
    this._banT = setTimeout(() => this.setState({ banner: null }), 5200);
    try { if (navigator.vibrate) navigator.vibrate(i.k === 'urg' ? [40, 60, 40] : 20); } catch (e) {}
  }
  notifySys(i) {
    try {
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(i.k === 'cot' ? 'Cotação diária' : i.kind, { body: i.body, tag: 'fg-' + i.k });
      }
    } catch (e) {}
  }
  navTo(k) {
    if (k === 'chat' || k === 'urg') this.go('chat');
    else if (k === 'cot') this.openEquipa('cot');
    else if (k === 'pub') this.openEquipa('pub');
    else if (k === 'lucro') this.openEquipa('lucro');
  }
  ask(cfg) { this.setState({ confirm: cfg }); }
  closeSheet() {
    if (this._closing) return;
    const p = document.querySelector('[data-sheet-panel]'), b = document.querySelector('[data-sheet-bg]');
    const done = () => { this._closing = false; this.setState({ sheet: null, form: null, formErr: '', busy: false }); };
    if (!p || !p.animate || this.reduz) { done(); return; }
    this._closing = true;
    p.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], { duration: 300, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    if (b) b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    setTimeout(done, 290);
  }
  async copy(txt, key) {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(txt); ok = true; } } catch (e) {}
    if (!ok) {
      try {
        const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch (e) {}
    }
    if (ok) { this.setState({ copied: key }); clearTimeout(this._copT); this._copT = setTimeout(() => this.setState({ copied: '' }), 2400); }
    else this.toastMsg('Não foi possível copiar. Carregue no texto sem largar e escolha Copiar.');
  }

  /* ---------- entrada ---------- */
  setAcc(i) {
    const C = this.C, n = C.CONTAS.length, idx = ((i % n) + n) % n, a = C.CONTAS[idx], b = C.bloqueio.get(a.id);
    this.setState({ accIdx: idx, pin: '', first: '', pinMsg: '', stage: this.data.pins[a.id] ? 'enter' : 'new', lockUntil: b.until > Date.now() ? b.until : 0, changing: false }, () => {
      const el = document.querySelector('[data-acc-name]');
      if (el && el.animate && !this.reduz) el.animate([{ opacity: 0, transform: 'translateY(12px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.2,.8,.1,1)' });
    });
  }
  keyPress(d) {
    const st = this.state;
    if (st.lockUntil > Date.now() || this._checking) return;
    if (d === 'del') { this.setState({ pin: st.pin.slice(0, -1), pinMsg: '' }); return; }
    if (st.pin.length >= 4) return;
    const pin = st.pin + d;
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
    this.setState({ pin, pinMsg: '' });
    if (pin.length === 4) { this._checking = true; setTimeout(() => this.submitPin(pin), 170); }
  }
  shake() {
    const el = document.querySelector('[data-dots]');
    if (el && el.animate) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-11px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 440, easing: 'ease-out' });
    try { if (navigator.vibrate) navigator.vibrate([30, 40, 30]); } catch (e) {}
  }
  async submitPin(pin) {
    const C = this.C, st = this.state, a = C.CONTAS[st.accIdx];
    try {
      if (st.stage === 'enter') {
        const rec = this.data.pins[a.id], h = rec ? await C.hashPin(pin, rec.salt) : null;
        if (rec && h === rec.hash) {
          C.bloqueio.set(a.id, { fails: 0, until: 0 });
          if (st.changing) { this.setState({ stage: 'new', pin: '', pinMsg: '' }); return; }
          this.loginOk(a.id); return;
        }
        const b = C.bloqueio.get(a.id); b.fails = (b.fails || 0) + 1;
        let msg = 'Código errado. ' + (5 - b.fails === 1 ? 'Resta 1 tentativa.' : 'Restam ' + (5 - b.fails) + ' tentativas.');
        if (b.fails >= 5) { b.until = Date.now() + 30000; b.fails = 0; msg = ''; }
        C.bloqueio.set(a.id, b); this.shake();
        this.setState({ pin: '', pinMsg: msg, lockUntil: b.until > Date.now() ? b.until : 0, now: Date.now() });
      } else if (st.stage === 'new') {
        this.setState({ stage: 'confirm', first: pin, pin: '' });
      } else {
        if (pin !== st.first) { this.shake(); this.setState({ stage: 'new', first: '', pin: '', pinMsg: 'Os dois códigos não são iguais. Escolha outra vez.' }); return; }
        const salt = C.sal(), hash = await C.hashPin(pin, salt);
        if (!this.commit((d) => { d.pins[a.id] = { salt, hash, at: Date.now() }; })) { this.setState({ pin: '' }); return; }
        this.toastMsg(st.changing ? 'Código alterado.' : 'Código guardado. Use-o sempre que entrar.');
        this.loginOk(a.id);
      }
    } finally { this._checking = false; }
  }
  loginOk(id) {
    this.C.sessao.set(id); this.lastNotif = Date.now();
    this.setState({ screen: 'app', user: id, tab: 'inicio', loja: null, equipa: null, sheet: null, pin: '', first: '', pinMsg: '', changing: false, banner: null, cotD: null, lucroVer: null });
  }
  logout() { this.C.sessao.del(); this.setState({ screen: 'login', user: null, sheet: null, banner: null }, () => this.setAcc(this.state.accIdx)); }
  startChange() {
    const idx = this.C.CONTAS.findIndex((a) => a.id === this.state.user);
    this.setState({ screen: 'login', sheet: null, accIdx: idx, stage: 'enter', pin: '', first: '', pinMsg: '', changing: true, lockUntil: 0 });
  }
  cancelChange() { this.setState({ screen: 'app', changing: false, pin: '', first: '', pinMsg: '' }); }
  forgot() {
    const C = this.C, a = C.CONTAS[this.state.accIdx];
    this.ask({ title: 'Repor o código de ' + a.nome + '?', body: 'O código atual deixa de funcionar e escolhe um novo a seguir. Faça isto apenas no seu próprio telemóvel.', okTxt: 'Repor código', danger: true, ok: () => {
      this.commit((d) => { delete d.pins[a.id]; }); C.bloqueio.set(a.id, { fails: 0, until: 0 });
      this.setState({ stage: 'new', pin: '', first: '', pinMsg: '', lockUntil: 0 });
    } });
  }

  /* ---------- navegação ---------- */
  go(tab) {
    if ((tab === 'chat' || tab === 'equipa') && !this.staff(this.me())) return;
    this.setState({ tab, loja: null, equipa: null, cat: 'todas' }, () => { if (tab === 'chat') this.markSeen('chat'); });
  }
  openEquipa(k) {
    if (!this.staff(this.me())) return;
    this.setState({ tab: 'equipa', equipa: k, loja: null, cotEdit: false, cotErr: '', lucroErr: '' }, () => this.markSeen(k));
  }
  openLoja(id) { this.setState({ tab: 'lojas', loja: id, cat: 'todas', equipa: null }); }
  goSection(id) {
    const sc = document.querySelector('[data-scroll]'), el = sc && sc.querySelector('[data-sec="' + id + '"]');
    if (el) sc.scrollTo({ top: el.offsetTop - 70, behavior: this.reduz ? 'auto' : 'smooth' });
  }

  /* ---------- peças ---------- */
  openPeca(id) { this.setState({ sheet: 'peca', peca: id }); }
  setF(k, v) { this.setState((s) => (s.form ? { form: Object.assign({}, s.form, { [k]: v }), formErr: '' } : null)); }
  openPecaForm(id) {
    const C = this.C, a = this.me(), p = id ? this.data.pecas.find((x) => x.id === id) : null, lojaId = p ? p.loja : a && a.loja;
    if (!this.ownerOf(lojaId)) return;
    const form = p
      ? { id: p.id, loja: p.loja, titulo: p.titulo, preco: p.preco == null ? '' : String(p.preco).replace('.', ','), consulta: p.preco == null, cat: p.cat, mat: p.mat || C.MATERIAIS[0], peso: p.peso == null ? '' : String(p.peso).replace('.', ','), estado: p.estado, fotos: (p.fotos || []).map((f) => ({ id: f, url: this.url(f), novo: false })), rm: [] }
      : { id: null, loja: lojaId, titulo: '', preco: '', consulta: false, cat: 'aneis', mat: C.MATERIAIS[0], peso: '', estado: 'disponivel', fotos: [], rm: [] };
    this.setState({ sheet: 'pecaForm', form, formErr: '', busy: false });
  }
  async pickFotos(e) {
    const files = Array.from((e.target && e.target.files) || []); if (e.target) e.target.value = '';
    const f = this.state.form; if (!f || !files.length) return;
    const livres = 6 - f.fotos.length;
    if (livres <= 0) { this.setState({ formErr: 'Cada peça pode ter até 6 fotografias.' }); return; }
    this.setState({ busy: true });
    const novas = []; let erro = '';
    for (const file of files.slice(0, livres)) {
      try { const b = await this.C.comprimeImagem(file); novas.push({ id: this.C.uid('m'), url: URL.createObjectURL(b), blob: b, novo: true }); }
      catch (err) { erro = err.message; }
    }
    this.setState((s) => ({ busy: false, form: s.form ? Object.assign({}, s.form, { fotos: s.form.fotos.concat(novas) }) : s.form, formErr: erro || (files.length > livres ? 'Entraram só ' + livres + ' fotografias: o máximo são 6.' : '') }));
  }
  rmFoto(i) {
    this.setState((s) => { const f = s.form, x = f.fotos[i]; return { form: Object.assign({}, f, { fotos: f.fotos.filter((_, j) => j !== i), rm: x && !x.novo ? f.rm.concat(x.id) : f.rm }) }; });
  }
  async savePeca() {
    const C = this.C, f = this.state.form; if (!f || this.state.busy) return;
    const titulo = f.titulo.trim(), preco = f.consulta ? null : C.parseNum(f.preco), peso = String(f.peso).trim() ? C.parseNum(f.peso) : null;
    if (titulo.length < 2) { this.setState({ formErr: 'Escreva o título da peça.' }); return; }
    if (!f.consulta && (preco == null || isNaN(preco) || preco <= 0 || preco > 1e6)) { this.setState({ formErr: 'Indique um preço válido ou escolha «Preço sob consulta».' }); return; }
    if (peso != null && (isNaN(peso) || peso <= 0 || peso > 5000)) { this.setState({ formErr: 'O peso tem de ser em gramas, por exemplo 4,8.' }); return; }
    if (!this.ownerOf(f.loja)) return;
    this.setState({ busy: true });
    try { for (const x of f.fotos) if (x.novo) { await C.media.put(x.id, x.blob); this.urls[x.id] = x.url; } }
    catch (e) { this.setState({ busy: false, formErr: 'Não foi possível guardar as fotografias neste telemóvel. Pode estar sem espaço.' }); return; }
    const rec = { titulo, preco: preco == null ? null : Math.round(preco * 100) / 100, cat: f.cat, mat: f.mat, peso: peso == null ? null : Math.round(peso * 100) / 100, estado: f.estado, fotos: f.fotos.map((x) => x.id) };
    const ok = this.commit((d) => {
      if (f.id) { const p = d.pecas.find((x) => x.id === f.id); if (p) Object.assign(p, rec, { ex: false, upd: Date.now() }); }
      else d.pecas.unshift(Object.assign({ id: C.uid('p'), loja: f.loja, at: Date.now() }, rec));
    });
    if (!ok) { this.setState({ busy: false }); return; }
    f.rm.forEach((id) => C.media.del(id).catch(() => {}));
    this.closeSheet();
    this.toastMsg(f.id ? 'Peça atualizada.' : 'Peça publicada na sua loja.');
  }
  setEstado(id, e) {
    const p = this.data.pecas.find((x) => x.id === id); if (!p || !this.ownerOf(p.loja) || p.estado === e) return;
    this.commit((d) => { const q = d.pecas.find((x) => x.id === id); q.estado = e; q.upd = Date.now(); });
    this.toastMsg('Estado alterado para «' + this.C.ESTADOS.find((x) => x.id === e).nome + '».');
  }
  delPeca(id) {
    const p = this.data.pecas.find((x) => x.id === id); if (!p || !this.ownerOf(p.loja)) return;
    this.ask({ title: 'Apagar «' + p.titulo + '»?', body: 'A peça e as fotografias saem da loja. Não é possível desfazer.', okTxt: 'Apagar', danger: true, ok: () => {
      if (!this.commit((d) => { d.pecas = d.pecas.filter((x) => x.id !== id); })) return;
      (p.fotos || []).forEach((m) => this.C.media.del(m).catch(() => {}));
      this.closeSheet(); this.toastMsg('Peça apagada.');
    } });
  }
  openLojaForm() {
    const a = this.me(); if (!a || a.tipo !== 'loja') return;
    const L = this.data.lojas[a.loja], C = this.C;
    this.setState({ sheet: 'lojaForm', formErr: '', busy: false, form: { morada: L.morada || '', horario: L.horario || '', tel: C.fmtTel(L.tel), whats: C.fmtTel(L.whats), email: L.email || '' } });
  }
  saveLoja() {
    const a = this.me(), f = this.state.form, C = this.C; if (!a || a.tipo !== 'loja' || !f) return;
    const tel = C.digitos(f.tel), wh = C.digitos(f.whats), email = f.email.trim();
    if (f.morada.trim().length < 5) { this.setState({ formErr: 'Escreva a morada completa.' }); return; }
    if (tel.length !== 9) { this.setState({ formErr: 'O telefone tem de ter 9 algarismos.' }); return; }
    if (wh && wh.length !== 9) { this.setState({ formErr: 'O número de WhatsApp tem de ter 9 algarismos.' }); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.setState({ formErr: 'O email não parece correto.' }); return; }
    if (!this.commit((d) => { Object.assign(d.lojas[a.loja], { morada: f.morada.trim(), horario: f.horario.trim(), tel, whats: wh, email }); })) return;
    this.closeSheet(); this.toastMsg('Informações da loja guardadas.');
  }

  /* ---------- chat ---------- */
  sendChat() {
    const a = this.me(), txt = this.state.chatTxt.trim(); if (!this.staff(a) || !txt) return;
    const t = Date.now(), urg = this.state.chatUrg;
    if (!this.commit((d) => { d.chat.push({ id: this.C.uid('c'), by: a.id, at: t, txt, urg }); d.seen[a.id] = Object.assign({}, d.seen[a.id], { chat: t }); })) return;
    this.setState({ chatTxt: '', chatUrg: false });
    if (urg) this.toastMsg('Aviso urgente enviado a toda a equipa.');
  }

  /* ---------- cotação diária ---------- */
  get SER() { return [['of', 'Ouro', 'fino'], ['ou', 'Ouro', 'usado'], ['pf', 'Prata', 'fina'], ['pu', 'Prata', 'usada']]; }
  cv(e, k) { if (!e) return null; if (e[k] != null) return e[k]; return k === 'of' && e.valor != null ? e.valor : null; }
  cotResumo(e) {
    const C = this.C, o = [this.cv(e, 'of'), this.cv(e, 'ou')], p = [this.cv(e, 'pf'), this.cv(e, 'pu')], f = (x) => (x == null ? '—' : C.numero(x, 2));
    const parts = [];
    if (o[0] != null || o[1] != null) parts.push('Ouro fino ' + f(o[0]) + ' · usado ' + f(o[1]));
    if (p[0] != null || p[1] != null) parts.push('Prata fina ' + f(p[0]) + ' · usada ' + f(p[1]));
    return parts.join(' | ') + ' €/g';
  }
  cotSel(k) { this.setState({ cotD: k, cotEdit: false, cotIn: { of: '', ou: '', pf: '', pu: '' }, cotNota: '', cotErr: '' }); }
  cotMonth(delta) {
    const C = this.C, cur = C.parseYmd(this.state.cotD || C.ymd(new Date())), hoje = new Date();
    const t = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
    if (t.getFullYear() * 12 + t.getMonth() > hoje.getFullYear() * 12 + hoje.getMonth()) return;
    const isCur = t.getFullYear() === hoje.getFullYear() && t.getMonth() === hoje.getMonth();
    this.cotSel(C.ymd(isCur ? hoje : t));
  }
  publishCot() {
    const C = this.C, a = this.me(), st = this.state; if (!this.staff(a)) return;
    const k = st.cotD || C.ymd(new Date()); if (k > C.ymd(new Date())) return;
    const nota = st.cotNota.trim().slice(0, 500), rec = {};
    for (const s of this.SER) {
      const raw = String(st.cotIn[s[0]] || '').trim();
      if (!raw) { rec[s[0]] = null; continue; }
      const v = C.parseNum(raw);
      if (v == null || isNaN(v) || v <= 0 || v >= 1000) { this.setState({ cotErr: s[1] + ' ' + s[2] + ': escreva o preço por grama, por exemplo 63,40.' }); return; }
      rec[s[0]] = Math.round(v * 100) / 100;
    }
    if (this.SER.every((s) => rec[s[0]] == null)) { this.setState({ cotErr: 'Escreva pelo menos um preço: ouro ou prata, fino ou usado.' }); return; }
    const had = !!this.data.cot[k];
    if (!this.commit((d) => { d.cot[k] = Object.assign(rec, { nota, by: a.id, at: Date.now(), edit: had }); d.seen[a.id] = Object.assign({}, d.seen[a.id], { cot: Date.now() }); })) return;
    this.setState({ cotEdit: false, cotIn: { of: '', ou: '', pf: '', pu: '' }, cotNota: '', cotErr: '' });
    this.burst(document.querySelector('[data-cot-hero]'));
    this.toastMsg(had ? 'Cotação corrigida. A equipa foi avisada.' : 'Cotação diária publicada. A equipa recebeu a notificação.');
  }

  /* ---------- lucro do mês ---------- */
  registarLucro() {
    const a = this.me(), C = this.C; if (!a || a.tipo !== 'loja') return;
    const v = C.parseNum(this.state.lucroTxt);
    if (v == null || isNaN(v) || v < 0 || v > 5e6) { this.setState({ lucroErr: 'Escreva o valor em euros, por exemplo 12 450 ou 12450,50.' }); return; }
    const n = new Date(), y = n.getFullYear(), m = n.getMonth() + 1, mes = C.MESES[m - 1], val = Math.round(v * 100) / 100;
    this.ask({ title: 'Registar ' + C.euro(val) + ' em ' + mes + '?', body: 'Vale ' + C.numero(val / 1000, 1) + ' pontos para ' + a.nome + '. Pode corrigir este valor até ao último dia de ' + mes + '.', okTxt: 'Registar', ok: () => {
      this.burst(document.querySelector('[data-lucro-btn]'));
      if (!this.commit((d) => { d.lucro[y] = d.lucro[y] || {}; d.lucro[y][a.loja] = d.lucro[y][a.loja] || {}; d.lucro[y][a.loja][m] = { valor: val, at: Date.now(), by: a.id }; })) return;
      this.setState({ lucroTxt: '', lucroEdit: false, lucroErr: '', lucroVer: a.loja });
      this.toastMsg('Lucro de ' + mes + ' registado: ' + C.numero(val / 1000, 1) + ' pontos.');
    } });
  }

  /* ---------- publicidade ---------- */
  openPubForm(id) {
    const a = this.me(); if (!a || !a.pub) return;
    const p = id ? this.data.pub.find((x) => x.id === id) : null;
    this.setState({ sheet: 'pubForm', formErr: '', busy: false, form: p
      ? { id: p.id, titulo: p.titulo || '', texto: p.texto || '', media: p.media ? Object.assign({}, p.media, { url: this.url(p.media.id), novo: false }) : null, rm: [] }
      : { id: null, titulo: '', texto: '', media: null, rm: [] } });
  }
  async pickMedia(e) {
    const file = e.target && e.target.files && e.target.files[0]; if (e.target) e.target.value = ''; if (!file) return;
    const isVid = /^video\//.test(file.type), isImg = /^image\//.test(file.type);
    if (!isVid && !isImg) { this.setState({ formErr: 'Escolha uma imagem ou um vídeo.' }); return; }
    if (isVid && file.size > 80 * 1048576) { this.setState({ formErr: 'O vídeo tem mais de 80 MB. Escolha um vídeo mais curto.' }); return; }
    this.setState({ busy: true, formErr: '' });
    let blob = file;
    try { if (isImg && file.size > 12 * 1048576) blob = await this.C.comprimeImagem(file, 2600); }
    catch (err) { this.setState({ busy: false, formErr: err.message }); return; }
    this.setState((s) => {
      const f = s.form; if (!f) return { busy: false };
      const old = f.media;
      return { busy: false, form: Object.assign({}, f, { media: { id: this.C.uid('m'), tipo: isVid ? 'video' : 'imagem', nome: file.name || (isVid ? 'video.mp4' : 'imagem.jpg'), blob, url: URL.createObjectURL(blob), novo: true }, rm: old && !old.novo ? f.rm.concat(old.id) : f.rm }) };
    });
  }
  rmMedia() { this.setState((s) => { const f = s.form, old = f.media; return { form: Object.assign({}, f, { media: null, rm: old && !old.novo ? f.rm.concat(old.id) : f.rm }) }; }); }
  async savePub() {
    const C = this.C, a = this.me(), f = this.state.form; if (!a || !a.pub || !f || this.state.busy) return;
    const titulo = f.titulo.trim(), texto = f.texto.trim();
    if (titulo.length < 2) { this.setState({ formErr: 'Dê um título à publicação.' }); return; }
    if (!texto && !f.media) { this.setState({ formErr: 'Junte uma imagem, um vídeo ou o texto para copiar.' }); return; }
    this.setState({ busy: true });
    if (f.media && f.media.novo) {
      try { await C.media.put(f.media.id, f.media.blob); this.urls[f.media.id] = f.media.url; }
      catch (e) { this.setState({ busy: false, formErr: 'Não foi possível guardar o ficheiro neste telemóvel. Pode estar sem espaço.' }); return; }
    }
    const media = f.media ? { id: f.media.id, tipo: f.media.tipo, nome: f.media.nome } : null;
    const ok = this.commit((d) => {
      if (f.id) { const p = d.pub.find((x) => x.id === f.id); if (p) Object.assign(p, { titulo, texto, media, ex: false, upd: Date.now() }); }
      else d.pub.unshift({ id: C.uid('u'), by: a.id, at: Date.now(), titulo, texto, media, partilhas: {} });
    });
    if (!ok) { this.setState({ busy: false }); return; }
    f.rm.forEach((id) => C.media.del(id).catch(() => {}));
    this.closeSheet();
    this.toastMsg(f.id ? 'Publicação atualizada.' : 'Publicação enviada. A equipa recebeu a notificação.');
  }
  delPub(id) {
    const a = this.me(), p = this.data.pub.find((x) => x.id === id); if (!a || !a.pub || !p) return;
    this.ask({ title: 'Apagar «' + (p.titulo || 'publicação') + '»?', body: 'Sai da secção Publicidade para toda a equipa. Os vistos de partilha desta publicação também se perdem.', okTxt: 'Apagar', danger: true, ok: () => {
      if (!this.commit((d) => { d.pub = d.pub.filter((x) => x.id !== id); })) return;
      if (p.media) this.C.media.del(p.media.id).catch(() => {});
      this.toastMsg('Publicação apagada.');
    } });
  }
  toggleShare(id) {
    const a = this.me(); if (!a || a.tipo !== 'loja') return;
    const p = this.data.pub.find((x) => x.id === id); if (!p) return;
    const n = new Date(), pm = new Date(p.at), mesmo = (x) => { const t = new Date(x.at); return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth(); };
    if (!mesmo(p)) { this.toastMsg('Os vistos desse mês já fecharam.'); return; }
    const on = !(p.partilhas && p.partilhas[a.loja]), btn = document.querySelector('[data-share="' + id + '"]');
    if (!this.commit((d) => { const q = d.pub.find((x) => x.id === id); q.partilhas = Object.assign({}, q.partilhas); if (on) q.partilhas[a.loja] = Date.now(); else delete q.partilhas[a.loja]; })) return;
    if (!on) { this.toastMsg('Visto retirado.'); return; }
    const mes = this.data.pub.filter(mesmo), falta = mes.filter((x) => !(x.partilhas && x.partilhas[a.loja])).length;
    if (!falta) { this.burst(btn); this.toastMsg('Partilhou todas as publicações de ' + this.C.MESES[n.getMonth()] + ': +1 ponto no Lucro do mês.'); }
    else this.toastMsg('Visto guardado. ' + (falta === 1 ? 'Falta 1 publicação' : 'Faltam ' + falta + ' publicações') + ' para o ponto extra.');
  }
  clearEx() {
    this.ask({ title: 'Apagar os dados de exemplo?', body: 'Saem as peças, mensagens, cotações, lucros e publicações de exemplo. O que a equipa já escreveu fica.', okTxt: 'Apagar exemplos', danger: true, ok: () => {
      this.commit((d) => {
        d.pecas = d.pecas.filter((x) => !x.ex); d.chat = d.chat.filter((x) => !x.ex); d.pub = d.pub.filter((x) => !x.ex);
        Object.keys(d.cot).forEach((k) => { if (d.cot[k].ex) delete d.cot[k]; });
        Object.values(d.lucro).forEach((Y) => Object.values(Y).forEach((L) => Object.keys(L).forEach((m) => { if (L[m] && L[m].ex) delete L[m]; })));
      });
      this.setState({ sheet: null }); this.toastMsg('Dados de exemplo apagados.');
    } });
  }
  async askNotif() {
    if (!('Notification' in window)) return;
    try { const r = await Notification.requestPermission(); this.setState({ perm: r }); if (r === 'granted') this.toastMsg('Notificações ativas neste telemóvel.'); } catch (e) {}
  }

  /* ---------- motion ---------- */
  logoSvg(t) {
    const L = window.FG_LOGO, sym = L.sym.join('');
    if (t === 'word') return '<svg viewBox="0 0 ' + L.ww + ' ' + L.wh + '" style="display:block;width:100%;height:auto"><path fill="currentColor" d="' + L.word + '"/></svg>';
    if (t === 'sym') return '<svg viewBox="0 0 ' + L.symw + ' 1000" style="display:block;width:100%;height:auto"><path fill="currentColor" fill-rule="evenodd" d="' + sym + '"/></svg>';
    const id = 'fgl' + Math.random().toString(36).slice(2, 8);
    const defs = '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9C7E3F"/><stop offset=".28" stop-color="#E9D39A"/><stop offset=".5" stop-color="#B8964F"/><stop offset=".74" stop-color="#F3E3B5"/><stop offset="1" stop-color="#A6894B"/></linearGradient><linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2=".35"><stop offset=".38" stop-color="#FFF8DC" stop-opacity="0"/><stop offset=".5" stop-color="#FFF8DC" stop-opacity=".65"/><stop offset=".62" stop-color="#FFF8DC" stop-opacity="0"/>' + (this.reduz ? '' : '<animateTransform attributeName="gradientTransform" type="translate" values="-1.1 0;1.1 0;1.1 0" keyTimes="0;.55;1" dur="6.5s" begin="2.5s" repeatCount="indefinite"/>') + '</linearGradient></defs>';
    const fill = '<path class="fg-fill" fill="url(#' + id + 'g)" fill-rule="evenodd" d="' + sym + '"/><path class="fg-fill" fill="url(#' + id + 's)" fill-rule="evenodd" d="' + sym + '"/>';
    const strokes = t === 'draw' ? L.sym.map((d) => '<path class="fg-st" pathLength="1" d="' + d + '" fill="none" stroke="#EBD7A4" stroke-width="5" stroke-linejoin="round"/>').join('') : '';
    return '<svg viewBox="-20 -20 ' + (L.symw + 40) + ' 1040" style="display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 18px 36px rgba(0,0,0,.45))">' + defs + fill + strokes + '</svg>';
  }
  fx() {
    if (!this.C || !window.FG_LOGO) return;
    const G = window.FG_GLIFOS;
    document.querySelectorAll('[data-logo]').forEach((el) => {
      const t = el.getAttribute('data-logo'); if (el._fg === t) return; el._fg = t; el.innerHTML = this.logoSvg(t);
      if (t === 'draw' && !this.reduz) {
        el.querySelectorAll('.fg-st').forEach((p) => { p.style.strokeDasharray = '1'; p.animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.8 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 3000, delay: 200, easing: 'cubic-bezier(.6,.05,.2,1)', fill: 'both' }); });
        el.querySelectorAll('.fg-fill').forEach((p) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1300, delay: 2100, fill: 'both' }));
      } else if (t === 'draw') el.querySelectorAll('.fg-st').forEach((p) => { p.style.display = 'none'; });
    });
    document.querySelectorAll('[data-glyph]').forEach((el) => {
      const g = el.getAttribute('data-glyph'); if (el._fg === g) return; el._fg = g;
      el.innerHTML = '<svg viewBox="0 0 120 120" style="display:block;width:100%;height:100%;overflow:visible">' + (G[g] || G.aliancas) + '</svg>';
    });
    document.querySelectorAll('[data-a]').forEach((el) => { if (el._fgA) return; el._fgA = 1; this.animate(el); });
    document.querySelectorAll('canvas[data-dust]').forEach((c) => { if (c._fg) return; c._fg = 1; this._dust.push({ c, w: 0, h: 0, pts: [], n: +c.getAttribute('data-dust') || 30 }); });
    if (this._dust.length && !this._raf && !this.reduz) this._raf = requestAnimationFrame((t) => this.dustStep(t));
    this.counts();
    const lb = document.querySelector('[data-laser-box]');
    if (lb && !lb._fg) { lb._fg = 1; setTimeout(() => this.engrave(), 1100); }
  }
  animate(el) {
    if (!el.animate) return;
    const E = 'cubic-bezier(.2,.7,.1,1)', d = +(el.getAttribute('data-d') || 0), dur = +(el.getAttribute('data-dur') || 0), rz = this.reduz;
    const made = [], ENTRA = ['rise', 'up', 'zoom', 'line', 'grow', 'ring', 'draw'];
    const A = (k, o) => { const an = el.animate(k, o); if (an && o.iterations !== Infinity) made.push(an); return an; };
    const tipos = el.getAttribute('data-a').split(' ');
    if (tipos.some((t) => ENTRA.indexOf(t) >= 0) && 'IntersectionObserver' in window && el.closest('[data-scroll]')) {
      const r = el.getBoundingClientRect(), box = el.closest('[data-scroll]').getBoundingClientRect();
      if (r.top > box.bottom - 10) {
        setTimeout(() => {
          made.forEach((an) => { try { an.pause(); an.currentTime = 0; } catch (e) {} });
          if (!this._io) this._io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { this._io.unobserve(en.target); (en.target._fgPend || []).forEach((an) => { try { an.play(); } catch (e) {} }); en.target._fgPend = null; } }), { threshold: 0.12 });
          el._fgPend = made; this._io.observe(el);
        }, 0);
      }
    }
    tipos.forEach((t) => {
      if (rz && ['ring', 'grow', 'draw'].indexOf(t) < 0) return;
      if (t === 'fade') A([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      else if (t === 'screen') A([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: E });
      else if (t === 'rise') A([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: d, easing: E, fill: 'backwards' });
      else if (t === 'up') A([{ transform: 'translateY(112%) rotate(4deg)' }, { transform: 'none' }], { duration: 1100, delay: d, easing: E, fill: 'backwards' });
      else if (t === 'zoom') A([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 1300, delay: d, easing: E, fill: 'backwards' });
      else if (t === 'pop') A([{ opacity: 0, transform: 'scale(.86) translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.2,1.3,.4,1)' });
      else if (t === 'sheet') A([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.85,.1,1)' });
      else if (t === 'line') { el.style.transformOrigin = 'left'; A([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 1300, delay: d, easing: E, fill: 'backwards' }); }
      else if (t === 'grow') { el.style.transformOrigin = 'left'; A([{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: rz ? 1 : 1500, delay: rz ? 0 : d, easing: E, fill: 'backwards' }); }
      else if (t === 'sheen') A([{ backgroundPosition: '0% 0' }, { backgroundPosition: '-220% 0' }], { duration: 7000, iterations: Infinity, easing: 'linear' });
      else if (t === 'marquee') A([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: dur || 40000, iterations: Infinity, easing: 'linear' });
      else if (t === 'spin') A([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: dur || 20000, iterations: Infinity, easing: 'linear' });
      else if (t === 'sweep') A([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 1700, delay: d, endDelay: 3800, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
      else if (t === 'float') A([{ transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0)' }], { duration: 5200, iterations: Infinity, easing: 'ease-in-out' });
      else if (t === 'pulse') A([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' });
      else if (t === 'glow') A([{ background: '#EBD7A4', color: '#1B1608', transform: 'scale(1.22)' }, { background: '#11201A', color: '#EBD7A4', transform: 'scale(1)', offset: 0.14 }, { background: '#11201A', color: '#EBD7A4', transform: 'scale(1)' }], { duration: 12000, delay: d, iterations: Infinity, easing: 'ease-out' });
      else if (t === 'ring') {
        const r = +el.getAttribute('r'), C = 2 * Math.PI * r, v = +(el.getAttribute('data-v') || 1);
        el.style.strokeDasharray = C.toFixed(2);
        A([{ strokeDashoffset: C }, { strokeDashoffset: C * (1 - v) }], { duration: rz ? 1 : 1800, delay: rz ? 0 : d, easing: E, fill: 'both' });
      } else if (t === 'draw') {
        el.style.strokeDasharray = '1';
        A([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: rz ? 1 : 1800, delay: rz ? 0 : d, easing: 'cubic-bezier(.6,.05,.2,1)', fill: 'both' });
      }
    });
  }
  dustStep(t) {
    this._dust = this._dust.filter((s) => s.c.isConnected);
    if (!this._dust.length) { this._raf = 0; return; }
    this._raf = requestAnimationFrame((tt) => this.dustStep(tt));
    if (document.hidden) return;
    this._dust.forEach((s) => {
      const w = s.c.offsetWidth, h = s.c.offsetHeight; if (!w || !h) return;
      if (w !== s.w || h !== s.h) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        s.w = w; s.h = h; s.c.width = w * dpr; s.c.height = h * dpr; s.ctx = s.c.getContext('2d'); s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        s.pts = Array.from({ length: s.n }, () => this.mote(w, h, true));
      }
      const x = s.ctx; x.clearRect(0, 0, w, h);
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i]; p.y -= p.vy; p.x += p.vx + Math.sin(t / 2400 + p.f) * 0.1;
        if (p.y < -8) s.pts[i] = this.mote(w, h, false);
        x.globalAlpha = 0.16 + 0.5 * (0.5 + 0.5 * Math.sin((t / 900) * p.s + p.f));
        x.fillStyle = p.r > 1.6 ? '#F3E3B5' : '#C6A766';
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
      }
    });
  }
  mote(w, h, ini) { return { x: Math.random() * w, y: ini ? Math.random() * h : h + 8, r: 0.5 + Math.random() * 1.7, vy: 0.08 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.14, f: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6 }; }
  counts() {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const tgt = +el.getAttribute('data-count'), dec = +(el.getAttribute('data-dec') || 0);
      if (el._fgT === tgt) return;
      const from = el._fgV == null ? 0 : el._fgV; el._fgT = tgt;
      const t0 = performance.now(), dur = this.reduz ? 1 : 1500;
      const step = (t) => {
        if (el._fgT !== tgt) return;
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = from + (tgt - from) * e;
        el._fgV = v; el.textContent = this.C.numero(v, dec);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  burst(src) {
    if (this.reduz) return;
    const cv = document.querySelector('canvas[data-burst]'); if (!cv) return;
    const r = cv.getBoundingClientRect(), w = cv.offsetWidth, h = cv.offsetHeight, k = r.width / (w || 1), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    let ox = w / 2, oy = h / 2;
    if (src && src.getBoundingClientRect) { const s = src.getBoundingClientRect(); ox = (s.left + s.width / 2 - r.left) / k; oy = (s.top + s.height / 2 - r.top) / k; }
    const cores = ['#F3E3B5', '#E4CC92', '#C6A766', '#B4944F', '#FFF8DC'];
    const P = Array.from({ length: 96 }, () => { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6.5; return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3.2, r: 1.6 + Math.random() * 3, life: 1, rot: Math.random() * 6, c: cores[Math.floor(Math.random() * 5)], sq: Math.random() > 0.45 }; });
    cancelAnimationFrame(this._braf);
    const step = () => {
      x.clearRect(0, 0, w, h); let vivos = 0;
      P.forEach((p) => {
        if (p.life <= 0) return; vivos++;
        p.x += p.vx; p.y += p.vy; p.vy += 0.17; p.vx *= 0.985; p.life -= 0.011; p.rot += 0.2;
        x.globalAlpha = Math.max(0, p.life); x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
        if (p.sq) x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { x.beginPath(); x.arc(0, 0, p.r * 0.7, 0, 6.283); x.fill(); }
        x.restore();
      });
      if (vivos) this._braf = requestAnimationFrame(step); else x.clearRect(0, 0, w, h);
    };
    step();
  }
  engrave() {
    const t = document.querySelector('[data-laser-t]'), dot = document.querySelector('[data-laser-dot]'); if (!t || !t.animate || this.reduz) return;
    const dur = 1500 + this.state.laserTxt.length * 70;
    t.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: dur, easing: 'linear', fill: 'backwards' });
    if (dot) dot.animate([{ left: '14%', opacity: 1 }, { left: '86%', opacity: 1, offset: 0.95 }, { left: '86%', opacity: 0 }], { duration: dur, easing: 'linear', fill: 'both' });
  }

  /* ---------- modelos de vista ---------- */
  chip(label, on, click) { return { label, on, click, bg: on ? '#C6A766' : 'transparent', fg: on ? '#1B1608' : '#EEE7D7', bd: on ? '#C6A766' : 'rgba(198,167,102,.3)' }; }
  pv(p) {
    const C = this.C, cat = C.CATS.find((c) => c.id === p.cat) || C.CATS[C.CATS.length - 1], L = this.data.lojas[p.loja];
    const foto = p.fotos && p.fotos[0] ? this.url(p.fotos[0]) : '';
    const E = { disponivel: ['Disponível', '#7FD3A6', 'rgba(31,143,85,.18)'], reservada: ['Reservada', '#EBD7A4', 'rgba(198,167,102,.18)'], vendida: ['Vendida', '#B8B6A8', 'rgba(184,182,168,.14)'] }[p.estado] || ['', '#B8B6A8', 'transparent'];
    const peso = p.peso != null ? Number(p.peso).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + ' g' : '';
    return { id: p.id, titulo: p.titulo, cat: cat.nome, glyph: cat.g, foto, hasFoto: !!foto, noFoto: !foto, mat: p.mat || '', peso, hasPeso: !!peso,
      meta: [p.mat, peso].filter(Boolean).join(' · '), preco: p.preco == null ? 'Preço sob consulta' : C.euro(p.preco), precoF: p.preco == null ? '400 12px Jost,sans-serif' : '500 15px Jost,sans-serif',
      estado: E[0], estC: E[1], estBg: E[2], op: p.estado === 'vendida' ? '.5' : '1', loja: L ? L.nome : '', ex: !!p.ex, open: () => this.openPeca(p.id) };
  }
  dayLabel(t) {
    const C = this.C, d = new Date(t), h = new Date(this.state.now); h.setHours(0, 0, 0, 0);
    if (t >= h.getTime()) return 'Hoje';
    if (t >= h.getTime() - 864e5) return 'Ontem';
    return C.DIAS_L[d.getDay()] + ', ' + d.getDate() + ' de ' + C.MESES[d.getMonth()];
  }
  frame() {
    const st = this.state, framed = st.vw > 560, sc = framed ? Math.min(1, (st.vh - 28) / 844) : 1;
    const top = framed ? '54px' : 'env(safe-area-inset-top, 0px)', bot = framed ? '0px' : 'env(safe-area-inset-bottom, 0px)';
    return { framed, w: framed ? '390px' : '100vw', h: framed ? '844px' : st.vh + 'px', radius: framed ? '56px' : '0px',
      shadow: framed ? '0 0 0 10px #020403, 0 0 0 11px #2C332F, 0 50px 90px -30px rgba(0,0,0,.8)' : 'none', scale: 'scale(' + sc.toFixed(4) + ')',
      top, ctop: 'calc(' + top + ' + 66px)', cap: 'calc(' + bot + ' + 22px)', comp: 'calc(' + bot + ' + 92px)', fab: 'calc(' + bot + ' + 96px)', sheetTop: 'calc(' + top + ' + 18px)' };
  }
  renderVals() {
    const st = this.state, C = this.C, fr = this.frame();
    const base = { fr, isLogin: false, isApp: false, clockTxt: '9:41', banner: { y: '-160%', op: '0', pe: 'none', bd: 'rgba(198,167,102,.3)', kc: '#C6A766', kind: '', body: '', click: null }, toast: { y: '24px', op: '0', txt: '' }, cf: { show: false } };
    if (!st.ready || !C) return base;
    const n = new Date(st.now);
    base.clockTxt = n.getHours() + ':' + C.pad(n.getMinutes());
    const a = this.me(), staff = this.staff(a);
    base.isLogin = st.screen === 'login';
    base.isApp = st.screen === 'app' && !!a;
    if (st.banner) {
      const b = st.banner, urg = b.k === 'urg';
      base.banner = { y: '0', op: '1', pe: 'auto', bd: urg ? 'rgba(217,89,59,.8)' : 'rgba(198,167,102,.32)', kc: urg ? '#F08C70' : '#C6A766', kind: b.kind, body: b.body, click: () => { this.setState({ banner: null }); this.navTo(b.k); } };
    }
    if (st.toast) base.toast = { y: '0', op: '1', txt: st.toast };
    if (st.confirm) {
      const c = st.confirm;
      base.cf = { show: true, title: c.title, body: c.body, okTxt: c.okTxt || 'Confirmar', okBg: c.danger ? '#B4472F' : 'linear-gradient(120deg,#B4944F,#E4CC92 48%,#BC9C57)', okFg: c.danger ? '#FFF8F0' : '#1B1608', cancel: () => this.setState({ confirm: null }), ok: () => { this.setState({ confirm: null }); c.ok(); } };
    }
    if (base.isLogin) Object.assign(base, this.vmLogin());
    if (base.isApp) Object.assign(base, this.vmApp(a, staff));
    return base;
  }
  vmLogin() {
    const C = this.C, st = this.state, A = C.CONTAS, n = A.length, i = st.accIdx, a = A[i], now = Date.now();
    const curto = (x) => (x.nome === 'Santo Ovídio' ? 'Sto. Ovídio' : x.nome);
    const locked = st.lockUntil > now, hasPin = !!this.data.pins[a.id];
    let title = st.stage === 'enter' ? (st.changing ? 'Introduza o código atual' : 'Introduza o seu código') : st.stage === 'new' ? (st.changing ? 'Escolha o novo código de 4 dígitos' : 'Primeira entrada neste telemóvel: escolha um código de 4 dígitos') : 'Repita o código para confirmar';
    if (locked) title = 'Demasiadas tentativas erradas';
    const msg = locked ? 'Pode tentar outra vez daqui a ' + Math.ceil((st.lockUntil - now) / 1000) + ' s.' : st.pinMsg;
    const dots = [0, 1, 2, 3].map((k) => { const on = k < st.pin.length; return { bg: on ? 'linear-gradient(135deg,#F3E3B5,#B4944F)' : 'transparent', bd: on ? '#E4CC92' : 'rgba(198,167,102,.5)', sc: on ? 'scale(1.12)' : 'scale(1)' }; });
    const k = (num) => ({ num, txt: '', press: () => this.keyPress(num), op: locked ? '.28' : '1' });
    const t = (txt, press) => ({ num: '', txt, press: press || (() => {}), op: txt ? '1' : '0' });
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k);
    keys.push(st.changing ? t('Cancelar', () => this.cancelChange()) : st.stage === 'enter' && hasPin ? t('Esqueci', () => this.forgot()) : st.stage === 'confirm' ? t('Voltar', () => this.setState({ stage: 'new', pin: '', first: '' })) : t(''), k('0'), t('Apagar', () => this.keyPress('del')));
    return {
      acc: { nome: a.nome, user: a.tipo === 'cliente' ? 'entrada sem código' : a.id, prev: curto(A[(i - 1 + n) % n]), next: curto(A[(i + 1) % n]), pos: C.pad(i + 1) + ' / ' + C.pad(n), cliente: a.tipo === 'cliente', staff: a.tipo !== 'cliente' },
      prevAcc: () => { if (!this.state.changing) this.setAcc(i - 1); }, nextAcc: () => { if (!this.state.changing) this.setAcc(i + 1); },
      dialDown: (e) => { this._dx = e.clientX; },
      dialUp: (e) => { if (this._dx == null || this.state.changing) return; const dx = e.clientX - this._dx; this._dx = null; if (Math.abs(dx) > 36) this.setAcc(i + (dx < 0 ? 1 : -1)); },
      pinTitle: title, pinMsg: msg || '', dots, keys, enterCliente: () => this.loginOk('cliente')
    };
  }
  vmApp(a, staff) {
    const C = this.C, st = this.state, d = this.data, now = st.now, nw = new Date(now), u = staff ? this.unread(a.id) : { chat: 0, cot: 0, pub: 0, lucro: 0 };
    const total = u.chat + u.cot + u.pub + u.lucro, tk = C.ymd(nw), hoje = d.cot[tk];
    let back = null;
    if (st.tab === 'lojas' && st.loja) back = { txt: 'Lojas', go: () => this.setState({ loja: null }) };
    if (st.tab === 'equipa' && st.equipa) back = { txt: 'Equipa', go: () => this.setState({ equipa: null }) };
    const T = staff ? [['inicio', 'Início'], ['lojas', 'Lojas'], ['chat', 'Chat'], ['equipa', 'Equipa']] : [['inicio', 'Início'], ['lojas', 'Lojas']];
    const idx = Math.max(0, T.findIndex((x) => x[0] === st.tab)), pend = this.lucroPendente(a);
    const badge = { chat: u.chat, equipa: u.cot + u.pub + u.lucro + (pend ? 1 : 0) };
    const capW = T.length * 80 + 12;
    const v = {
      hdr: { back: !!back, logo: !back, backTxt: back ? back.txt : '', goBack: back ? back.go : null, staff, inboxTxt: total ? (total > 9 ? '9+' : total) + (total === 1 ? ' nova' : ' novas') : 'Avisos', dot: total ? '#D9593B' : 'rgba(198,167,102,.45)', ini: a.tipo === 'cliente' ? 'C' : a.nome.charAt(0),
        openPerfil: () => this.setState({ sheet: 'perfil' }),
        openInbox: () => { this.setState({ sheet: 'inbox', inboxSnap: Object.assign({}, d.seen[a.id]) }, () => this.markSeen('all')); } },
      tabs: T.map((x, i) => ({ label: x[1], click: () => this.go(x[0]), color: i === idx ? '#1B1608' : '#B8B6A8', badge: String(badge[x[0]] > 9 ? '9+' : badge[x[0]] || ''), hasBadge: !!badge[x[0]] })),
      capW: capW + 'px', capML: -(capW / 2) + 'px', indL: 'calc(6px + ' + idx + ' * ((100% - 12px) / ' + T.length + '))', indW: 'calc((100% - 12px) / ' + T.length + ')',
      tInicio: st.tab === 'inicio', tLojas: st.tab === 'lojas', tChat: st.tab === 'chat' && staff, tEquipa: st.tab === 'equipa' && staff,
      sheetOpen: !!st.sheet, closeSheet: () => this.closeSheet()
    };
    if (v.tInicio) {
      v.destaques = d.pecas.filter((p) => p.estado === 'disponivel').slice(0, 8).map((p) => this.pv(p));
      v.ini = { staff, cotTxt: hoje ? (this.cv(hoje, 'of') != null ? C.euro(this.cv(hoje, 'of')) : C.euro(this.cv(hoje, 'ou') ?? this.cv(hoje, 'pf') ?? this.cv(hoje, 'pu'))) : 'Por escrever', cotSub: hoje ? (this.cv(hoje, 'of') != null ? 'ouro fino' : 'por grama') + (this.cv(hoje, 'pf') != null ? ' · prata fina ' + C.euro(this.cv(hoje, 'pf')) : '') + ' · ' + this.nome(hoje.by) + ', ' + C.hora(hoje.at) : 'Ainda ninguém escreveu a de hoje', goCot: () => this.openEquipa('cot'),
        chatTxt: u.chat ? (u.chat === 1 ? '1 mensagem nova' : u.chat + ' mensagens novas') : 'Tudo lido', goChat: () => this.go('chat'), chatC: u.chat ? '#F08C70' : '#B8B6A8' };
      v.goLojas = () => this.go('lojas'); v.goCompra = () => this.goSection('compra');
      v.waGeral = C.waHref('932656581', 'Olá, Forevergold! Tenho peças de ouro/prata para vender e gostava de saber mais.');
      v.infoTel = C.telHref('917603882'); v.waInfo = C.waHref('932656581', 'Olá, Forevergold!');
      v.laserTxt = st.laserTxt; v.laserShown = st.laserTxt.trim() || 'Forevergold';
      v.onLaser = (e) => this.setState({ laserTxt: e.target.value.slice(0, 22) }); v.engrave = () => this.engrave();
      v.ticks = Array.from({ length: 12 }, (_, i) => ({ t: 'rotate(' + i * 30 + ' 100 100)', y2: i % 3 === 0 ? '34' : '28', w: i % 3 === 0 ? '3' : '1.5' }));
      v.gLinks = C.LOJAS_ORDEM.map((id) => ({ nome: d.lojas[id].nome, href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Forevergold ' + d.lojas[id].nome + ' ' + d.lojas[id].zona) }));
      v.ano = String(nw.getFullYear());
    }
    if (v.tLojas && !st.loja) {
      v.lojaList = true;
      v.lojas = C.LOJAS_ORDEM.map((id, i) => {
        const L = d.lojas[id], k = d.pecas.filter((p) => p.loja === id && p.estado !== 'vendida').length, mine = a.loja === id;
        return { num: C.pad(i + 1), nome: L.nome, zona: L.zona, morada: L.morada, horario: L.horario, n: k === 1 ? '1 peça à venda' : k + ' peças à venda', mine, bd: mine ? 'rgba(198,167,102,.6)' : 'rgba(198,167,102,.2)', open: () => this.openLoja(id) };
      });
    }
    if (v.tLojas && st.loja && d.lojas[st.loja]) {
      const L = d.lojas[st.loja], owner = this.ownerOf(st.loja), all = d.pecas.filter((p) => p.loja === st.loja);
      const ord = { disponivel: 0, reservada: 1, vendida: 2 };
      const cats = [{ id: 'todas', nome: 'Tudo', n: all.length }].concat(C.CATS.filter((c) => all.some((p) => p.cat === c.id)).map((c) => ({ id: c.id, nome: c.nome, n: all.filter((p) => p.cat === c.id).length })));
      const lista = all.filter((p) => st.cat === 'todas' || p.cat === st.cat).sort((x, y) => (ord[x.estado] - ord[y.estado]) || (y.at - x.at)).map((p) => this.pv(p));
      const featP = all.filter((p) => p.estado === 'disponivel').sort((x, y) => ((y.fotos || []).length ? 1 : 0) - ((x.fotos || []).length ? 1 : 0) || y.at - x.at)[0];
      const feat = featP ? this.pv(featP) : null;
      v.lojaDet = true;
      v.L = { nome: L.nome, zona: L.zona, morada: L.morada, horario: L.horario, tel: C.fmtTel(L.tel), telHref: C.telHref(L.tel), hasWa: !!C.digitos(L.whats), waHref: C.waHref(L.whats, 'Olá, Forevergold ' + L.nome + '! Vi a vossa loja na app e gostava de saber mais.'), mapHref: C.mapHref(L),
        email: L.email, mailHref: 'mailto:' + L.email, owner, editInfo: () => this.openLojaForm(), newPeca: () => this.openPecaForm(null),
        hasFeat: !!feat, featGlyph: feat ? feat.glyph : 'aliancas', featFoto: feat ? feat.foto : '', featHasFoto: !!(feat && feat.foto), featNoFoto: !(feat && feat.foto), featTitulo: feat ? feat.titulo : '', featPreco: feat ? feat.preco : '', featOpen: feat ? feat.open : null,
        countTxt: all.filter((p) => p.estado !== 'vendida').length + ' à venda', empty: lista.length === 0,
        emptyTxt: owner ? 'Ainda não há peças nesta secção. Carregue em «Nova peça» para pôr a primeira à venda.' : 'De momento não há peças nesta secção. Ligue para a loja para saber o que há em montra.' };
      v.catChips = cats.map((c) => Object.assign(this.chip(c.nome, st.cat === c.id, () => this.setState({ cat: c.id })), { n: String(c.n) }));
      v.pecas = lista;
    }
    if (v.tChat) {
      const msgs = d.chat.slice().sort((x, y) => x.at - y.at); let last = '';
      v.msgs = msgs.map((m) => {
        const dk = C.ymd(new Date(m.at)), show = dk !== last, mine = m.by === a.id; last = dk;
        return { txt: m.txt, urg: !!m.urg, showDay: show, day: this.dayLabel(m.at), align: mine ? 'flex-end' : 'flex-start', ta: mine ? 'right' : 'left',
          bg: m.urg ? 'rgba(217,89,59,.14)' : mine ? 'rgba(198,167,102,.14)' : 'rgba(17,32,26,.92)', bd: m.urg ? 'rgba(217,89,59,.75)' : mine ? 'rgba(198,167,102,.42)' : 'rgba(198,167,102,.16)',
          rad: mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px', meta: (mine ? 'Você' : this.nome(m.by)) + ' · ' + C.hora(m.at) };
      });
      const pin = msgs.filter((m) => m.urg && now - m.at < 48 * 3600e3).pop();
      v.pinned = { has: !!pin, by: pin ? this.nome(pin.by) + ' · ' + C.quando(pin.at, now) : '', txt: pin ? pin.txt : '' };
      v.noChat = msgs.length === 0;
      v.chatTxt = st.chatTxt; v.onChatTxt = (e) => this.setState({ chatTxt: e.target.value.slice(0, 1000) });
      v.onChatKey = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !('ontouchstart' in window)) { e.preventDefault(); this.sendChat(); } };
      v.urg = { on: st.chatUrg, toggle: () => this.setState({ chatUrg: !st.chatUrg }), bg: st.chatUrg ? '#D9593B' : 'transparent', fg: st.chatUrg ? '#FFF8F0' : '#B8B6A8', bd: st.chatUrg ? '#D9593B' : 'rgba(198,167,102,.3)', txt: st.chatUrg ? 'Urgente ✓' : 'Urgente' };
      v.send = () => this.sendChat(); v.sendOp = st.chatTxt.trim() ? '1' : '.35';
      v.chatPh = st.chatUrg ? 'Escreva o aviso urgente…' : 'Escreva para toda a equipa…';
    }
    if (v.tEquipa) Object.assign(v, this.vmEquipa(a, u, pend));
    if (st.sheet) Object.assign(v, this.vmSheets(a, staff));
    return v;
  }
  vmEquipa(a, u, pend) {
    const C = this.C, st = this.state, d = this.data, now = st.now, nw = new Date(now), y = nw.getFullYear(), m = nw.getMonth() + 1, mes = C.MESES[m - 1], tk = C.ymd(nw);
    const v = { eHub: !st.equipa, eCot: st.equipa === 'cot', eLucro: st.equipa === 'lucro', ePub: st.equipa === 'pub' };
    const std = this.standings(y), endY = new Date(y + 1, 0, 1).getTime(), startY = (y === C.INICIO.y ? new Date(y, C.INICIO.m - 1, 1) : new Date(y, 0, 1)).getTime(), dias = Math.max(0, Math.ceil((endY - now) / 864e5));
    const pubMes = d.pub.filter((p) => { const t = new Date(p.at); return t.getFullYear() === y && t.getMonth() === m - 1; });
    const sh = a.tipo === 'loja' ? pubMes.filter((p) => p.partilhas && p.partilhas[a.loja]).length : 0;
    if (v.eHub) {
      const hoje = d.cot[tk], rank = a.tipo === 'loja' ? std.findIndex((s) => s.id === a.loja) : -1;
      const last = d.pub.slice().sort((x, z) => z.at - x.at)[0];
      v.hub = { cotTxt: hoje && this.cv(hoje, 'of') != null ? C.numero(this.cv(hoje, 'of'), 2) : '—', cotHas: !!hoje, cotSub: hoje ? 'Hoje · ouro fino' + (this.cv(hoje, 'ou') != null ? ' · usado ' + C.numero(this.cv(hoje, 'ou'), 2) : '') + (this.cv(hoje, 'pf') != null ? ' · prata fina ' + C.numero(this.cv(hoje, 'pf'), 2) : '') + ' · ' + this.nome(hoje.by) + ', ' + C.hora(hoje.at) : 'Ainda ninguém escreveu a cotação de hoje.', cotBadge: u.cot ? String(u.cot) : '', cotB: !!u.cot,
        lead: std[0].nome, leadPts: C.numero(std[0].pts, 1), dias: String(dias), pos: rank >= 0 ? (rank + 1) + '.º lugar' : 'Classificação', posSub: rank >= 0 ? a.nome + ' · ' + C.numero(std[rank].pts, 1) + ' pontos' : 'Só as cinco lojas pontuam',
        pend, pendTxt: 'Falta registar o lucro de ' + mes, lucroB: !!(u.lucro || pend),
        lastWin: (() => { if (m === 1 || !C.emJogo(y, m - 1)) return ''; const w = this.winners(y, std)[m - 2]; return w.ids.length ? 'Vencedora de ' + C.MESES[m - 2] + ': ' + w.nomes.join(' e ') : ''; })(),
        pubN: d.pub.length === 1 ? '1 publicação' : d.pub.length + ' publicações', pubLast: last ? last.titulo : 'Ainda sem publicações', pubB: !!u.pub, pubBadge: u.pub ? String(u.pub) : '',
        pubSub: a.pub ? 'A sua secção' : a.tipo === 'loja' ? 'Partilhadas este mês: ' + sh + ' de ' + pubMes.length : 'Conteúdo para as redes sociais',
        goCot: () => this.openEquipa('cot'), goLucro: () => this.openEquipa('lucro'), goPub: () => this.openEquipa('pub') };
    }
    if (v.eCot) {
      const sel = st.cotD || tk, sd = C.parseYmd(sel), yy = sd.getFullYear(), mo = sd.getMonth(), weeks = C.weeksOfMonth(yy, mo);
      let wi = weeks.findIndex((w) => w.some((x) => C.ymd(x) === sel)); if (wi < 0) wi = 0;
      const ser = st.cotSerie, SI = this.SER.find((s) => s[0] === ser);
      const ents = Object.keys(d.cot).filter((k) => k <= tk && this.cv(d.cot[k], ser) != null).sort(), lastK = ents[ents.length - 1], last = lastK ? d.cot[lastK] : null, prevK = ents[ents.length - 2], prev = prevK ? d.cot[prevK] : null;
      const delta = last && prev ? this.cv(last, ser) - this.cv(prev, ser) : null;
      const sp = ents.slice(-14).map((k) => this.cv(d.cot[k], ser)), mn = Math.min.apply(null, sp), mx = Math.max.apply(null, sp);
      const allK = Object.keys(d.cot).filter((k) => k <= tk).sort(), lastAny = allK.length ? d.cot[allK[allK.length - 1]] : null;
      v.series = this.SER.map((s) => {
        const on = s[0] === ser, val = this.cv(lastAny, s[0]), prata = s[1] === 'Prata';
        return { metal: s[1], tipo: s[2], val: val == null ? '—' : C.numero(val, 2), click: () => this.setState({ cotSerie: s[0] }),
          bg: on ? (prata ? 'linear-gradient(150deg,#F1F3F2,#B9BEBC)' : 'linear-gradient(150deg,#E4CC92,#B4944F)') : 'rgba(7,13,11,.45)', fg: on ? '#141A17' : '#EEE7D7', sub: on ? '#3A3A30' : prata ? '#C9CECC' : '#C6A766', bd: on ? 'transparent' : prata ? 'rgba(218,222,220,.28)' : 'rgba(198,167,102,.28)' };
      });
      const sCol = SI[1] === 'Prata' ? '#DADEDC' : '#E4CC92';
      const pts = sp.map((val, i) => [(sp.length > 1 ? (i / (sp.length - 1)) * 316 : 0) + 2, 64 - ((val - mn) / (mx - mn || 1)) * 56]);
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      v.cot = { has: !!last, valor: last ? C.numero(this.cv(last, ser), 2) : '—', serie: SI[1] + ' ' + SI[2], sCol, isPrata: SI[1] === 'Prata', isOuro: SI[1] !== 'Prata', quando: !last ? 'Ainda sem cotações' : lastK === tk ? 'Hoje' : 'Última · ' + C.pad(C.parseYmd(lastK).getDate()) + '/' + C.pad(C.parseYmd(lastK).getMonth() + 1),
        by: last ? 'Escrita por ' + this.nome(last.by) + ', ' + C.hora(last.at) : 'Seja a primeira pessoa a escrever a cotação.', hasDelta: delta != null,
        delta: delta == null ? '' : (delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '= ') + C.euro(Math.abs(delta)) + ' face ao dia anterior', dC: delta > 0 ? '#7FD3A6' : delta < 0 ? '#F08C70' : '#B8B6A8',
        spark: pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), sparkHas: pts.length > 1, sparkKey: String(ents.length), dotX: pts.length ? pts[pts.length - 1][0].toFixed(1) : '0', dotY: pts.length ? pts[pts.length - 1][1].toFixed(1) : '0',
        sparkLo: sp.length ? C.numero(mn, 2) : '', sparkHi: sp.length ? C.numero(mx, 2) : '',
        mes: cap(C.MESES[mo]) + ' ' + yy, prev: () => this.cotMonth(-1), next: () => this.cotMonth(1), nextOp: yy * 12 + mo < nw.getFullYear() * 12 + nw.getMonth() ? '1' : '.25' };
      v.weeks = weeks.map((w, i) => {
        const inM = w.filter((x) => x.getMonth() === mo), on = i === wi, hasE = inM.some((x) => d.cot[C.ymd(x)]);
        return { label: 'Semana ' + (i + 1), sub: inM[0].getDate() + '–' + inM[inM.length - 1].getDate(), on, bg: on ? 'rgba(198,167,102,.16)' : 'transparent', bd: on ? '#C6A766' : 'rgba(198,167,102,.2)', fg: on ? '#EBD7A4' : '#B8B6A8', dot: hasE ? '#C6A766' : 'transparent',
          click: () => { const k = inM.map(C.ymd); this.cotSel(k.indexOf(tk) >= 0 ? tk : (k.filter((x) => x <= tk).pop() || k[0])); } };
      });
      v.days = weeks[wi].map((x, j) => {
        const k = C.ymd(x), inM = x.getMonth() === mo, fut = k > tk, on = k === sel, has = !!d.cot[k];
        return { dia: C.DIAS_C[j], num: String(x.getDate()), click: () => { if (inM) this.cotSel(k); },
          bg: on ? 'linear-gradient(160deg,#E4CC92,#B4944F)' : 'rgba(17,32,26,.7)', fg: on ? '#1B1608' : !inM ? '#2E3833' : fut ? '#5E6A63' : '#EEE7D7', sub: on ? '#3A2E12' : '#8E978F',
          bd: on ? 'transparent' : k === tk ? '#C6A766' : 'rgba(198,167,102,.14)', dot: has ? (on ? '#1B1608' : '#C6A766') : 'transparent', cur: inM ? 'pointer' : 'default' };
      });
      const e = d.cot[sel], fut = sel > tk;
      v.dia = { title: cap(C.DIAS_L[sd.getDay()]) + ', ' + sd.getDate() + ' de ' + C.MESES[mo], tag: sel === tk ? 'Hoje' : fut ? 'Ainda não chegou' : '', hasTag: sel === tk || fut,
        show: !!e && !st.cotEdit, vals: this.SER.map((s) => { const x = this.cv(e, s[0]); return { metal: s[1], tipo: s[2], val: x == null ? '—' : C.euro(x), c: s[1] === 'Prata' ? '#DADEDC' : '#EBD7A4', bd: s[1] === 'Prata' ? 'rgba(218,222,220,.22)' : 'rgba(198,167,102,.24)' }; }),
        grupos: [['Ouro', '#C6A766', 'rgba(198,167,102,.3)'], ['Prata', '#C9CECC', 'rgba(218,222,220,.28)']].map((g) => ({ nome: g[0], c: g[1], bd: g[2], campos: this.SER.filter((s) => s[1] === g[0]).map((s) => ({ tipo: s[2].charAt(0).toUpperCase() + s[2].slice(1), val: st.cotIn[s[0]], ph: s[1] === 'Ouro' ? (s[0] === 'of' ? 'ex.: 63,40' : 'ex.: 58,00') : (s[0] === 'pf' ? 'ex.: 0,85' : 'ex.: 0,70'), on: (ev) => { const val = ev.target.value.slice(0, 10); this.setState((x) => ({ cotIn: Object.assign({}, x.cotIn, { [s[0]]: val }), cotErr: '' })); } })) })),
        nota: e ? e.nota : '', hasNota: !!(e && e.nota), by: e ? (e.edit ? 'Corrigida por ' : 'Escrita por ') + this.nome(e.by) + ', ' + C.quando(e.at, now) : '',
        edit: () => { const ci = {}; this.SER.forEach((s) => { const x = this.cv(e, s[0]); ci[s[0]] = x == null ? '' : String(x).replace('.', ','); }); this.setState({ cotEdit: true, cotErr: '', cotIn: ci, cotNota: e ? e.nota || '' : '' }); },
        write: !fut && (!e || st.cotEdit), hasCancel: !!e, cancel: () => this.setState({ cotEdit: false, cotErr: '' }), fut, empty: !e && !fut,
        notaIn: st.cotNota, onNota: (ev) => this.setState({ cotNota: ev.target.value.slice(0, 500) }),
        publish: () => this.publishCot(), pubTxt: e ? 'Guardar correção' : 'Publicar e avisar a equipa', err: st.cotErr, notaN: st.cotNota.length + ' / 500' };
    }
    if (v.eLucro) {
      const max = Math.max(1, ...std.map((s) => s.pts)), ver = st.lucroVer || a.loja || std[0].id;
      const W = this.winners(y, std), wc = {};
      W.forEach((w) => { if (w.st === 'fechado') w.ids.forEach((id) => { wc[id] = (wc[id] || 0) + 1; }); });
      v.rows = C.LOJAS_ORDEM.map((id) => {
        const r = std.findIndex((s) => s.id === id), s = std[r], sel = ver === id;
        return { nome: s.nome, pts: String(Math.round(s.pts * 10) / 10), pos: String(r + 1), top: r * 74 + 'px', pct: ((s.pts / max) * 100).toFixed(1) + '%', mine: a.loja === id,
          bd: sel ? 'rgba(235,215,164,.75)' : a.loja === id ? 'rgba(198,167,102,.45)' : 'rgba(198,167,102,.16)', bg: sel ? 'rgba(198,167,102,.12)' : 'rgba(17,32,26,.72)',
          posC: r === 0 ? '#F3E3B5' : '#C6A766', lead: r === 0 && s.pts > 0, bonus: s.bonus ? '+' + s.bonus + ' bónus' : '', hasBonus: !!s.bonus, sub: (a.loja === id ? 'A sua loja · ' : '') + (wc[id] ? (wc[id] === 1 ? '1 mês ganho' : wc[id] + ' meses ganhos') + ' · ' : '') + (s.bonus ? '+' + s.bonus + ' bónus' : 'sem bónus'), click: () => this.setState({ lucroVer: id }) };
      });
      const lastDay = new Date(y, m, 0).getDate();
      v.venc = W.filter((w) => w.st !== 'fora').map((w) => {
        const fe = w.st === 'fechado', jogo = w.st === 'jogo', has = w.ids.length > 0, mine = has && w.ids.indexOf(a.loja) >= 0;
        return { mes: C.MESES[w.m - 1].charAt(0).toUpperCase() + C.MESES[w.m - 1].slice(1), fe, jogo, fut: w.st === 'futuro',
          win: fe && has, none: fe && !has, nome: w.nomes.join(' e '), empate: w.ids.length > 1, pts: C.numero(w.pts, 1) + ' pts',
          lider: has ? 'Lidera ' + w.nomes.join(' e ') + ' · ' + C.numero(w.pts, 1) : 'Ainda sem registos', fim: 'Fecha a ' + lastDay + ' de ' + mes,
          bd: fe && has ? (mine ? 'rgba(243,227,181,.85)' : 'rgba(198,167,102,.45)') : jogo ? '#C6A766' : 'rgba(198,167,102,.12)',
          bg: fe && has ? 'radial-gradient(120% 90% at 50% 0%,rgba(198,167,102,.22),rgba(17,32,26,.9) 70%)' : jogo ? 'rgba(198,167,102,.07)' : 'rgba(17,32,26,.5)',
          op: w.st === 'futuro' ? '.45' : '1', bdS: jogo ? 'dashed' : 'solid' };
      });
      const fechados = W.filter((w) => w.st === 'fechado' && w.ids.length);
      v.vencInfo = fechados.length ? fechados.length + (fechados.length === 1 ? ' mês decidido' : ' meses decididos') + ' · prémio final a 31 de dezembro' : 'A primeira vencedora sai a ' + lastDay + ' de ' + mes;
      const S = std.find((s) => s.id === ver), own = a.loja === ver;
      v.season = { ano: String(y), dias: String(dias), diasTxt: dias === 1 ? 'dia para o fim' : 'dias para o fim', pct: ((now - startY) / (endY - startY)).toFixed(3), lead: std[0].pts > 0 ? std[0].nome : '—', leadPts: C.numero(std[0].pts, 1), proxima: '1 de janeiro de ' + (y + 1) };
      v.meses = Array.from({ length: 12 }, (_, i) => i).filter((i) => C.emJogo(y, i + 1)).map((i) => {
        const mm = i + 1, x = S.meses[mm], fut = mm > m, cur = mm === m;
        return { mes: C.MESES_C[i], val: x.v == null ? (fut || cur ? '—' : '0') : C.numero(x.v / 1000, 1), eur: own && x.v != null ? C.euro(x.v, 0) : '', bonus: x.b ? '+1' : '', hasBonus: !!x.b,
          bg: cur ? 'rgba(198,167,102,.14)' : 'rgba(17,32,26,.7)', bd: cur ? '#C6A766' : 'rgba(198,167,102,.14)', fg: fut ? '#3F4A44' : '#EEE7D7' };
      });
      v.ver = { nome: S.nome, total: C.numero(S.pts, 1), lp: C.numero(S.lp, 1), bonus: String(S.bonus) };
      const mine = a.tipo === 'loja' ? ((d.lucro[y] || {})[a.loja] || {})[m] : null;
      v.lm = { isLoja: a.tipo === 'loja', notLoja: a.tipo !== 'loja', mes, has: !!mine && !st.lucroEdit, input: a.tipo === 'loja' && (!mine || st.lucroEdit), valor: mine ? C.euro(mine.valor) : '', pts: mine ? C.numero(mine.valor / 1000, 1) : '',
        quando: mine ? 'Registado ' + C.quando(mine.at, now) : '', txt: st.lucroTxt, onTxt: (e) => this.setState({ lucroTxt: e.target.value.slice(0, 14), lucroErr: '' }), registar: () => this.registarLucro(),
        corrigir: () => this.setState({ lucroEdit: true, lucroTxt: mine ? String(mine.valor).replace('.', ',') : '' }), cancel: () => this.setState({ lucroEdit: false, lucroTxt: '', lucroErr: '' }), editing: st.lucroEdit, err: st.lucroErr,
        preview: (() => { const pv = C.parseNum(st.lucroTxt); return pv != null && !isNaN(pv) && pv >= 0 ? '= ' + C.numero(pv / 1000, 1) + ' pontos' : 'Cada 1 000 € valem 1 ponto'; })(),
        shTxt: pubMes.length ? 'Partilhas de ' + mes + ': ' + sh + ' de ' + pubMes.length + (sh === pubMes.length ? ' · ponto extra garantido' : '') : 'Ainda não há publicidade em ' + mes + '.', goPub: () => this.openEquipa('pub') };
      v.primeira = y === C.INICIO.y;
      v.inicioTxt = 'A primeira temporada começa em ' + C.MESES[C.INICIO.m - 1] + ' de ' + C.INICIO.y + ' e termina a 31 de dezembro. A partir de ' + (C.INICIO.y + 1) + ', cada temporada tem os 12 meses do ano.';
      const anos = Object.keys(d.lucro).filter((k) => +k < y && +k >= C.INICIO.y).sort().reverse();
      v.passadas = anos.map((k) => { const s = this.standings(k)[0]; return { ano: k, nome: s.pts > 0 ? s.nome : 'Sem registos', pts: C.numero(s.pts, 1) + ' pontos' }; });
      v.hasPassadas = v.passadas.length > 0;
      v.regras = st.regras; v.toggleRegras = () => this.setState({ regras: !st.regras }); v.regrasTxt = st.regras ? 'Fechar regras' : 'Ler as regras todas';
    }
    if (v.ePub) {
      const isLoja = a.tipo === 'loja';
      v.pubs = d.pub.slice().sort((x, z) => z.at - x.at).map((p) => {
        const t = new Date(p.at), cur = t.getFullYear() === y && t.getMonth() === m - 1, P = p.partilhas || {}, mine = isLoja && !!P[a.loja];
        const url = p.media ? this.url(p.media.id) : '', copied = st.copied === p.id;
        return { id: p.id, titulo: p.titulo, data: t.getDate() + ' de ' + C.MESES[t.getMonth()] + ' · ' + this.nome(p.by), texto: p.texto, hasTexto: !!p.texto,
          hasMedia: !!(p.media && url), isImg: !!(p.media && url && p.media.tipo === 'imagem'), isVid: !!(p.media && url && p.media.tipo === 'video'), noMedia: !p.media, mediaPend: !!(p.media && !url), url, nome: p.media ? p.media.nome : '',
          copy: () => this.copy(p.texto, p.id), copyTxt: copied ? 'Texto copiado ✓' : 'Copiar texto', copyBg: copied ? 'rgba(31,143,85,.2)' : 'transparent', copyBd: copied ? '#3FBF7F' : '#C6A766',
          canEdit: !!a.pub, edit: () => this.openPubForm(p.id), del: () => this.delPub(p.id),
          canShare: isLoja && cur, shared: mine, toggle: () => this.toggleShare(p.id),
          shareTxt: mine ? 'Partilhado nas redes da loja' : 'Marcar como partilhado', shareBg: mine ? 'linear-gradient(120deg,#B4944F,#E4CC92 48%,#BC9C57)' : 'transparent', shareFg: mine ? '#1B1608' : '#EEE7D7', shareBd: mine ? 'transparent' : 'rgba(198,167,102,.45)', mark: mine ? '✓' : '',
          closed: isLoja && !cur, closedTxt: mine ? 'Partilhado ✓ · mês fechado' : 'Mês fechado',
          lojasSh: C.LOJAS_ORDEM.map((id) => ({ nome: d.lojas[id].nome === 'Santo Ovídio' ? 'Sto. Ovídio' : d.lojas[id].nome, bg: P[id] ? 'rgba(198,167,102,.18)' : 'transparent', fg: P[id] ? '#EBD7A4' : '#5E6A63', bd: P[id] ? 'rgba(198,167,102,.5)' : 'rgba(198,167,102,.14)', mark: P[id] ? '✓ ' : '' })) };
      });
      v.noPubs = v.pubs.length === 0;
      v.ph = { isBU: !!a.pub, isLoja, mes, newPost: () => this.openPubForm(null), sh: String(sh), total: String(pubMes.length), pct: pubMes.length ? sh / pubMes.length : 0,
        ok: pubMes.length > 0 && sh === pubMes.length, txt: !pubMes.length ? 'Ainda não há publicações em ' + mes + '.' : sh === pubMes.length ? 'Ponto extra de ' + mes + ' garantido.' : (pubMes.length - sh === 1 ? 'Falta 1 publicação' : 'Faltam ' + (pubMes.length - sh) + ' publicações') + ' para o ponto extra de ' + mes + '.' };
    }
    return v;
  }
  vmSheets(a, staff) {
    const C = this.C, st = this.state, d = this.data, v = {};
    if (st.sheet === 'peca') {
      const p = d.pecas.find((x) => x.id === st.peca);
      if (p) {
        const L = d.lojas[p.loja], owner = this.ownerOf(p.loja), fotos = (p.fotos || []).map((f) => ({ url: this.url(f) })).filter((f) => f.url);
        v.sPeca = true;
        v.P = Object.assign(this.pv(p), { fotos, hasFotos: fotos.length > 0, noFotos: fotos.length === 0, many: fotos.length > 1, fotosTxt: fotos.length + ' fotografias · deslize para o lado',
          lojaNome: 'Loja ' + L.nome, lojaZona: L.zona + ' · ' + C.fmtTel(L.tel), telHref: C.telHref(L.tel), hasWa: !!C.digitos(L.whats),
          waHref: C.waHref(L.whats, 'Olá, Forevergold ' + L.nome + '! Vi na app a peça «' + p.titulo + '» (' + (p.preco == null ? 'preço sob consulta' : C.euro(p.preco)) + '). Ainda está disponível?'),
          vendida: p.estado === 'vendida', canBuy: p.estado !== 'vendida', reservada: p.estado === 'reservada', owner,
          estados: C.ESTADOS.map((e) => this.chip(e.nome, p.estado === e.id, () => this.setEstado(p.id, e.id))),
          edit: () => this.openPecaForm(p.id), del: () => this.delPeca(p.id), goLoja: () => { this.setState({ sheet: null }); this.openLoja(p.loja); } });
      }
    }
    if (st.sheet === 'pecaForm' && st.form) {
      const f = st.form;
      v.sPecaForm = true;
      v.F = { head: f.id ? 'Editar peça' : 'Nova peça', titulo: f.titulo, preco: f.preco, peso: f.peso, consulta: f.consulta, notConsulta: !f.consulta,
        onTitulo: (e) => this.setF('titulo', e.target.value.slice(0, 80)), onPreco: (e) => this.setF('preco', e.target.value.slice(0, 12)), onPeso: (e) => this.setF('peso', e.target.value.slice(0, 8)),
        cons: { op: f.consulta ? '.35' : '1', toggle: () => this.setF('consulta', !f.consulta), bg: f.consulta ? '#C6A766' : 'transparent', bd: f.consulta ? '#C6A766' : 'rgba(198,167,102,.45)', mark: f.consulta ? '✓' : '' },
        cats: C.CATS.map((c) => this.chip(c.nome, f.cat === c.id, () => this.setF('cat', c.id))), mats: C.MATERIAIS.map((x) => this.chip(x, f.mat === x, () => this.setF('mat', x))),
        estados: C.ESTADOS.map((e) => this.chip(e.nome, f.estado === e.id, () => this.setF('estado', e.id))),
        fotos: f.fotos.map((x, i) => ({ url: x.url || this.url(x.id), rm: () => this.rmFoto(i), capa: i === 0 })), canAdd: f.fotos.length < 6, fotosN: f.fotos.length + ' de 6',
        onFotos: (e) => this.pickFotos(e), save: () => this.savePeca(), saveTxt: st.busy ? 'A guardar…' : f.id ? 'Guardar alterações' : 'Publicar peça', saveOp: st.busy ? '.6' : '1', err: st.formErr, cancel: () => this.closeSheet() };
    }
    if (st.sheet === 'lojaForm' && st.form) {
      const f = st.form, set = (k, max) => (e) => this.setF(k, e.target.value.slice(0, max));
      v.sLojaForm = true;
      v.LF = { nome: a.nome, morada: f.morada, horario: f.horario, tel: f.tel, whats: f.whats, email: f.email, onMorada: set('morada', 140), onHorario: set('horario', 80), onTel: set('tel', 16), onWhats: set('whats', 16), onEmail: set('email', 80), save: () => this.saveLoja(), err: st.formErr };
    }
    if (st.sheet === 'pubForm' && st.form) {
      const f = st.form, M = f.media, url = M ? M.url || this.url(M.id) : '';
      v.sPubForm = true;
      v.PF = { head: f.id ? 'Editar publicação' : 'Nova publicação', titulo: f.titulo, texto: f.texto, onTitulo: (e) => this.setF('titulo', e.target.value.slice(0, 80)), onTexto: (e) => this.setF('texto', e.target.value.slice(0, 2200)), textoN: f.texto.length + ' / 2200',
        hasMedia: !!M, noMedia: !M, isImg: !!(M && M.tipo === 'imagem' && url), isVid: !!(M && M.tipo === 'video' && url), url, nome: M ? M.nome : '', onMedia: (e) => this.pickMedia(e), rmMedia: () => this.rmMedia(),
        save: () => this.savePub(), saveTxt: st.busy ? 'A guardar…' : f.id ? 'Guardar alterações' : 'Publicar para a equipa', saveOp: st.busy ? '.6' : '1', err: st.formErr };
    }
    if (st.sheet === 'perfil') {
      const perm = st.perm;
      v.sPerfil = true;
      v.pf = { nome: a.tipo === 'cliente' ? 'Cliente' : a.nome, user: a.tipo === 'cliente' ? 'Entrada sem código' : a.id, staff,
        papel: a.tipo === 'cliente' ? 'Vê a página principal e as peças das cinco lojas.' : a.tipo === 'loja' ? 'Edita a secção da loja ' + a.nome + ', usa o chat, a cotação diária, o lucro do mês e a publicidade.' : a.pub ? 'Gere a secção Publicidade e usa o chat, a cotação diária e o lucro do mês.' : 'Usa o chat, a publicidade, a cotação diária e acompanha o lucro do mês.',
        notifOk: perm === 'granted', notifAsk: perm === 'default', notifNo: perm === 'denied' || perm === 'unsupported',
        notifTxt: perm === 'granted' ? 'Notificações ativas neste telemóvel.' : perm === 'denied' ? 'As notificações estão bloqueadas nas definições do navegador.' : perm === 'unsupported' ? 'Este navegador não mostra notificações. Os avisos aparecem dentro da app.' : 'Receba avisos do chat, da cotação diária e da publicidade mesmo com a app em segundo plano.',
        askNotif: () => this.askNotif(), changePin: () => this.startChange(), logout: () => this.logout(), clearEx: () => this.clearEx(),
        hasEx: staff && (d.pecas.some((x) => x.ex) || d.chat.some((x) => x.ex) || d.pub.some((x) => x.ex) || Object.values(d.cot).some((x) => x.ex)) };
    }
    if (st.sheet === 'inbox') {
      const snap = st.inboxSnap || {}, key = { chat: 'chat', urg: 'chat', cot: 'cot', pub: 'pub', lucro: 'lucro' };
      const items = staff ? this.feed(a.id).slice(0, 40) : [];
      v.sInbox = true;
      v.inbox = items.map((i) => { const novo = i.at > (snap[key[i.k]] || 0); return { kind: i.kind, body: i.body, when: C.quando(i.at, st.now), novo, kc: i.k === 'urg' ? '#F08C70' : '#C6A766', bg: novo ? 'rgba(198,167,102,.08)' : 'transparent', dot: novo ? (i.k === 'urg' ? '#D9593B' : '#C6A766') : 'transparent', click: () => { this.setState({ sheet: null }); this.navTo(i.k); } }; });
      v.noInbox = items.length === 0;
    }
    return v;
  }

  render() {
    return <Template vals={this.renderVals()} />;
  }
}
