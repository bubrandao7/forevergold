-- Cotação diária: de preço por grama para preço por quilo (x1000), só no projeto Supabase já criado.
-- Cole TUDO num "New query" do SQL Editor e carregue em Run. Pode correr-se mais do que uma vez sem estragar nada.
-- (Projetos novos já nascem assim: ver supabase/migrations/..._schema.sql e ..._rpc_seed.sql.)
begin;

alter table public.cotacoes drop constraint if exists cotacoes_ouro_fino_check;
alter table public.cotacoes drop constraint if exists cotacoes_ouro_usado_check;
alter table public.cotacoes drop constraint if exists cotacoes_prata_fina_check;
alter table public.cotacoes drop constraint if exists cotacoes_prata_usada_check;

alter table public.cotacoes
  alter column ouro_fino   type numeric(10, 2),
  alter column ouro_usado  type numeric(10, 2),
  alter column prata_fina  type numeric(10, 2),
  alter column prata_usada type numeric(10, 2);

-- Sem estes dois gatilhos o "x1000" não marca as cotações como "corrigidas", não muda a hora e não envia notificações.
alter table public.cotacoes disable trigger cot_guard;
alter table public.cotacoes disable trigger cot_notifica;

update public.cotacoes set
  ouro_fino   = case when ouro_fino   < 1000 then round(ouro_fino   * 1000, 2) else ouro_fino   end,
  ouro_usado  = case when ouro_usado  < 1000 then round(ouro_usado  * 1000, 2) else ouro_usado  end,
  prata_fina  = case when prata_fina  < 1000 then round(prata_fina  * 1000, 2) else prata_fina  end,
  prata_usada = case when prata_usada < 1000 then round(prata_usada * 1000, 2) else prata_usada end;

alter table public.cotacoes enable trigger cot_guard;
alter table public.cotacoes enable trigger cot_notifica;

alter table public.cotacoes add constraint cotacoes_ouro_fino_check   check (ouro_fino   >= 100 and ouro_fino   < 10000000);
alter table public.cotacoes add constraint cotacoes_ouro_usado_check  check (ouro_usado  >= 100 and ouro_usado  < 10000000);
alter table public.cotacoes add constraint cotacoes_prata_fina_check  check (prata_fina  >= 100 and prata_fina  < 10000000);
alter table public.cotacoes add constraint cotacoes_prata_usada_check check (prata_usada >= 100 and prata_usada < 10000000);

commit;

-- Confirmação: deve mostrar valores como 63200.00 (ouro) e 860.00 (prata).
select dia, ouro_fino, ouro_usado, prata_fina, prata_usada, edit from public.cotacoes order by dia desc limit 5;
