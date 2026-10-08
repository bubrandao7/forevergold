-- Simula o mínimo do Supabase para testar as migrações numa base Postgres normal.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- como no Supabase, o service_role tem acesso total (ignora RLS por bypassrls)
alter default privileges in schema public grant all on tables to service_role;
grant all on all tables in schema public to service_role;

-- papel de ligação do PostgREST (como o `authenticator` do Supabase)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login password 'authenticator' noinherit; end if;
end $$;
grant anon, authenticated to authenticator;
