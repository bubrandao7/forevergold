-- Funções de apoio (schema fg): identidade, tempo em Lisboa, regras do jogo.

-- Início do jogo (FGCore.INICIO): outubro de 2026
create function fg.em_jogo(ano int, mes int) returns boolean
language sql immutable as $$ select ano * 12 + mes >= 2026 * 12 + 10 $$;

create function fg.agora_pt() returns timestamp
language sql stable as $$ select now() at time zone 'Europe/Lisbon' $$;

create function fg.hoje_pt() returns date
language sql stable as $$ select (now() at time zone 'Europe/Lisbon')::date $$;

-- (ano, mês) de um instante, em Lisboa
create function fg.ano_pt(t timestamptz) returns int
language sql immutable as $$ select extract(year from t at time zone 'Europe/Lisbon')::int $$;
create function fg.mes_pt(t timestamptz) returns int
language sql immutable as $$ select extract(month from t at time zone 'Europe/Lisbon')::int $$;

-- Identidade: a linha de contas que corresponde a quem fez o pedido (null para o cliente anónimo)
create function fg.conta() returns text
language sql stable security definer set search_path = public, pg_temp as
$$ select id from public.contas where user_id = auth.uid() $$;

create function fg.loja() returns text
language sql stable security definer set search_path = public, pg_temp as
$$ select loja from public.contas where user_id = auth.uid() $$;

create function fg.eh_bu() returns boolean
language sql stable security definer set search_path = public, pg_temp as
$$ select coalesce((select pub from public.contas where user_id = auth.uid()), false) $$;

create function fg.eh_equipa() returns boolean
language sql stable security definer set search_path = public, pg_temp as
$$ select exists (select 1 from public.contas where user_id = auth.uid()) $$;

-- A publicidade é do mês corrente (Lisboa)? Usado nas partilhas.
create function fg.pub_do_mes_corrente(pub_id text) returns boolean
language sql stable security definer set search_path = public, pg_temp as
$$ select exists (
     select 1 from public.pub p
     where p.id = pub_id
       and fg.ano_pt(p.at) = fg.ano_pt(now()) and fg.mes_pt(p.at) = fg.mes_pt(now())
   ) $$;
