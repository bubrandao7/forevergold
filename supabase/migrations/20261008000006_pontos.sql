-- Classificação do jogo "Lucro do mês". UMA função alimenta o ecrã: o cliente não repete a regra.
--
-- Regras (BRIEFING.md e standings()/winners() do protótipo):
--  * só contam as cinco lojas, e só a partir de outubro de 2026 (fg.em_jogo);
--  * 1 ponto por cada 1 000 € do lucro registado no mês;
--  * +1 ponto por mês se a loja marcou como partilhadas TODAS as publicidades desse mês,
--    dentro do próprio mês (e há pelo menos uma publicidade nesse mês);
--  * temporada = ano civil: cada ano tem a sua classificação;
--  * empates: ficam pela ordem fixa das lojas (valbom, stovidio, pedroucos, riotinto, arrifana).
--
-- Devolve: { "anos": [anos com lucro], "ANO": { "std": [...], "winners": [...] } } com a mesma forma
-- que standings(y) e winners(y) tinham no protótipo.

-- A regra vive em fg.classificacao(agora), com o instante como parâmetro para poder ser testada.
-- A função pública usa sempre o instante real.
create function fg.classificacao(agora timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public, fg, pg_temp as $$
declare
  cy int := fg.ano_pt(agora);
  cm int := fg.mes_pt(agora);
  out jsonb := '{}'::jsonb;
  y int;
begin
  for y in 2026 .. cy loop
    out := out || jsonb_build_object(y::text, (
      with meses as (select generate_series(1, 12) as m),
      cel as (
        select l.id as loja, l.nome, l.ordem, me.m,
               fg.em_jogo(y, me.m) as jogo
        from public.lojas l cross join meses me
      ),
      cel2 as (
        select c.*,
               case when c.jogo then (select x.valor from public.lucro x where x.ano = y and x.mes = c.m and x.loja = c.loja) end as v,
               case when c.jogo then (select count(*) from public.pub p where fg.ano_pt(p.at) = y and fg.mes_pt(p.at) = c.m) else 0 end as total,
               case when c.jogo then (select count(*) from public.pub p
                                       join public.pub_partilhas pp on pp.pub = p.id and pp.loja = c.loja
                                      where fg.ano_pt(p.at) = y and fg.mes_pt(p.at) = c.m
                                        and fg.ano_pt(pp.at) = y and fg.mes_pt(pp.at) = c.m) else 0 end as sh
        from cel c
      ),
      cel3 as (
        select *, case when total > 0 and sh = total then 1 else 0 end as b from cel2
      ),
      tot as (
        select loja, nome, ordem,
               coalesce(sum(v) / 1000, 0) as lp,
               sum(b) as bonus,
               coalesce(sum(v) / 1000, 0) + sum(b) as pts,
               jsonb_object_agg(m::text, jsonb_build_object('v', v, 'b', b, 'sh', sh, 'total', total)) as meses
        from cel3 group by loja, nome, ordem
      ),
      vm as (
        select m, max(coalesce(v, 0) / 1000 + b) as maxpts from cel3 group by m
      )
      select jsonb_build_object(
        'std', (select jsonb_agg(jsonb_build_object('id', loja, 'nome', nome, 'lp', lp, 'bonus', bonus, 'pts', pts, 'meses', meses) order by pts desc, ordem) from tot),
        'winners', (
          select jsonb_agg(jsonb_build_object(
            'm', vm.m,
            'st', case when not fg.em_jogo(y, vm.m) then 'fora'
                       when y < cy or (y = cy and vm.m < cm) then 'fechado'
                       when y = cy and vm.m = cm then 'jogo'
                       else 'futuro' end,
            'ids',   coalesce((select jsonb_agg(c.loja order by c.ordem) from cel3 c where c.m = vm.m and vm.maxpts > 0 and coalesce(c.v, 0) / 1000 + c.b = vm.maxpts), '[]'::jsonb),
            'nomes', coalesce((select jsonb_agg(c.nome order by c.ordem) from cel3 c where c.m = vm.m and vm.maxpts > 0 and coalesce(c.v, 0) / 1000 + c.b = vm.maxpts), '[]'::jsonb),
            'pts',   vm.maxpts) order by vm.m)
          from vm)
      )
    ));
  end loop;

  out := out || jsonb_build_object('anos', coalesce((select jsonb_agg(distinct ano order by ano) from public.lucro), '[]'::jsonb));
  return out;
end $$;

create function public.fg_classificacao() returns jsonb
language plpgsql stable security definer set search_path = public, fg, pg_temp as $$
begin
  if not fg.eh_equipa() then
    raise exception 'Só a equipa vê a classificação.' using errcode = '42501';
  end if;
  return fg.classificacao(now());
end $$;

revoke execute on function public.fg_classificacao() from public, anon;
grant execute on function public.fg_classificacao() to authenticated;

revoke execute on function fg.classificacao(timestamptz) from public, anon, authenticated;
grant execute on function fg.classificacao(timestamptz) to service_role;
