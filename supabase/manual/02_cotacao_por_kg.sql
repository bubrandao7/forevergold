-- Cotação diária: de preço por grama para preço por quilo (x1000), só no projeto Supabase já criado.
-- Cole TUDO num "New query" do SQL Editor e carregue em Run. Só converte uma vez: se for corrido de novo, não faz nada.
-- (Projetos novos já nascem assim: ver supabase/migrations/..._schema.sql e ..._rpc_seed.sql.)
do $$
begin
  -- precisão 6 = formato antigo (por grama); 10 = já convertido
  if (select numeric_precision from information_schema.columns
       where table_schema = 'public' and table_name = 'cotacoes' and column_name = 'ouro_fino') <> 6 then
    raise notice 'Já estava convertido. Nada a fazer.';
    return;
  end if;

  alter table public.cotacoes drop constraint if exists cotacoes_ouro_fino_check;
  alter table public.cotacoes drop constraint if exists cotacoes_ouro_usado_check;
  alter table public.cotacoes drop constraint if exists cotacoes_prata_fina_check;
  alter table public.cotacoes drop constraint if exists cotacoes_prata_usada_check;

  alter table public.cotacoes
    alter column ouro_fino   type numeric(10, 2),
    alter column ouro_usado  type numeric(10, 2),
    alter column prata_fina  type numeric(10, 2),
    alter column prata_usada type numeric(10, 2);

  -- Sem estes dois gatilhos, o "x1000" marcaria as cotações como "corrigidas", mudaria a hora e enviaria notificações.
  alter table public.cotacoes disable trigger cot_guard;
  alter table public.cotacoes disable trigger cot_notifica;

  update public.cotacoes set
    ouro_fino   = round(ouro_fino   * 1000, 2),
    ouro_usado  = round(ouro_usado  * 1000, 2),
    prata_fina  = round(prata_fina  * 1000, 2),
    prata_usada = round(prata_usada * 1000, 2);

  alter table public.cotacoes enable trigger cot_guard;
  alter table public.cotacoes enable trigger cot_notifica;

  alter table public.cotacoes add constraint cotacoes_ouro_fino_check   check (ouro_fino   >= 100 and ouro_fino   < 10000000);
  alter table public.cotacoes add constraint cotacoes_ouro_usado_check  check (ouro_usado  >= 100 and ouro_usado  < 10000000);
  alter table public.cotacoes add constraint cotacoes_prata_fina_check  check (prata_fina  >= 100 and prata_fina  < 10000000);
  alter table public.cotacoes add constraint cotacoes_prata_usada_check check (prata_usada >= 100 and prata_usada < 10000000);
end $$;

-- Confirmação: deve mostrar valores como 63200.00 (ouro) e 860.00 (prata).
select dia, ouro_fino, ouro_usado, prata_fina, prata_usada, edit from public.cotacoes order by dia desc limit 5;
