/* A função SQL de pontos tem de dar o mesmo que standings()/winners() do protótipo (referencia/ + src/App.jsx).
   Aqui está a lógica do protótipo copiada, a correr sobre os mesmos dados que a base. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { novaBase } from './db.mjs';

const LOJAS = ['valbom', 'stovidio', 'pedroucos', 'riotinto', 'arrifana'];
const NOMES = { valbom: 'Valbom', stovidio: 'Santo Ovídio', pedroucos: 'Pedrouços', riotinto: 'Rio Tinto', arrifana: 'Arrifana' };
const INICIO = { y: 2026, m: 10 };
const emJogo = (y, m) => y * 12 + m >= INICIO.y * 12 + INICIO.m;

/* --- cópia de standings() e winners() do protótipo, com `now` e fuso de Lisboa explícitos --- */
const lisboa = (t) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: 'numeric' }).formatToParts(new Date(t)).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month }; };
function standings(d, y) {
  const L = d.lucro[y] || {};
  const pubs = d.pub.filter((p) => lisboa(p.at).y === Number(y));
  return LOJAS.map((id) => {
    let lp = 0, bonus = 0; const meses = {};
    for (let m = 1; m <= 12; m++) {
      const jogo = emJogo(+y, m), e = jogo && L[id] && L[id][m], v = e ? e.valor : null;
      const pm = jogo ? pubs.filter((p) => lisboa(p.at).m === m) : [];
      const sh = pm.filter((p) => p.partilhas && p.partilhas[id]).length;
      const b = pm.length > 0 && sh === pm.length ? 1 : 0;
      if (v != null) lp += v / 1000;
      bonus += b;
      meses[m] = { v, b, sh, total: pm.length };
    }
    return { id, nome: NOMES[id], lp, bonus, pts: lp + bonus, meses };
  }).sort((a, b) => b.pts - a.pts);
}
function winners(d, y, now) {
  const n = lisboa(now), cy = n.y, cm = n.m, S = standings(d, y);
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1, st = !emJogo(+y, m) ? 'fora' : +y < cy || (+y === cy && m < cm) ? 'fechado' : +y === cy && m === cm ? 'jogo' : 'futuro';
    const sc = S.map((s) => ({ id: s.id, nome: s.nome, pts: (s.meses[m].v || 0) / 1000 + s.meses[m].b }));
    const max = Math.max.apply(null, sc.map((s) => s.pts));
    const top = max > 0 ? sc.filter((s) => Math.abs(s.pts - max) < 1e-9) : [];
    return { m, st, ids: top.map((s) => s.id), nomes: top.map((s) => s.nome), pts: max };
  });
}

/* --- dados aleatórios (mas repetíveis) --- */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gerar(R, agora) {
  const d = { lucro: {}, pub: [] };
  const fim = lisboa(agora);
  for (let y = 2025; y <= fim.y; y++) for (let m = 1; m <= 12; m++) {
    if (y === fim.y && m > fim.m) continue;
    // publicações do mês (0 a 3), em dias 1..28 às 12:00 UTC
    const k = Math.floor(R() * 4);
    for (let i = 0; i < k; i++) {
      const at = Date.UTC(y, m - 1, 1 + Math.floor(R() * 27), 12, 0, 0);
      const part = {}; LOJAS.forEach((l) => { if (R() < 0.6) part[l] = at + 3600e3 * (1 + Math.floor(R() * 20)); });
      d.pub.push({ id: `p${y}-${m}-${i}`, at, partilhas: part });
    }
    LOJAS.forEach((l) => { if (R() < 0.8) { d.lucro[y] = d.lucro[y] || {}; d.lucro[y][l] = d.lucro[y][l] || {}; d.lucro[y][l][m] = { valor: Math.round(R() * 30000 * 100) / 100 }; } });
  }
  return d;
}
const near = (a, b, msg) => assert.ok(Math.abs(Number(a) - Number(b)) < 1e-6, `${msg}: ${a} ≠ ${b}`);

async function carrega(c, d) {
  await c.query("set session_replication_role = replica"); // dados históricos: sem triggers
  await c.query('delete from public.pub_partilhas; delete from public.pub; delete from public.lucro;');
  for (const p of d.pub) {
    await c.query(`insert into public.pub (id, autor, at, titulo, texto) values ($1, 'foreverbu', to_timestamp($2/1000.0), 'T', 'x')`, [p.id, p.at]);
    for (const [l, t] of Object.entries(p.partilhas)) await c.query(`insert into public.pub_partilhas (pub, loja, conta, at) values ($1, $2, $3, to_timestamp($4/1000.0))`, [p.id, l, 'forever' + l, t]);
  }
  for (const y of Object.keys(d.lucro)) for (const l of Object.keys(d.lucro[y])) for (const m of Object.keys(d.lucro[y][l]))
    await c.query(`insert into public.lucro (ano, mes, loja, valor, autor) values ($1, $2, $3, $4, $5)`, [y, m, l, d.lucro[y][l][m].valor, 'forever' + l]);
  await c.query("set session_replication_role = origin");
}

test('SQL = protótipo, em várias datas e com dados aleatórios', async () => {
  const b = await novaBase('fg_pontos'); const c = b.c;
  const agoras = ['2026-10-08T14:30:00+01:00', '2026-11-01T00:00:30+00:00', '2026-12-31T23:30:00+00:00', '2027-01-01T00:30:00+00:00', '2027-06-15T10:00:00+01:00', '2028-03-02T09:00:00+00:00'];
  let k = 0;
  for (const ag of agoras) for (let rep = 0; rep < 3; rep++) {
    const agora = Date.parse(ag), d = gerar(rng(1000 + k++), agora);
    await carrega(c, d);
    const sql = (await c.query('select fg.classificacao($1::timestamptz) as r', [new Date(agora).toISOString()])).rows[0].r;
    const anos = Object.keys(sql).filter((x) => /^\d+$/.test(x));
    assert.deepEqual(anos, Array.from({ length: lisboa(agora).y - 2025 }, (_, i) => String(2026 + i)), 'anos');
    for (const y of anos) {
      const js = standings(d, y), jw = winners(d, y, agora);
      assert.deepEqual(sql[y].std.map((s) => s.id), js.map((s) => s.id), `${ag} ${y}: ordem`);
      js.forEach((s, i) => {
        const q = sql[y].std[i];
        near(q.lp, s.lp, `${ag} ${y} ${s.id} lp`); near(q.pts, s.pts, 'pts'); assert.equal(q.bonus, s.bonus, `${ag} ${y} ${s.id} bónus`);
        for (let m = 1; m <= 12; m++) {
          const a = q.meses[m], e = s.meses[m];
          assert.equal(a.v == null ? null : Number(a.v), e.v == null ? null : e.v, `${ag} ${y} ${s.id} v${m}`);
          assert.equal(a.b, e.b, `b${m}`); assert.equal(a.sh, e.sh, `sh${m}`); assert.equal(a.total, e.total, `total${m}`);
        }
      });
      jw.forEach((w, i) => {
        const x = sql[y].winners[i];
        assert.equal(x.m, w.m); assert.equal(x.st, w.st, `${ag} ${y} st${w.m}`);
        assert.deepEqual([...x.ids].sort(), [...w.ids].sort(), `${ag} ${y} vencedoras mês ${w.m}`);
        near(x.pts, w.pts, 'pts vencedora');
      });
    }
  }
  await c.end();
});

test('regras pontuais: bónus só no mês, sem publicidade não há bónus, antes de outubro de 2026 não há pontos', async () => {
  const b = await novaBase('fg_pontos2'); const c = b.c;
  await c.query("set session_replication_role = replica");
  await c.query('delete from public.pub; delete from public.lucro');
  // outubro 2026: 2 publicidades; valbom partilhou as duas no mês; stovidio só uma; riotinto partilhou uma já em novembro (não conta)
  await c.query(`insert into public.pub (id, autor, at, titulo, texto) values ('a','foreverbu','2026-10-03 12:00+01','A','x'),('b','foreverbu','2026-10-20 12:00+01','B','x')`);
  await c.query(`insert into public.pub_partilhas (pub, loja, conta, at) values
    ('a','valbom','forevervalbom','2026-10-04 10:00+01'),('b','valbom','forevervalbom','2026-10-21 10:00+01'),
    ('a','stovidio','foreverstovidio','2026-10-04 10:00+01'),
    ('a','riotinto','foreverriotinto','2026-10-05 10:00+01'),('b','riotinto','foreverriotinto','2026-11-02 10:00+00')`);
  // setembro 2026 (antes do início): lucro e publicidade que não contam
  await c.query(`insert into public.pub (id, autor, at, titulo, texto) values ('s','foreverbu','2026-09-10 12:00+01','S','x')`);
  await c.query(`insert into public.pub_partilhas (pub, loja, conta, at) values ('s','valbom','forevervalbom','2026-09-11 10:00+01')`);
  await c.query(`insert into public.lucro (ano, mes, loja, valor, autor) values (2026, 9, 'valbom', 99999, 'forevervalbom'), (2026, 10, 'valbom', 12450.5, 'forevervalbom'), (2026, 10, 'arrifana', 12450.5, 'foreverarrifana')`);
  await c.query("set session_replication_role = origin");
  const r = (await c.query(`select fg.classificacao('2026-11-15 12:00+00') as r`)).rows[0].r['2026'];
  const por = Object.fromEntries(r.std.map((s) => [s.id, s]));
  near(por.valbom.pts, 13.4505, 'valbom = 12,4505 + 1 bónus'); assert.equal(por.valbom.bonus, 1);
  assert.equal(por.stovidio.bonus, 0); assert.equal(por.riotinto.bonus, 0);
  near(por.arrifana.pts, 12.4505, 'arrifana sem bónus');
  assert.equal(por.valbom.meses[9].v, null, 'setembro fora do jogo'); assert.equal(por.valbom.meses[9].total, 0);
  assert.equal(r.winners[8].st, 'fora'); assert.equal(r.winners[9].st, 'fechado'); assert.deepEqual(r.winners[9].ids, ['valbom']);
  assert.equal(r.winners[10].st, 'jogo'); assert.deepEqual(r.winners[10].ids, []);
  // empate: ordem fixa das lojas
  assert.deepEqual(r.std.slice(0, 2).map((s) => s.id), ['valbom', 'arrifana']);
  await c.end();
});
