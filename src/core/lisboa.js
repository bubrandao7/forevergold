/* Hora de Lisboa em todo o lado.
   O protótipo usava a hora do telemóvel para decidir "hoje", "mês atual" e "mês fechado". O servidor decide pela hora de
   Lisboa; para o ecrã e o servidor nunca discordarem (por exemplo num telemóvel no Dubai), o código da app usa esta
   classe no lugar de Date. Os getters de calendário (getFullYear, getMonth, getDate, getDay, getHours…) devolvem a hora
   de parede de Lisboa e o construtor com componentes (ano, mês, dia…) interpreta-os como hora de Lisboa.
   Instantes (getTime, Date.now, new Date(ms)) não mudam. */
const TZ = 'Europe/Lisbon';
const FMT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' });
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function partes(ms) {
  const p = {};
  for (const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month - 1, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, wd: WD[p.weekday] };
}
/* deslocamento de Lisboa em ms (positivo a leste de UTC) para um instante */
function desvio(ms) {
  const p = partes(ms);
  return Date.UTC(p.y, p.mo, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
/* hora de parede de Lisboa → instante */
function parede(y, mo, d, h, mi, s, ms) {
  const w = Date.UTC(y, mo, d, h, mi, s, ms);
  const a = w - desvio(w - desvio(w));
  return a;
}

export class LDate extends Date {
  constructor(...a) {
    if (a.length >= 2) super(parede(+a[0], +a[1], a.length > 2 ? +a[2] : 1, +(a[3] || 0), +(a[4] || 0), +(a[5] || 0), +(a[6] || 0)));
    else super(...a);
    // Em navegadores normais isto não faz nada; com o relógio simulado do Playwright, o construtor de Date devolve um Date
    // nativo e perderia estes métodos.
    if (Object.getPrototypeOf(this) !== LDate.prototype) Object.setPrototypeOf(this, LDate.prototype);
    this._t = NaN; this._p = null;
  }
  _parts() { const t = this.getTime(); if (this._t !== t) { this._t = t; this._p = isNaN(t) ? null : partes(t); } return this._p; }
  getFullYear() { const p = this._parts(); return p ? p.y : NaN; }
  getMonth() { const p = this._parts(); return p ? p.mo : NaN; }
  getDate() { const p = this._parts(); return p ? p.d : NaN; }
  getDay() { const p = this._parts(); return p ? p.wd : NaN; }
  getHours() { const p = this._parts(); return p ? p.h : NaN; }
  getMinutes() { const p = this._parts(); return p ? p.mi : NaN; }
  getSeconds() { const p = this._parts(); return p ? p.s : NaN; }
  getTimezoneOffset() { return -desvio(this.getTime()) / 60000; }
  setHours(h, mi, s, ms) {
    const p = this._parts(), t = this.getTime();
    return this.setTime(parede(p.y, p.mo, p.d, h, mi == null ? p.mi : mi, s == null ? p.s : s, ms == null ? t % 1000 : ms));
  }
  toLocaleTimeString(loc, o) { return super.toLocaleTimeString(loc, Object.assign({ timeZone: TZ }, o)); }
  toLocaleDateString(loc, o) { return super.toLocaleDateString(loc, Object.assign({ timeZone: TZ }, o)); }
  toLocaleString(loc, o) { return super.toLocaleString(loc, Object.assign({ timeZone: TZ }, o)); }
}

window.LDate = LDate;
