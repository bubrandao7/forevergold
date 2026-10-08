import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { novaBase, como, falha } from './db.mjs';

let b;
before(async () => { b = await novaBase('fg_rls'); });
after(async () => { await b.c.end(); });

const rows = (conta, sql, params) => como(b, conta, async (q) => (await q(sql, params)).rows);
const count = async (conta, t) => Number((await rows(conta, `select count(*)::int as n from public.${t}`))[0].n);

test('cliente (anon): lê lojas e peças; nada de equipa', async () => {
  assert.equal(await count(null, 'lojas'), 5);
  assert.equal(await count(null, 'pecas'), 16);
  assert.equal(await count(null, 'peca_fotos'), 0);
  for (const t of ['chat', 'cotacoes', 'lucro', 'pub', 'pub_partilhas', 'vistos', 'contas', 'pins', 'dispositivos', 'push_subs', 'fg_meta']) {
    const m = await falha(b, null, `select * from public.${t}`);
    assert.match(m, /permission denied/, t);
  }
  assert.match(await falha(b, null, 'select public.fg_classificacao()'), /permission denied/);
  assert.match(await falha(b, null, `insert into public.pecas (id, loja, cat, titulo, mat) values ('x','valbom','aneis','Teste','Aço')`), /permission denied/);
  assert.match(await falha(b, null, `update public.lojas set morada = 'x'`), /permission denied/);
  const est = await rows(null, 'select * from public.fg_estado_contas()');
  assert.equal(est.length, 8);
  assert.ok(est.every((r) => r.tem_pin === false && r.bloqueado_ate === null));
});

test('loja: edita só a sua informação', async () => {
  const r = await como(b, 'forevervalbom', (q) => q(`update public.lojas set morada = 'Rua Nova, 123, Valbom' where id = 'valbom'`));
  assert.equal(r.rowCount, 1);
  const o = await como(b, 'forevervalbom', (q) => q(`update public.lojas set morada = 'hack' where id = 'riotinto'`));
  assert.equal(o.rowCount, 0);
  assert.match(await falha(b, 'forevervalbom', `update public.lojas set nome = 'Outra' where id = 'valbom'`), /permission denied/);
  // equipa sem loja não edita nenhuma
  const e = await como(b, 'foreverbu', (q) => q(`update public.lojas set morada = 'hack' where id = 'valbom'`));
  assert.equal(e.rowCount, 0);
});

test('loja: peças e fotos só da sua loja', async () => {
  await como(b, 'forevervalbom', async (q) => {
    await q(`insert into public.pecas (id, loja, cat, titulo, preco, mat, peso) values ('pt1','valbom','brincos','Brincos de teste', 1234.56, 'Prata 925', 3.2)`);
    await q(`insert into public.peca_fotos (id, peca, pos, path) values ('f1','pt1',0,'valbom/pt1/f1.jpg')`);
    const u = await q(`update public.pecas set estado = 'vendida' where id = 'pt1'`);
    assert.equal(u.rowCount, 1);
  });
  assert.match(await falha(b, 'forevervalbom', `insert into public.pecas (id, loja, cat, titulo, mat) values ('pt2','riotinto','aneis','Teste','Aço')`), /row-level security/);
  assert.equal((await como(b, 'forevervalbom', (q) => q(`update public.pecas set preco = 1 where loja = 'riotinto'`))).rowCount, 0);
  assert.equal((await como(b, 'forevervalbom', (q) => q(`delete from public.pecas where loja = 'riotinto'`))).rowCount, 0);
  assert.match(await falha(b, 'forevervalbom', `insert into public.peca_fotos (id, peca, pos, path) values ('f9','pex11',0,'x')`), /row-level security/);
  // oficina e BU não escrevem peças
  assert.match(await falha(b, 'foreveroficina', `insert into public.pecas (id, loja, cat, titulo, mat) values ('pt3','valbom','aneis','Teste','Aço')`), /row-level security/);
  // a loja de uma peça não muda; título curto e preço inválido falham
  await como(b, 'forevervalbom', async (q) => {
    await q(`insert into public.pecas (id, loja, cat, titulo, mat) values ('pt4','valbom','aneis','Anel','Aço')`);
    await q(`update public.pecas set loja = 'riotinto' where id = 'pt4'`).catch(() => {});
    assert.equal((await q(`select loja from public.pecas where id = 'pt4'`)).rows[0]?.loja, 'valbom');
  });
  assert.match(await falha(b, 'forevervalbom', `insert into public.pecas (id, loja, cat, titulo, mat) values ('pt5','valbom','aneis','x','Aço')`), /check/);
  assert.match(await falha(b, 'forevervalbom', `insert into public.pecas (id, loja, cat, titulo, mat, preco) values ('pt6','valbom','aneis','Anel','Aço', 0)`), /check/);
  // máximo de 6 fotos (pos 0..5)
  assert.match(await falha(b, 'forevervalbom', `insert into public.peca_fotos (id, peca, pos, path) values ('f7','pex0',6,'x')`), /check/);
});

test('loja não consegue marcar uma peça como exemplo', async () => {
  const ex = await como(b, 'forevervalbom', async (q) => {
    await q(`insert into public.pecas (id, loja, cat, titulo, mat, ex) values ('pt7','valbom','aneis','Anel teste','Aço', true)`);
    return (await q(`select ex from public.pecas where id = 'pt7'`)).rows[0].ex;
  });
  assert.equal(ex, false);
});

test('chat: só a equipa, autor = quem escreve, hora do servidor', async () => {
  const r = await como(b, 'foreverfilipe', async (q) => {
    await q(`insert into public.chat (id, autor, txt, urg, at) values ('c1','foreverfilipe','Olá', true, '2000-01-01')`);
    return (await q(`select at, urg, ex from public.chat where id = 'c1'`)).rows[0];
  });
  assert.ok(new Date(r.at).getFullYear() >= 2025, 'hora do servidor');
  assert.equal(r.urg, true);
  assert.match(await falha(b, 'foreverfilipe', `insert into public.chat (id, autor, txt) values ('c2','forevervalbom','Falsa')`), /row-level security/);
  assert.match(await falha(b, 'foreverfilipe', `insert into public.chat (id, autor, txt) values ('c3','foreverfilipe','   ')`), /check/);
  assert.match(await falha(b, 'foreverfilipe', `update public.chat set txt = 'x'`), /permission denied/);
  assert.match(await falha(b, 'foreverfilipe', `delete from public.chat`), /permission denied/);
});

test('cotação: qualquer da equipa escreve e corrige; dia futuro não', async () => {
  const hoje = (await rows('foreverbu', `select (now() at time zone 'Europe/Lisbon')::date::text as d`))[0].d;
  const r = await como(b, 'forevervalbom', async (q) => {
    await q(`insert into public.cotacoes (dia, ouro_fino, nota, autor) values ($1, 63.40, 'n', 'forevervalbom')`, [hoje]);
    return (await q(`select edit, autor from public.cotacoes where dia = $1`, [hoje])).rows[0];
  }, { manter: true });
  assert.deepEqual(r, { edit: false, autor: 'forevervalbom' });
  await como(b, 'foreverfilipe', async (q) => {
    await q(`insert into public.cotacoes (dia, ouro_fino, autor) values ($1, 63.40, 'foreverfilipe') on conflict (dia) do update set ouro_fino = excluded.ouro_fino, autor = excluded.autor`, [hoje]);
    const x = (await q(`select edit, autor from public.cotacoes where dia = $1`, [hoje])).rows[0];
    assert.deepEqual(x, { edit: true, autor: 'foreverfilipe' });
  });
  assert.match(await falha(b, 'foreverfilipe', `insert into public.cotacoes (dia, ouro_fino, autor) values ((now() + interval '3 days')::date, 60, 'foreverfilipe')`), /dia futuro|futuro/);
  assert.match(await falha(b, 'foreverfilipe', `insert into public.cotacoes (dia, autor) values ('2026-01-05', 'foreverfilipe')`), /check/);
  assert.match(await falha(b, 'foreverfilipe', `insert into public.cotacoes (dia, ouro_fino, autor) values ('2026-01-05', 1000, 'foreverfilipe')`), /check/);
  assert.match(await falha(b, null, `insert into public.cotacoes (dia, ouro_fino, autor) values ('2026-01-05', 60, 'foreverfilipe')`), /permission denied/);
});

test('lucro: só a loja, só a sua, só o mês corrente', async () => {
  const [ano, mes] = (await rows('foreverbu', `select extract(year from now() at time zone 'Europe/Lisbon')::int a, extract(month from now() at time zone 'Europe/Lisbon')::int m`)).map((x) => [x.a, x.m])[0];
  await como(b, 'foreverriotinto', async (q) => {
    await q(`insert into public.lucro (ano, mes, loja, valor, autor) values ($1,$2,'riotinto',12450.5,'foreverriotinto')`, [ano, mes]);
    await q(`update public.lucro set valor = 13000 where ano = $1 and mes = $2 and loja = 'riotinto'`, [ano, mes]);
    assert.equal((await q(`select valor::float8 v from public.lucro where loja = 'riotinto'`)).rows[0].v, 13000);
  });
  assert.match(await falha(b, 'foreverriotinto', `insert into public.lucro (ano, mes, loja, valor, autor) values ($1,$2,'valbom',1,'foreverriotinto')`, [ano, mes]), /row-level security/);
  assert.match(await falha(b, 'foreverriotinto', `insert into public.lucro (ano, mes, loja, valor, autor) values ($1,$2,'riotinto',1,'foreverriotinto')`, [ano, mes === 1 ? 12 : mes - 1]), /mês corrente|mes corrente|corrente/);
  assert.match(await falha(b, 'foreverriotinto', `insert into public.lucro (ano, mes, loja, valor, autor) values ($1,$2,'riotinto',-1,'foreverriotinto')`, [ano, mes]), /check/);
  for (const c of ['foreveroficina', 'foreverbu', 'foreverfilipe']) {
    assert.match(await falha(b, c, `insert into public.lucro (ano, mes, loja, valor, autor) values ($1,$2,'valbom',1,$3)`, [ano, mes, c]), /row-level security/, c);
  }
  assert.equal((await count('foreveroficina', 'lucro')) >= 0, true); // a equipa lê
});

test('publicidade: só a BU escreve; lojas partilham no próprio mês', async () => {
  assert.match(await falha(b, 'forevervalbom', `insert into public.pub (id, autor, titulo, texto) values ('u1','forevervalbom','Título','texto')`), /row-level security/);
  await como(b, 'foreverbu', async (q) => {
    await q(`insert into public.pub (id, autor, titulo, texto) values ('u1','foreverbu','Campanha de teste','Texto #forevergold')`);
    await q(`update public.pub set titulo = 'Outro título' where id = 'u1'`);
  }, { manter: true });
  assert.equal((await como(b, 'forevervalbom', (q) => q(`update public.pub set titulo = 'x' where id = 'u1'`))).rowCount, 0);
  assert.equal((await como(b, 'forevervalbom', (q) => q(`delete from public.pub where id = 'u1'`))).rowCount, 0);
  assert.match(await falha(b, 'foreverbu', `insert into public.pub (id, autor, titulo) values ('u2','foreverbu','Sem nada')`), /check/);

  await como(b, 'forevervalbom', (q) => q(`insert into public.pub_partilhas (pub, loja, conta) values ('u1','valbom','forevervalbom')`), { manter: true });
  assert.match(await falha(b, 'forevervalbom', `insert into public.pub_partilhas (pub, loja, conta) values ('u1','riotinto','forevervalbom')`), /row-level security/);
  assert.match(await falha(b, 'foreverbu', `insert into public.pub_partilhas (pub, loja, conta) values ('u1','valbom','foreverbu')`), /row-level security/);
  assert.equal((await como(b, 'foreverriotinto', (q) => q(`delete from public.pub_partilhas where pub = 'u1' and loja = 'valbom'`))).rowCount, 0);
  // mês fechado: publicidade de há 40 dias
  await como(b, 'service', (q) => q(`insert into public.pub (id, autor, titulo, texto) values ('u9','foreverbu','Antiga','x'); update public.pub set at = now() - interval '40 days' where id = 'u9'`));
  assert.match(await falha(b, 'forevervalbom', `insert into public.pub_partilhas (pub, loja, conta) values ('u9','valbom','forevervalbom')`), /fecharam/);
  await como(b, 'forevervalbom', (q) => q(`delete from public.pub_partilhas where pub = 'u1'`), { manter: true });
});

test('vistos e push: só os da própria conta', async () => {
  await como(b, 'forevervalbom', async (q) => {
    await q(`insert into public.vistos (conta, kind, at) values ('forevervalbom','chat', now()) on conflict (conta, kind) do update set at = excluded.at`);
    assert.equal((await q(`select count(*)::int n from public.vistos`)).rows[0].n, 4);
    await q(`insert into public.push_subs (conta, endpoint, p256dh, auth) values ('forevervalbom','https://push.example/1','k','a')`);
  });
  assert.match(await falha(b, 'forevervalbom', `insert into public.vistos (conta, kind, at) values ('foreverbu','chat', now()) on conflict (conta, kind) do update set at = excluded.at`), /row-level security/);
  assert.match(await falha(b, 'forevervalbom', `insert into public.push_subs (conta, endpoint, p256dh, auth) values ('foreverbu','https://push.example/2','k','a')`), /row-level security/);
  assert.equal((await como(b, 'forevervalbom', (q) => q(`delete from public.push_subs where conta = 'foreverbu'`))).rowCount, 0);
  for (const t of ['pins', 'dispositivos', 'fg_meta', 'avisos_enviados']) assert.match(await falha(b, 'forevervalbom', `select * from public.${t}`), /permission denied/, t);
});

test('apagar exemplos: só linhas ex; só equipa', async () => {
  await como(b, 'forevervalbom', (q) => q(`insert into public.pecas (id, loja, cat, titulo, mat) values ('pkeep','valbom','aneis','Peça da equipa','Aço')`), { manter: true });
  await como(b, 'foreverfilipe', (q) => q(`insert into public.chat (id, autor, txt) values ('ckeep','foreverfilipe','Mensagem da equipa')`), { manter: true });
  assert.match(await falha(b, null, 'select public.fg_apagar_exemplos()'), /permission denied/);
  await como(b, 'foreverfilipe', (q) => q('select public.fg_apagar_exemplos()'), { manter: true });
  const n = async (t, w = '') => Number((await b.c.query(`select count(*) from public.${t} ${w}`)).rows[0].count);
  assert.equal(await n('pecas', 'where ex'), 0);
  assert.equal(await n('pecas'), 1, 'a peça criada pela equipa fica');
  assert.equal(await n('chat', 'where ex'), 0);
  assert.ok(await n('chat') >= 1);
  assert.equal(await n('cotacoes', 'where ex'), 0);
  assert.ok(await n('cotacoes') >= 1);
  assert.equal(await n('pub', 'where ex'), 0);
});
