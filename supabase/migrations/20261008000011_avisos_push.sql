-- Avisos: tabela das vencedoras, gatilhos que chamam a Edge Function `notificar` (push) e o fecho de mês/temporada.

-- ---------------------------------------------------------------- avisos (vencedora do mês / da temporada)
create table public.avisos (
  id     text primary key,            -- 'mes-2026-10' ou 'temporada-2026'
  tipo   text not null check (tipo in ('mes', 'temporada')),
  titulo text not null,
  corpo  text not null,
  at     timestamptz not null default now()
);
alter table public.avisos enable row level security;
revoke all on public.avisos from anon, authenticated;   -- o Supabase dá privilégios por omissão a tabelas novas
grant select on public.avisos to authenticated;
create policy avisos_ler on public.avisos for select to authenticated using (fg.eh_equipa());

-- classificação para a função de envio (service_role): usa sempre o instante real
create function public.fg_classificacao_servico() returns jsonb
language sql stable security definer set search_path = public, fg, pg_temp as $$ select fg.classificacao(now()) $$;
revoke execute on function public.fg_classificacao_servico() from public, anon, authenticated;
grant execute on function public.fg_classificacao_servico() to service_role;

-- ---------------------------------------------------------------- subscrições push
-- Regista o telemóvel para a conta atual (move-o se estava registado noutra conta do mesmo telemóvel).
create function public.fg_push_registar(p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns void
language plpgsql security definer set search_path = public, fg, pg_temp as $$
begin
  if fg.conta() is null then raise exception 'Só a equipa recebe notificações.' using errcode = '42501'; end if;
  insert into public.push_subs (conta, endpoint, p256dh, auth, ua) values (fg.conta(), p_endpoint, p_p256dh, p_auth, p_ua)
  on conflict (endpoint) do update set conta = excluded.conta, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua;
end $$;
revoke execute on function public.fg_push_registar(text, text, text, text) from public, anon;
grant execute on function public.fg_push_registar(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- chamada à Edge Function
-- O endereço e o segredo partilhado guardam-se em fg_meta (ver README). Sem eles, ou sem pg_net, não faz nada.
create function fg.notificar(payload jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare u text; s text;
begin
  select valor into u from public.fg_meta where chave = 'notificar_url';
  select valor into s from public.fg_meta where chave = 'notificar_segredo';
  if u is null or s is null then return; end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return; end if;
  perform net.http_post(url := u, headers := jsonb_build_object('Content-Type', 'application/json', 'x-notificar-segredo', s), body := payload);
exception when others then
  null; -- uma falha de notificação nunca pode impedir a gravação
end $$;

create function fg.t_notif_chat() returns trigger language plpgsql as $$
begin
  if new.ex then return new; end if;
  perform fg.notificar(jsonb_build_object('tipo', 'chat', 'id', new.id)); return new;
end $$;
create trigger chat_notifica after insert on public.chat for each row execute function fg.t_notif_chat();

create function fg.t_notif_cot() returns trigger language plpgsql as $$
begin
  if new.ex then return new; end if;
  perform fg.notificar(jsonb_build_object('tipo', 'cot', 'dia', new.dia)); return new;
end $$;
create trigger cot_notifica after insert or update on public.cotacoes for each row execute function fg.t_notif_cot();

create function fg.t_notif_pub() returns trigger language plpgsql as $$
begin
  if new.ex then return new; end if;
  perform fg.notificar(jsonb_build_object('tipo', 'pub', 'id', new.id)); return new;
end $$;
create trigger pub_notifica after insert on public.pub for each row execute function fg.t_notif_pub();

-- ---------------------------------------------------------------- fecho de mês e de temporada
-- A Edge Function decide (e nunca repete: avisos_enviados) o que há a anunciar. Corre de hora a hora; é inofensiva se nada fechou.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    begin create extension if not exists pg_net; exception when others then null; end;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.schedule('fg-fecho', '5 * * * *', $c$select fg.notificar('{"tipo":"fecho"}'::jsonb)$c$);
    exception when others then null; end;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.avisos;
  end if;
end $$;
