-- RPC pública do ecrã de entrada: que contas já têm código e se estão bloqueadas.
-- Devolve só booleanos e uma hora. Alimenta setAcc() e vmLogin() antes de haver sessão.
create function public.fg_estado_contas() returns table (conta text, tem_pin boolean, bloqueado_ate timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, p.conta is not null,
         case when p.bloqueado_ate > now() then p.bloqueado_ate end
  from public.contas c left join public.pins p on p.conta = c.id
  order by c.id
$$;
revoke execute on function public.fg_estado_contas() from public;
grant execute on function public.fg_estado_contas() to anon, authenticated;

-- "Apagar os dados de exemplo" (Perfil): só a equipa. Devolve os caminhos de ficheiros a limpar no Storage.
create function public.fg_apagar_exemplos() returns jsonb
language plpgsql security definer set search_path = public, fg, pg_temp as $$
declare caminhos jsonb;
begin
  if not fg.eh_equipa() then raise exception 'Só a equipa.' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(path), '[]'::jsonb) into caminhos from (
    select f.path from public.peca_fotos f join public.pecas p on p.id = f.peca where p.ex
    union all select media_path from public.pub where ex and media_path is not null
  ) x;
  delete from public.pecas where ex;       -- fotos caem em cascata
  delete from public.chat where ex;
  delete from public.cotacoes where ex;
  delete from public.pub where ex;         -- partilhas caem em cascata
  return caminhos;
end $$;
revoke execute on function public.fg_apagar_exemplos() from public;
grant execute on function public.fg_apagar_exemplos() to authenticated;

-- ---------------------------------------------------------------- dados de exemplo (FGCore.seed)
-- Só carrega numa base vazia (sem peças, mensagens, cotações nem publicidade).
create function fg.seed() returns void language plpgsql security definer set search_path = public, fg, pg_temp as $$
declare
  s bigint := 20261007;               -- rng(20261007) do protótipo (LCG de 32 bits)
  r numeric;
  v double precision := 63.2;
  d date := fg.hoje_pt() - 1;
  n int := 0;
  quem text[] := array['forevervalbom', 'foreverriotinto', 'foreverfilipe', 'foreverstovidio'];
  pf double precision; pu double precision;
  dow int;
  i int;
  rnd double precision;
begin
  if exists (select 1 from public.pecas) or exists (select 1 from public.chat) or exists (select 1 from public.cotacoes) or exists (select 1 from public.pub) then
    return;
  end if;
  if exists (select 1 from public.fg_meta where chave = 'seed') then return; end if;
  perform set_config('fg.seeding', 'on', true);

  -- peças (PECAS_BASE); `at` = agora − (i+1) horas
  insert into public.pecas (id, loja, cat, titulo, preco, mat, peso, estado, ex, at)
  select 'pex' || (ord - 1), loja, cat, titulo, preco, mat, peso, estado, true, now() - make_interval(hours => ord::int)
  from (values
    (1,  'valbom',    'aliancas',  'Par de alianças clássicas',          420::numeric, 'Ouro 19,2 kt', 9.4::numeric, 'disponivel'),
    (2,  'valbom',    'relogios',  'Relógio clássico de senhora',        149, 'Aço',          28,   'reservada'),
    (3,  'valbom',    'pulseiras', 'Pulseira escrava em prata',          59,  'Prata 925',    18.5, 'disponivel'),
    (4,  'valbom',    'religioso', 'Medalha de Nossa Senhora de Fátima', 35,  'Prata 925',    3.2,  'vendida'),
    (5,  'stovidio',  'relogios',  'Relógio automático de homem',        289, 'Aço',          86,   'disponivel'),
    (6,  'stovidio',  'aneis',     'Aliança de noivado com pedra',       260, 'Ouro 19,2 kt', 3.1,  'disponivel'),
    (7,  'stovidio',  'fios',      'Fio bilaminado',                     45,  'Bilaminado',   6,    'disponivel'),
    (8,  'pedroucos', 'curso',     'Anel de curso de Direito',           null, 'Ouro 19,2 kt', null, 'disponivel'),
    (9,  'pedroucos', 'fios',      'Fio em prata, 50 cm',                39,  'Prata 925',    4.8,  'disponivel'),
    (10, 'pedroucos', 'religioso', 'Crucifixo com fio',                  49,  'Prata 925',    5.5,  'reservada'),
    (11, 'riotinto',  'aliancas',  'Par de alianças em prata',           75,  'Prata 925',    7,    'disponivel'),
    (12, 'riotinto',  'relogios',  'Relógio de bolso com corrente',      120, 'Aço',          64,   'disponivel'),
    (13, 'riotinto',  'pulseiras', 'Pulseira bilaminada',                38,  'Bilaminado',   5.2,  'vendida'),
    (14, 'arrifana',  'curso',     'Anel de curso de Enfermagem',        null, 'Ouro 19,2 kt', null, 'disponivel'),
    (15, 'arrifana',  'brincos',   'Brincos em prata',                   29,  'Prata 925',    2.4,  'disponivel'),
    (16, 'arrifana',  'religioso', 'Terço em prata',                     65,  'Prata 925',    12,   'disponivel')
  ) as t(ord, loja, cat, titulo, preco, mat, peso, estado);

  -- chat
  insert into public.chat (id, autor, at, txt, urg, ex) values
    ('cex1', 'foreverfilipe',  now() - interval '2 days 2 hours', 'Bom dia a todos. A partir de segunda-feira começamos a preparar as montras de Natal. Cada loja recebe o material durante a semana.', false, true),
    ('cex2', 'foreveroficina', now() - interval '1 day 5 hours',  'A balança grande da oficina está em calibração até quinta-feira. Até lá, as pesagens de ouro para compra fazem-se só nas lojas.', true, true),
    ('cex3', 'forevervalbom',  now() - interval '40 minutes',     'Recebido. Obrigada!', false, true);

  -- cotações: os 12 dias úteis anteriores a hoje, com o mesmo gerador do protótipo
  while n < 12 loop
    dow := extract(dow from d)::int;     -- 0 = domingo, 6 = sábado (igual a getDay())
    if dow <> 0 and dow <> 6 then
      s := (s * 1664525 + 1013904223) % 4294967296; rnd := s / 4294967296.0; pf := 0.86 + (rnd - 0.5) * 0.04;
      s := (s * 1664525 + 1013904223) % 4294967296; rnd := s / 4294967296.0; pu := 0.71 + (rnd - 0.5) * 0.04;
      insert into public.cotacoes (dia, ouro_fino, ouro_usado, prata_fina, prata_usada, nota, autor, at, ex)
      values (d,
              floor(v * 100 + 0.5) / 100, floor(v * 0.915 * 100 + 0.5) / 100,
              floor(pf * 100 + 0.5) / 100, floor(pu * 100 + 0.5) / 100,
              '', quem[(n % 4) + 1], (d + time '09:00' + make_interval(mins => 20 + n)) at time zone 'Europe/Lisbon', true);
      s := (s * 1664525 + 1013904223) % 4294967296; rnd := s / 4294967296.0;
      v := v - (rnd - 0.45) * 0.9;
      n := n + 1;
    end if;
    d := d - 1;
  end loop;

  -- publicidade
  insert into public.pub (id, autor, at, titulo, texto, ex) values
    ('uex1', 'foreverbu', now() - interval '3 hours', 'Compra de ouro · outubro',
     E'Tem ouro parado na gaveta? Anéis que já não usa, fios partidos, alianças antigas. Traga-os a uma loja Forevergold: avaliamos cada peça pelo peso e pelo toque e dizemos-lhe quanto vale. A decisão é sempre sua.\n\n#forevergold #ouro #prata #gondomar #porto', true);

  -- vistos iniciais de cada conta da equipa
  insert into public.vistos (conta, kind, at)
  select c.id, k.kind, now() - k.atras
  from public.contas c,
       (values ('chat', interval '2 days'), ('cot', interval '2 days'), ('pub', interval '4 hours'), ('lucro', interval '2 days')) as k(kind, atras);

  insert into public.fg_meta (chave, valor) values ('seed', 'ok');
end $$;

select fg.seed();
