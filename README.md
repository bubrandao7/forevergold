# ForeverGold

App da ForeverGold (clientes e equipa), instalável no telemóvel, com dados partilhados entre todos os telemóveis da equipa e notificações push.

O aspeto, os textos, as animações e o comportamento são os do protótipo em `referencia/`. Este projeto é só a camada técnica por baixo. Plano e decisões: `PLANO.md` e `DUVIDAS.md`.

| Parte | Estado |
|---|---|
| Ecrãs iguais ao protótipo (HTML e pixels, 390×844) | feito, testado |
| Dados partilhados (Supabase: base de dados, permissões, tempo real, ficheiros) | feito, testado em local; **falta testar no seu projeto Supabase** (secção 9) |
| Códigos de 4 dígitos no servidor | feito, testado em local |
| Notificações push | feito, testado em local; **falta testar num telemóvel a sério** (secção 9) |
| PWA instalável, abre sem rede | feito |
| Capacitor (App Store / Play Store) | preparado, não submetido (ver `FASE_D.md`) |

**Site público da loja** (montra, loja online por WhatsApp, lojas e contactos): pasta [`site/`](site/README.md), independente da app.

---

## Estado do projeto Supabase da ForeverGold

A cotação diária é em **€ por quilo** (ouro e prata, fino e lei). No projeto Supabase já criado, a conversão de gramas para quilos faz-se uma vez com `supabase/manual/02_cotacao_por_kg.sql`.

O projeto `xngfnysjvjnfgvxxcsnc` (Irlanda, plano gratuito) já tem a base de dados, as permissões, o Storage, o Realtime, as 5 Edge Functions e os 8 códigos criados. Foi preparado com o conector do Supabase e não com `supabase db push`, por isso **não corra `db push` neste projeto** (o histórico de migrações tem outros nomes e tentaria criar tudo outra vez). Para um projeto novo e vazio, siga as secções 2 a 6.

---

**Publicação (Vercel/Netlify):** o `vercel.json` e o `netlify.toml` compilam em modo `online`, que lê os valores públicos de `.env.online` (`VITE_FG_URL`, `VITE_FG_KEY`, `VITE_FG_VAPID`). Têm prioridade sobre as variáveis `VITE_SUPABASE_*` do alojamento, por isso não é preciso configurar variáveis no Vercel. Para outro projeto Supabase, edite `.env.online`.

## 1. Correr em local

Precisa de Node 20 ou mais recente.

```bash
npm install
npm run dev        # http://127.0.0.1:5173  (modo local: dados só neste navegador, como o protótipo)
```

Sem as variáveis `VITE_SUPABASE_*` (secção 5) a app corre em **modo local**: tudo fica no navegador. É o modo usado para desenvolver e para os testes visuais. Com as variáveis preenchidas, fala com o Supabase.

```bash
npm run build && npm run preview     # versão de produção, com service worker
```

## 2. Criar o projeto Supabase

1. Em <https://supabase.com> crie uma conta e um projeto novo. Região da União Europeia (por exemplo Paris ou Irlanda). Guarde a palavra-passe da base de dados.
2. Em **Project Settings › API** copie o **Project URL** e a chave **anon public**. A chave **service_role** nunca se cola em ficheiros do projeto nem se envia a ninguém: só entra nos *secrets* (passo 4).
3. Em **Authentication › Providers › Email**, desligue **Allow new users to sign up** (as contas da equipa são criadas pelo servidor; ninguém se regista sozinho).
4. Em **Database › Extensions**, ative `pg_net` e `pg_cron` (servem para enviar notificações e para anunciar a vencedora do mês).

**Plano gratuito:** cada ficheiro pode ter no máximo 50 MB e o total é 1 GB. Por isso, na app, o limite de vídeo de publicidade é 50 MB. Se um dia faltar espaço, é preciso subir de plano (ver os preços atuais no site do Supabase).

## 3. Instalar o Supabase CLI e ligar ao projeto

```bash
npm install -g supabase        # ou use: npx supabase ...
supabase login
supabase link --project-ref <REF>          # o REF está no URL do projeto: https://<REF>.supabase.co
supabase db push                           # cria tabelas, permissões (RLS), pontos do jogo, dados de exemplo, Storage, Realtime
```

O `db push` aplica por ordem todos os ficheiros de `supabase/migrations/`. Os dados de exemplo só entram se a base estiver vazia.

## 4. Segredos e Edge Functions

Gere valores aleatórios fortes (por exemplo `openssl rand -hex 32`) para `PIN_PEPPER`, `AUTH_SECRET`, `ADMIN_SECRET` e `NOTIFICAR_SEGREDO`, e as chaves das notificações:

```bash
npx web-push generate-vapid-keys           # dá uma chave pública e uma privada
```

```bash
supabase secrets set \
  PIN_PEPPER=<aleatório> AUTH_SECRET=<aleatório> ADMIN_SECRET=<aleatório> NOTIFICAR_SEGREDO=<aleatório> \
  VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:geralforevergold@gmail.com

supabase functions deploy entrar definir-pin repor-pin admin-repor-pin notificar
```

**Guarde estes valores num sítio seguro** (gestor de palavras-passe). Se perder o `PIN_PEPPER`, os códigos deixam de funcionar (repõem-se com o passo 6). O `ADMIN_SECRET` serve só para o passo 6.

Diga à base de dados para onde enviar as notificações. No **SQL Editor** do Supabase:

```sql
insert into public.fg_meta (chave, valor) values
  ('notificar_url',     'https://<REF>.supabase.co/functions/v1/notificar'),
  ('notificar_segredo', '<o mesmo valor de NOTIFICAR_SEGREDO>')
on conflict (chave) do update set valor = excluded.valor;
```

## 5. Variáveis de ambiente da app

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public>
VITE_VAPID_PUBLIC_KEY=<a chave pública do passo 4>
```

`.env` nunca vai para o repositório (já está no `.gitignore`). No Vercel/Netlify as mesmas três variáveis põem-se nas definições do projeto.

## 6. Código inicial das contas

Todas as contas da equipa começam com o mesmo código combinado (cada pessoa pode mudá-lo depois em Perfil › Mudar o meu código). Para o definir (no computador, com o `.env` e o `ADMIN_SECRET`):

```bash
ADMIN_SECRET=<o do passo 4> node tools/repor-pin.mjs todas --pin <código combinado>
```

Para repor o código de uma só conta (por exemplo, alguém trocou de telemóvel ou perdeu o acesso): `node tools/repor-pin.mjs foreverbu` (a pessoa escolhe um novo código na primeira entrada) ou com `--pin NNNN`. Isto também esquece os telemóveis associados à conta.

Como funciona o "Esqueci-me" na app: só é aceite no telemóvel onde essa conta já entrou. Em qualquer outro aparece «Este telemóvel não está associado a esta conta. Peça ao Filipe para repor o código.».

## 7. Publicar

**Vercel:** importe o repositório, framework *Vite*, comando `npm run build`, pasta `dist`; ponha as variáveis do passo 5. O `vercel.json` já trata do cache do service worker.

**Netlify:** *Add new site › Import from Git*; o `netlify.toml` já tem o comando e a pasta.

Em ambos, a app tem de ser servida por **HTTPS** (é o normal nestas plataformas), senão não há instalação nem notificações.

## 8. Instalar no telemóvel

- **iPhone (iOS 16.4 ou mais recente):** abrir o endereço no **Safari**, tocar em **Partilhar** (quadrado com seta), **Adicionar ao ecrã principal**, e abrir a app **a partir do ícone**. Só assim o iPhone permite notificações. Depois: Perfil › Ativar notificações.
- **Android:** abrir o endereço no Chrome e aceitar «Instalar app» (ou menu ⋮ › Instalar aplicação). Depois: Perfil › Ativar notificações.

## 9. Verificação depois de publicar (o que não se consegue testar fora do Supabase)

Os testes automáticos usam uma base Postgres e um PostgREST locais e um Realtime e um Storage simulados. Estas coisas só se confirmam no projeto a sério; faça uma vez:

1. **Tempo real:** com dois telemóveis (ou dois navegadores) com contas diferentes, enviar uma mensagem de chat de um para o outro. Deve aparecer sem recarregar.
2. **Fotografias:** na conta de uma loja, criar uma peça com fotografia; abrir como cliente (sem código) noutro navegador e ver a foto.
3. **Publicidade:** na conta `foreverbu`, publicar com imagem; numa conta de loja, ver e descarregar.
4. **Notificações:** num telemóvel com a app instalada e as notificações ativas, fechar a app e enviar um chat urgente de outra conta: deve chegar «Aviso urgente · Nome» e, ao tocar, abrir no Chat.
5. **Permissões:** como cliente, tentar abrir `https://<REF>.supabase.co/rest/v1/chat` com a chave anon: tem de recusar.

## 10. Testes automáticos

```bash
npm run test:visual      # protótipo vs app, ecrã a ecrã (HTML e pixels); cerca de 5 min
npm run test:sql         # migrações, permissões (RLS) e pontos do jogo contra o protótipo
npm run test:functions   # códigos, notificações, service worker
npm run test:e2e         # camada de dados contra PostgREST com RLS real
npm run test:servidor    # a app em modo servidor, em browser, com um e dois telemóveis
```

`test:sql`, `test:functions`, `test:e2e` e `test:servidor` precisam de: PostgreSQL 16 em `127.0.0.1:5432` (utilizador `postgres`, palavra-passe `postgres`), [PostgREST](https://github.com/PostgREST/postgrest/releases) em `/tmp/pgrst/postgrest` (ou variável `POSTGREST`) e [Deno](https://deno.com) em `/tmp/denobin/deno` (ou `DENO`). Sem PostgREST/Deno, os testes que dependem deles ficam marcados como *skipped*.

## 11. Regenerar peças geradas

| Comando | O que faz |
|---|---|
| `npm run convert` | Converte o template do protótipo em `src/ui/Template.jsx` e `src/ui/pseudo.css`. **Não editar esses dois ficheiros à mão.** |
| `node tools/gen-icons.mjs` | Ícones, `apple-touch-icon` e imagens de splash iOS em `public/` |
| `node tools/fetch-fonts.mjs` | Descarrega Bodoni Moda e Jost para `src/fonts/` (já estão no repositório) |
