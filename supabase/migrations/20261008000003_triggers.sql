-- Triggers: o servidor decide as horas e protege campos que o cliente não deve mexer.

-- Hora do servidor em tudo o que tem `at` (evita relógios desacertados nos telemóveis).
create function fg.t_at_servidor() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and coalesce(current_setting('fg.seeding', true), '') <> 'on' then new.at := now(); end if;
  return new;
end $$;

create trigger chat_at before insert on public.chat for each row execute function fg.t_at_servidor();
create trigger pub_at before insert on public.pub for each row execute function fg.t_at_servidor();
create trigger pecas_at before insert on public.pecas for each row execute function fg.t_at_servidor();
create trigger partilhas_at before insert on public.pub_partilhas for each row execute function fg.t_at_servidor();

-- Exemplos: só a função de seed (que ativa fg.seeding) pode criar linhas com ex = true;
-- uma linha nunca volta a ser exemplo depois de editada.
create function fg.t_ex() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.ex and coalesce(current_setting('fg.seeding', true), '') <> 'on' then new.ex := false; end if;
  elsif new.ex and not old.ex then
    new.ex := false;
  end if;
  return new;
end $$;
create trigger pecas_ex before insert or update on public.pecas for each row execute function fg.t_ex();
create trigger chat_ex before insert or update on public.chat for each row execute function fg.t_ex();
create trigger cot_ex before insert or update on public.cotacoes for each row execute function fg.t_ex();
create trigger pub_ex before insert or update on public.pub for each row execute function fg.t_ex();

-- Peças: a loja e a data de criação não mudam; cada alteração marca `upd`.
create function fg.t_pecas_upd() returns trigger language plpgsql as $$
begin
  new.loja := old.loja; new.at := old.at; new.upd := now();
  return new;
end $$;
create trigger pecas_upd before update on public.pecas for each row execute function fg.t_pecas_upd();

-- Lojas: só morada, horário, telefone, WhatsApp e email se alteram.
create function fg.t_lojas_guard() returns trigger language plpgsql as $$
begin
  if new.id <> old.id or new.nome <> old.nome or new.zona <> old.zona or new.ordem <> old.ordem then
    raise exception 'Só a morada, o horário, o telefone, o WhatsApp e o email podem mudar.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger lojas_guard before update on public.lojas for each row execute function fg.t_lojas_guard();

-- Cotação: hora do servidor; o dia não pode ser futuro (Lisboa); reescrever = "corrigida".
create function fg.t_cot() returns trigger language plpgsql as $$
begin
  if new.dia > fg.hoje_pt() then
    raise exception 'A cotação de um dia futuro não pode ser escrita.' using errcode = '22023';
  end if;
  if coalesce(current_setting('fg.seeding', true), '') <> 'on' then new.at := now(); end if;
  new.edit := (tg_op = 'UPDATE');
  new.nota := coalesce(new.nota, '');
  return new;
end $$;
create trigger cot_guard before insert or update on public.cotacoes for each row execute function fg.t_cot();

-- Lucro: hora do servidor; só o mês corrente (Lisboa) e só a partir do início do jogo.
create function fg.t_lucro() returns trigger language plpgsql as $$
begin
  if new.ano <> fg.ano_pt(now()) or new.mes <> fg.mes_pt(now()) then
    raise exception 'Só se regista o lucro do mês corrente.' using errcode = '22023';
  end if;
  if not fg.em_jogo(new.ano, new.mes) then
    raise exception 'O jogo ainda não começou.' using errcode = '22023';
  end if;
  new.at := now();
  return new;
end $$;
create trigger lucro_guard before insert or update on public.lucro for each row execute function fg.t_lucro();

-- Publicidade: a data, o autor e o exemplo não mudam; edição marca `upd`.
create function fg.t_pub_upd() returns trigger language plpgsql as $$
begin
  new.at := old.at; new.autor := old.autor; new.upd := now();
  return new;
end $$;
create trigger pub_upd before update on public.pub for each row execute function fg.t_pub_upd();

-- Partilhas: só no próprio mês da publicidade (inserir e apagar), pela loja da conta.
create function fg.t_partilhas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    -- se a própria publicidade está a ser apagada (em cascata), os vistos saem com ela, em qualquer mês
    if exists (select 1 from public.pub where id = old.pub) and not fg.pub_do_mes_corrente(old.pub) then
      raise exception 'Os vistos desse mês já fecharam.' using errcode = '22023';
    end if;
    return old;
  end if;
  if not fg.pub_do_mes_corrente(new.pub) then
    raise exception 'Os vistos desse mês já fecharam.' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger partilhas_guard before insert or delete on public.pub_partilhas for each row execute function fg.t_partilhas();
