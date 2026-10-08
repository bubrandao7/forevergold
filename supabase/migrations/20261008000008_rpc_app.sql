-- Operações atómicas usadas pela app (correm com as permissões de quem pede: a RLS aplica-se).

-- Hora do servidor, para a app medir o desacerto do relógio do telemóvel.
create function public.fg_agora() returns timestamptz language sql stable as $$ select now() $$;
revoke execute on function public.fg_agora() from public;
grant execute on function public.fg_agora() to anon, authenticated;

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

-- "Visto" com a hora do servidor (evita relógios desacertados nos telemóveis).
create function fg.t_vistos() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('fg.seeding', true), '') <> 'on' then new.at := now(); end if;
  return new;
end $$;
create trigger vistos_at before insert or update on public.vistos for each row execute function fg.t_vistos();
