-- Códigos de 4 dígitos: contagem de tentativas atómica (feita pelas Edge Functions com service_role).
-- Regra do protótipo: 5 tentativas erradas → bloqueio de 30 s, mensagens "Restam N tentativas".
-- A tentativa é reservada ANTES de se verificar o código, para pedidos em paralelo não furarem o limite.

create function public.fg_pin_reservar(p_conta text) returns jsonb
language plpgsql security definer set search_path = public, fg, pg_temp as $$
declare r public.pins%rowtype;
begin
  select * into r from public.pins where conta = p_conta for update;
  if not found then return jsonb_build_object('estado', 'sem_pin'); end if;
  if r.hash is null then return jsonb_build_object('estado', 'sem_pin'); end if;
  if r.bloqueado_ate is not null and r.bloqueado_ate > now() then
    return jsonb_build_object('estado', 'bloqueado', 'bloqueado_ate', r.bloqueado_ate);
  end if;
  update public.pins set tentativas = tentativas + 1 where conta = p_conta returning * into r;
  if r.tentativas > 5 then   -- cinco já em curso ao mesmo tempo: bloqueia
    update public.pins set bloqueado_ate = now() + interval '30 seconds', tentativas = 0 where conta = p_conta returning * into r;
    return jsonb_build_object('estado', 'bloqueado', 'bloqueado_ate', r.bloqueado_ate);
  end if;
  return jsonb_build_object('estado', 'ok', 'hash', r.hash);
end $$;

create function public.fg_pin_resultado(p_conta text, p_certo boolean) returns jsonb
language plpgsql security definer set search_path = public, fg, pg_temp as $$
declare r public.pins%rowtype;
begin
  if p_certo then
    update public.pins set tentativas = 0, bloqueado_ate = null where conta = p_conta;
    return jsonb_build_object('ok', true);
  end if;
  select * into r from public.pins where conta = p_conta for update;
  if r.tentativas >= 5 then
    update public.pins set bloqueado_ate = now() + interval '30 seconds', tentativas = 0 where conta = p_conta returning * into r;
    return jsonb_build_object('ok', false, 'restantes', 0, 'bloqueado_ate', r.bloqueado_ate);
  end if;
  return jsonb_build_object('ok', false, 'restantes', 5 - r.tentativas);
end $$;

revoke execute on function public.fg_pin_reservar(text), public.fg_pin_resultado(text, boolean) from public, anon, authenticated;
grant execute on function public.fg_pin_reservar(text), public.fg_pin_resultado(text, boolean) to service_role;
