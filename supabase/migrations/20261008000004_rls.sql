-- Permissões: a regra vive aqui (RLS), não só no ecrã.
-- Papéis: anon = cliente; authenticated = equipa (cada conta tem uma linha em public.contas).

alter table public.lojas          enable row level security;
alter table public.contas         enable row level security;
alter table public.pecas          enable row level security;
alter table public.peca_fotos     enable row level security;
alter table public.chat           enable row level security;
alter table public.cotacoes       enable row level security;
alter table public.lucro          enable row level security;
alter table public.pub            enable row level security;
alter table public.pub_partilhas  enable row level security;
alter table public.vistos         enable row level security;
alter table public.pins           enable row level security;
alter table public.dispositivos   enable row level security;
alter table public.push_subs      enable row level security;
alter table public.fg_meta        enable row level security;
alter table public.avisos_enviados enable row level security;

-- Privilégios: partir de zero e dar só o necessário (as políticas filtram o resto).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.lojas, public.pecas, public.peca_fotos to anon, authenticated;
grant select on public.contas, public.chat, public.cotacoes, public.lucro, public.pub, public.pub_partilhas, public.vistos to authenticated;
grant update (morada, horario, tel, whats, email) on public.lojas to authenticated;
grant insert, update, delete on public.pecas, public.peca_fotos to authenticated;
grant insert on public.chat to authenticated;
grant insert, update on public.cotacoes to authenticated;
grant insert, update on public.lucro to authenticated;
grant insert, update, delete on public.pub to authenticated;
grant insert, delete on public.pub_partilhas to authenticated;
grant insert, update on public.vistos to authenticated;
grant select, insert, delete on public.push_subs to authenticated;

-- ------------------------------------------------ lojas e peças: o cliente lê; a loja dona escreve
create policy lojas_ler on public.lojas for select to anon, authenticated using (true);
create policy lojas_editar on public.lojas for update to authenticated
  using (id = fg.loja()) with check (id = fg.loja());

create policy pecas_ler on public.pecas for select to anon, authenticated using (true);
create policy pecas_inserir on public.pecas for insert to authenticated with check (loja = fg.loja());
create policy pecas_editar on public.pecas for update to authenticated
  using (loja = fg.loja()) with check (loja = fg.loja());
create policy pecas_apagar on public.pecas for delete to authenticated using (loja = fg.loja());

create policy fotos_ler on public.peca_fotos for select to anon, authenticated using (true);
create policy fotos_inserir on public.peca_fotos for insert to authenticated
  with check (exists (select 1 from public.pecas p where p.id = peca and p.loja = fg.loja()));
create policy fotos_editar on public.peca_fotos for update to authenticated
  using (exists (select 1 from public.pecas p where p.id = peca and p.loja = fg.loja()))
  with check (exists (select 1 from public.pecas p where p.id = peca and p.loja = fg.loja()));
create policy fotos_apagar on public.peca_fotos for delete to authenticated
  using (exists (select 1 from public.pecas p where p.id = peca and p.loja = fg.loja()));

-- ------------------------------------------------ só equipa
create policy contas_ler on public.contas for select to authenticated using (fg.eh_equipa());

create policy chat_ler on public.chat for select to authenticated using (fg.eh_equipa());
create policy chat_enviar on public.chat for insert to authenticated with check (autor = fg.conta());

create policy cot_ler on public.cotacoes for select to authenticated using (fg.eh_equipa());
create policy cot_inserir on public.cotacoes for insert to authenticated with check (autor = fg.conta());
create policy cot_editar on public.cotacoes for update to authenticated
  using (fg.eh_equipa()) with check (autor = fg.conta());

create policy lucro_ler on public.lucro for select to authenticated using (fg.eh_equipa());
create policy lucro_inserir on public.lucro for insert to authenticated
  with check (loja = fg.loja() and autor = fg.conta());
create policy lucro_editar on public.lucro for update to authenticated
  using (loja = fg.loja()) with check (loja = fg.loja() and autor = fg.conta());

create policy pub_ler on public.pub for select to authenticated using (fg.eh_equipa());
create policy pub_criar on public.pub for insert to authenticated with check (fg.eh_bu() and autor = fg.conta());
create policy pub_editar on public.pub for update to authenticated using (fg.eh_bu()) with check (fg.eh_bu());
create policy pub_apagar on public.pub for delete to authenticated using (fg.eh_bu());

create policy partilhas_ler on public.pub_partilhas for select to authenticated using (fg.eh_equipa());
create policy partilhas_marcar on public.pub_partilhas for insert to authenticated
  with check (loja = fg.loja() and conta = fg.conta());
create policy partilhas_desmarcar on public.pub_partilhas for delete to authenticated using (loja = fg.loja());

create policy vistos_ler on public.vistos for select to authenticated using (conta = fg.conta());
create policy vistos_inserir on public.vistos for insert to authenticated with check (conta = fg.conta());
create policy vistos_editar on public.vistos for update to authenticated
  using (conta = fg.conta()) with check (conta = fg.conta());

create policy push_ler on public.push_subs for select to authenticated using (conta = fg.conta());
create policy push_inserir on public.push_subs for insert to authenticated with check (conta = fg.conta());
create policy push_apagar on public.push_subs for delete to authenticated using (conta = fg.conta());

-- pins, dispositivos, fg_meta, avisos_enviados: sem políticas = ninguém (só service_role, que ignora RLS)

-- fg.* usado nas políticas tem de ser executável por quem pede
grant usage on schema fg to anon, authenticated, service_role;
grant execute on all functions in schema fg to anon, authenticated, service_role;
