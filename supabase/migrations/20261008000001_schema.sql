-- ForeverGold — esquema base.
-- Fuso de todas as regras de dia/mês: Europe/Lisbon.
-- Helpers internos ficam no schema fg (não exposto pela API); só as funções RPC ficam em public.

create schema if not exists fg;

-- ---------------------------------------------------------------- lojas e contas
create table public.lojas (
  id      text primary key,
  nome    text not null,
  zona    text not null,
  morada  text not null default '',
  horario text not null default '',
  tel     text not null default '',
  whats   text not null default '',
  email   text not null default '',
  ordem   smallint not null unique
);

-- Só contas da equipa. O "cliente" não tem conta: usa a chave anónima.
create table public.contas (
  id      text primary key,
  nome    text not null,
  tipo    text not null check (tipo in ('loja', 'equipa')),
  loja    text references public.lojas (id),
  pub     boolean not null default false,
  user_id uuid unique references auth.users (id) on delete set null,
  check ((tipo = 'loja') = (loja is not null))
);

-- ---------------------------------------------------------------- peças
create table public.pecas (
  id     text primary key,
  loja   text not null references public.lojas (id),
  cat    text not null check (cat in ('aneis', 'aliancas', 'fios', 'pulseiras', 'brincos', 'relogios', 'curso', 'religioso', 'outros')),
  titulo text not null check (char_length(btrim(titulo)) between 2 and 80),
  preco  numeric(10, 2) check (preco is null or (preco > 0 and preco <= 1000000)),
  mat    text not null check (mat in ('Ouro 19,2 kt', 'Ouro 18 kt', 'Ouro 14 kt', 'Ouro 9 kt', 'Prata 925', 'Bilaminado', 'Aço', 'Outro')),
  peso   numeric(8, 2) check (peso is null or (peso > 0 and peso <= 5000)),
  estado text not null default 'disponivel' check (estado in ('disponivel', 'reservada', 'vendida')),
  ex     boolean not null default false,
  at     timestamptz not null default now(),
  upd    timestamptz
);
create index pecas_loja_idx on public.pecas (loja);

create table public.peca_fotos (
  id   text primary key,
  peca text not null references public.pecas (id) on delete cascade,
  pos  smallint not null check (pos between 0 and 5),
  path text not null,
  unique (peca, pos) deferrable initially deferred
);
create index peca_fotos_peca_idx on public.peca_fotos (peca);

-- ---------------------------------------------------------------- chat
create table public.chat (
  id    text primary key,
  autor text not null references public.contas (id),
  at    timestamptz not null default now(),
  txt   text not null check (char_length(btrim(txt)) between 1 and 1000),
  urg   boolean not null default false,
  ex    boolean not null default false
);
create index chat_at_idx on public.chat (at);

-- ---------------------------------------------------------------- cotação diária
create table public.cotacoes (
  dia         date primary key,
  ouro_fino   numeric(10, 2) check (ouro_fino >= 100 and ouro_fino < 10000000),
  ouro_usado  numeric(10, 2) check (ouro_usado >= 100 and ouro_usado < 10000000),
  prata_fina  numeric(10, 2) check (prata_fina >= 100 and prata_fina < 10000000),
  prata_usada numeric(10, 2) check (prata_usada >= 100 and prata_usada < 10000000),
  nota        text not null default '' check (char_length(nota) <= 500),
  autor       text not null references public.contas (id),
  at          timestamptz not null default now(),
  edit        boolean not null default false,
  ex          boolean not null default false,
  check (coalesce(ouro_fino, ouro_usado, prata_fina, prata_usada) is not null)
);

-- ---------------------------------------------------------------- lucro do mês
create table public.lucro (
  ano   smallint not null,
  mes   smallint not null check (mes between 1 and 12),
  loja  text not null references public.lojas (id),
  valor numeric(12, 2) not null check (valor >= 0 and valor <= 5000000),
  autor text not null references public.contas (id),
  at    timestamptz not null default now(),
  primary key (ano, mes, loja)
);

-- ---------------------------------------------------------------- publicidade
create table public.pub (
  id         text primary key,
  autor      text not null references public.contas (id),
  at         timestamptz not null default now(),
  titulo     text not null check (char_length(btrim(titulo)) between 2 and 80),
  texto      text not null default '' check (char_length(texto) <= 2200),
  media_tipo text check (media_tipo in ('imagem', 'video')),
  media_id   text,
  media_nome text,
  media_path text,
  upd        timestamptz,
  ex         boolean not null default false,
  check (media_path is null or media_tipo is not null),
  check (btrim(texto) <> '' or media_path is not null)
);
create index pub_at_idx on public.pub (at);

create table public.pub_partilhas (
  pub   text not null references public.pub (id) on delete cascade,
  loja  text not null references public.lojas (id),
  conta text not null references public.contas (id),
  at    timestamptz not null default now(),
  primary key (pub, loja)
);

-- ---------------------------------------------------------------- vistos (para os contadores de "novas")
create table public.vistos (
  conta text not null references public.contas (id) on delete cascade,
  kind  text not null check (kind in ('chat', 'cot', 'pub', 'lucro')),
  at    timestamptz not null,
  primary key (conta, kind)
);

-- ---------------------------------------------------------------- códigos e dispositivos (só service_role)
create table public.pins (
  conta         text primary key references public.contas (id) on delete cascade,
  hash          text,                       -- null = "sem código" (primeira entrada, ou reposição à espera do novo código)
  tentativas    smallint not null default 0,
  bloqueado_ate timestamptz,
  bilhete_hash  text,                       -- bilhete de reposição (uso único) para escolher o novo código
  bilhete_ate   timestamptz,
  definido_em   timestamptz not null default now()
);

create table public.dispositivos (
  conta      text not null references public.contas (id) on delete cascade,
  token_hash text not null,
  criado     timestamptz not null default now(),
  ua         text,
  primary key (conta, token_hash)
);

-- ---------------------------------------------------------------- push
create table public.push_subs (
  id       uuid primary key default gen_random_uuid(),
  conta    text not null references public.contas (id) on delete cascade,
  endpoint text not null unique,
  p256dh   text not null,
  auth     text not null,
  ua       text,
  criado   timestamptz not null default now()
);
create index push_subs_conta_idx on public.push_subs (conta);

-- ---------------------------------------------------------------- controlo interno
create table public.fg_meta (
  chave text primary key,
  valor text
);

-- avisos de vencedoras já enviados (para nunca repetir)
create table public.avisos_enviados (
  chave      text primary key,   -- '2026-10' ou 'temporada-2026'
  enviado_em timestamptz not null default now()
);
