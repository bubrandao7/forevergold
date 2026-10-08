-- Funções com `delete`: o conector do Supabase pede confirmação a quem tem a conta antes de as correr,
-- por isso colam-se uma vez no SQL Editor do Supabase (Run). São as mesmas das migrações 7 e 8.
-- Seguro correr mais de uma vez? Não: se já existirem, dá erro «already exists» (e não faz mal).

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


-- Guardar peça (nova ou editada) com a lista ordenada de fotografias.
-- p = { id, loja, cat, titulo, preco, mat, peso, estado, fotos: [{id, path}, ...] }
-- Devolve { removidas: [paths a apagar do Storage] }.
create function public.fg_guardar_peca(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public, fg, pg_temp as $$
declare
  pid text := p ->> 'id';
  ids text[];
  removidas text[];
  f jsonb;
  i int := 0;
begin
  insert into public.pecas (id, loja, cat, titulo, preco, mat, peso, estado)
  values (pid, p ->> 'loja', p ->> 'cat', p ->> 'titulo', nullif(p ->> 'preco', '')::numeric, p ->> 'mat', nullif(p ->> 'peso', '')::numeric, coalesce(p ->> 'estado', 'disponivel'))
  on conflict (id) do update set
    cat = excluded.cat, titulo = excluded.titulo, preco = excluded.preco, mat = excluded.mat,
    peso = excluded.peso, estado = excluded.estado, ex = false;

  select coalesce(array_agg(x ->> 'id'), '{}') into ids from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) x;
  if cardinality(ids) > 6 then raise exception 'Cada peça pode ter até 6 fotografias.' using errcode = '22023'; end if;

  select coalesce(array_agg(path), '{}') into removidas from public.peca_fotos where peca = pid and id <> all (ids);
  delete from public.peca_fotos where peca = pid and id <> all (ids);

  for f in select * from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) loop
    insert into public.peca_fotos (id, peca, pos, path) values (f ->> 'id', pid, i, f ->> 'path')
    on conflict (id) do update set pos = excluded.pos, path = excluded.path;
    i := i + 1;
  end loop;
  return jsonb_build_object('removidas', to_jsonb(removidas));
end $$;
revoke execute on function public.fg_guardar_peca(jsonb) from public;
grant execute on function public.fg_guardar_peca(jsonb) to authenticated;

-- Apagar peça: devolve os caminhos das fotografias para limpar do Storage.
create function public.fg_apagar_peca(pid text) returns jsonb
language plpgsql security invoker set search_path = public, fg, pg_temp as $$
declare caminhos text[]; n int;
begin
  select coalesce(array_agg(path), '{}') into caminhos from public.peca_fotos where peca = pid;
  delete from public.pecas where id = pid;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Peça não encontrada ou sem permissão.' using errcode = '42501'; end if;
  return to_jsonb(caminhos);
end $$;
revoke execute on function public.fg_apagar_peca(text) from public;
grant execute on function public.fg_apagar_peca(text) to authenticated;


-- limpeza de um teste meu
drop function if exists public.fg_teste_diag();

-- fechar a porta ao visitante sem sessão (o Supabase dá estas permissões por omissão)
revoke execute on function public.fg_apagar_exemplos() from anon;
revoke execute on function public.fg_guardar_peca(jsonb) from anon;
revoke execute on function public.fg_apagar_peca(text) from anon;
