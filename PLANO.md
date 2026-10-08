# ForeverGold — plano técnico

Estado: **Fases A, B e C feitas e testadas em local** (ver `README.md` para o estado e para o que falta confirmar no Supabase a sério). Fase D (Capacitor) só se for pedida.
Decisões da Bu e pontos em aberto: ver `DUVIDAS.md`. Algumas escolhas mudaram em relação a este plano depois das respostas da Bu (lucro sem notificação, vencedoras, hora de Lisboa, 50 MB, código inicial igual); o `DUVIDAS.md` tem a lista.

Regra de ouro: aspeto, textos, animações e comportamento = protótipo (`referencia/`). Só se muda a camada técnica por baixo.

---

## 0. O que aprendi ao ler o protótipo (e que molda o plano)

1. O `.dc.html` corre sobre um runtime que é **React por baixo** (`support.js` usa `createElement`). Logo, `onChange` já é o `onChange` do React (dispara a cada tecla) e os `<input value=…>` já são controlados. A conversão para JSX é quase direta.
2. O runtime faz **três coisas invisíveis** que mudam o DOM, e que o JSX tem de repetir para o resultado ser idêntico:
   - cada `{{ valor }}` dentro de texto é embrulhado em `<span class="sc-interp">` (importa em contentores `flex`, onde cada `span` vira um item);
   - `style="…"` é convertido de texto para objeto (`cssToObj`);
   - `style-active|hover|focus="…"` vira uma classe `scpN` com a regra `.scpN:active{… !important}`.
3. Todas as expressões `{{ }}` do template são **caminhos simples** (`a.b.c`). Não há expressões complicadas. Isto torna a conversão mecânica segura.
4. `commit(fn)` é **síncrono** e vários sítios fazem `if (!this.commit(...)) return;`. Com servidor, isto passa a atualização otimista (aplica `fn` já, envia depois, reverte se falhar) e o resto da classe quase não muda.
5. `vmLogin` precisa de saber **antes de haver sessão** se a conta já tem código (`data.pins[id]`) e se está bloqueada. Isto exige uma função pública que devolve só booleanos e a hora de fim do bloqueio.
6. Há pontos do jogo a serem calculados no cliente (`standings`, `winners`, bónus) → passam para SQL (secção 4).

---

## 1. Estrutura de pastas

```
forevergold/
├─ referencia/                  protótipo, NÃO se toca
├─ PLANO.md  DUVIDAS.md  README.md
├─ package.json  vite.config.js  index.html  .env.example
├─ public/                      ícones, splash iOS, apple-touch-icon (gerados)
├─ src/
│  ├─ main.jsx                  entrada: fontes, CSS, core, assets, monta <App/>
│  ├─ App.jsx                   classe Component copiada tal e qual; render() → <Template vals={this.renderVals()} />
│  ├─ ui/
│  │  ├─ Template.jsx           GERADO por tools/dc2jsx.mjs (nunca se edita à mão)
│  │  ├─ pseudo.css             GERADO: regras de style-active/hover/focus
│  │  └─ global.css             o <style> do helmet, copiado
│  ├─ core/
│  │  ├─ fg-core.js             utilitários e constantes (cópia). Fase A: com localStorage. Fase B: db/media passam a src/data
│  │  └─ fg-assets.js           FG_LOGO e FG_GLIFOS, cópia exata
│  ├─ data/                     (Fase B)
│  │  ├─ supabase.js            cliente
│  │  ├─ repo.js                operações por entidade
│  │  ├─ realtime.js            subscrições → aplica deltas a this.data
│  │  ├─ media.js               Storage + comprimeImagem
│  │  └─ auth.js                entrar / definirPin / repor / token do dispositivo
│  ├─ push/subscribe.js         (Fase C)
│  └─ sw.js                     service worker (precache + push + notificationclick)
├─ supabase/
│  ├─ migrations/               SQL numerado
│  ├─ functions/                entrar, definir-pin, repor-pin, admin-repor-pin, notificar, _shared
│  └─ config.toml
├─ tools/
│  ├─ dc2jsx.mjs                converte o template do protótipo em JSX
│  ├─ gen-icons.mjs             ícones e splash a partir de FG_LOGO sobre #070D0B
│  └─ repor-pin.mjs             script de administração (Filipe)
└─ tests/
   ├─ visual/                   Playwright: protótipo vs app, 390×844
   └─ rls/                      SQL (pgTAP) das permissões e da função de pontos
```

Raiz do repositório = projeto Vite (mais simples para Vercel/Netlify). O `.gitignore` atual é de Flutter: vou acrescentar `node_modules`, `dist`, `.env*`, `supabase/.temp`, `test-results`.

---

## 2. Stack e dependências

| Para quê | Escolha |
|---|---|
| Build | Vite + React 18, JavaScript |
| PWA | `vite-plugin-pwa` (modo `injectManifest`, para o `sw.js` ter o meu código de push) |
| Servidor | `@supabase/supabase-js` v2 |
| Fontes | auto-alojadas (woff2 de Bodoni Moda e Jost no repositório, licença OFL), `@font-face` com os mesmos pesos/itálicos/`opsz` do pedido ao Google Fonts. Se o pacote `@fontsource` não trouxer o eixo `opsz`, uso os ficheiros do próprio Google |
| Push no servidor | `web-push` (npm, em Edge Function) |
| Hash de código | `bcryptjs` + "pimenta" secreta (ver 6) |
| Testes | `@playwright/test` (Chromium já instalado), `pixelmatch`, `pngjs` |
| Conversão do template | `htmlparser2` (mantém maiúsculas/minúsculas dos atributos SVG) |

Sem TypeScript, sem Tailwind, sem bibliotecas de UI, sem CSS-in-JS.

---

## 3. Fase A — conversão 1:1, só com dados locais

### 3.1 `tools/dc2jsx.mjs`
Lê `referencia/ForeverGold App.dc.html` (linhas 9–850) e gera `src/ui/Template.jsx` + `src/ui/pseudo.css`. Regras, copiadas do runtime do protótipo:

| No protótipo | No JSX gerado |
|---|---|
| `<sc-if value="{{ x }}">…</sc-if>` | `{vals.x ? <>…</> : null}` (truthiness igual ao runtime; evita `0` solto) |
| `<sc-for list="{{ l }}" as="i">…</sc-for>` | `{(Array.isArray(vals.l) ? vals.l : []).map((i, $index) => <Fragment key={$index}>…</Fragment>)}`; dentro, o nome `i` é local, o resto é `vals.…` |
| `{{ a.b }}` em texto | `<span className="sc-interp">{…}</span>` (`null`/booleano → nada; `undefined` → nada) |
| `{{ a.b }}` em atributo | `{vals?.a?.b}`; atributo misto → concatenação, como `compileAttr` |
| `style="…"` | `style={cssToObj("…")}` com a **mesma** `cssToObj` do runtime (copiada) |
| `style-active/hover/focus="…"` | `className="scpN"` + regra em `pseudo.css` com o mesmo `!important` (`importantify`) |
| `class`, `for`, `onclick`… | `className`, `htmlFor`, `onClick`… ; atributos SVG/HTML em camelCase (`viewBox`, `strokeWidth`, `playsInline`, `maxLength`, `inputMode`) |
| `data-*`, `aria-*` | iguais |
| nós de texto | emitidos como literais exatos (`{"…"}`), para não perder espaços |
| `<helmet>` | sai do template: `<meta>` e `<style>` vão para `index.html` e `global.css`; fontes passam a locais |

Em **todos** os `onClick="{{ fn }}"` o valor é `vals.fn` (funções criadas por `renderVals`, não se mexe).

### 3.2 `App.jsx`
- Classe `Component` copiada sem reescrever. `extends DCLogic` → `extends React.Component` (o `setState` e `forceUpdate` já têm a mesma assinatura; o `__host` do runtime deixa de existir).
- `render()` = `return <Template vals={this.renderVals()} />` (envolto na mesma `div` fixa do protótipo).
- `fr.framed` e a lógica `env(safe-area-inset-*)` mantêm-se exatamente. A `<meta viewport>` leva `viewport-fit=cover`.
- `componentDidMount` → `boot()` → `fx()` (motor de animações) **não muda**. Os `document.querySelectorAll('[data-a]')` continuam a funcionar porque os atributos `data-*` estão no DOM.
- Fase A: `fg-core.js` fica com `db` em localStorage e `media` em IndexedDB, **tal como está**. Só o transformo em módulo ES que continua a pôr `window.FGCore` e `window.FG_LOGO/FG_GLIFOS` (a classe usa globais).

### 3.3 Critério de aceitação da Fase A (dois níveis)
1. **DOM idêntico.** Para cada estado abaixo, serializo o `outerHTML` do protótipo e da app nova, normalizo os nomes `scpN` e comparo. Tem de dar igual. É mais exigente do que pixels e apanha logo um `span` em falta.
2. **Pixels idênticos.** Playwright, viewport 390×844 (abaixo de 560 px, ou seja sem moldura), `page.clock` congelado, `Math.random` com semente, animações levadas ao fim (`document.getAnimations().forEach(a => a.finish())`), `canvas[data-dust]`, `canvas[data-burst]` e `[data-clock]` mascarados. Os dois lados usam as **mesmas** fontes locais (intercepto `fonts.googleapis.com` no protótipo). `pixelmatch` com limiar 0. Corre também com `reducedMotion: 'reduce'` e, uma vez, a 1280×900 para validar a moldura.

Estados: login (cliente e colaborador × entrar / novo código / confirmar / bloqueio); Página principal (cliente e equipa); lista de lojas; detalhe de loja (dono e não-dono); ficha de peça; editor de peça; chat; hub Equipa; Cotação (mês › semana › dia, gráfico, editor); Lucro do mês (classificação, registo); Publicidade (lista, publicar, partilhado); Perfil; todas as folhas; confirmações; toasts; banners.

Mesmos dados nos dois lados: injeto o mesmo `localStorage` (gerado pelo `seed()` com o relógio congelado) antes de carregar.

---

## 4. Fase B — Supabase

### 4.1 Esquema (resumo; o SQL completo vai em `supabase/migrations/`)

Fuso de todas as regras de mês/dia no servidor: `Europe/Lisbon`.

```sql
contas        (id text pk, nome, tipo check in ('loja','equipa'), loja → lojas, pub bool, user_id uuid unique → auth.users)
lojas         (id text pk, nome, zona, morada, horario, tel, whats, email, ordem int)
pecas         (id text pk, loja → lojas, cat, titulo, preco numeric(10,2) null, mat, peso numeric(8,2) null,
               estado check in (disponivel|reservada|vendida), ex bool, at timestamptz default now(), upd timestamptz)
peca_fotos    (id text pk, peca → pecas on delete cascade, pos smallint, path text, unique(peca,pos) deferrable, check pos 0..5)
chat          (id text pk, by → contas, at timestamptz default now(), txt text check ≤1000, urg bool, ex bool)
cotacoes      (dia date pk, ouro_fino, ouro_usado, prata_fina, prata_usada numeric(6,2) null,
               nota text ≤500, by → contas, at timestamptz default now(), edit bool, ex bool,
               check: pelo menos um preço; cada preço >0 e <1000; dia ≤ hoje(Lisboa))
lucro         (ano int, mes int 1..12, loja → lojas, valor numeric(12,2) 0..5000000, by → contas, at timestamptz, pk(ano,mes,loja))
pub           (id text pk, by → contas, at timestamptz default now(), titulo, texto ≤2200, media_tipo, media_nome, media_path, upd, ex bool)
pub_partilhas (pub → pub on delete cascade, loja → lojas, conta → contas, at timestamptz default now(), pk(pub,loja))
vistos        (conta → contas, kind check in (chat|cot|pub|lucro), at timestamptz, pk(conta,kind))
pins          (conta pk, hash, tentativas int, bloqueado_ate timestamptz, definido_em)         -- só service_role
dispositivos  (conta, token_hash, criado, ua, pk(conta,token_hash))                             -- só service_role
push_subs     (id uuid pk, conta, endpoint unique, p256dh, auth, ua, criado)
fg_meta       (chave pk, valor)                                                                 -- marca "exemplos já carregados"
```
Notas:
- Os ids continuam a ser os do cliente (`uid('p')`, `uid('c')`…, texto), porque a atualização otimista e os caminhos no Storage precisam do id antes da resposta.
- `at` passa a ser **hora do servidor** (default `now()`); o cliente ignora a sua. Evita que o relógio errado de um telemóvel esconda banners (`lastNotif` compara `at` com o relógio de quem recebe). Invisível no ecrã.
- `pub_partilhas` fica por **loja** (é assim que o código marca: `partilhas[a.loja]`), com `conta` guardada também.
- Triggers: `pub_partilhas` só aceita inserir/apagar se o mês de `pub.at` (Lisboa) for o mês atual; `lucro` só aceita escrever o mês atual (Lisboa), da própria loja e com `emJogo`; `lojas` só deixa mudar `morada, horario, tel, whats, email`.

### 4.2 Pontos do jogo — uma só função SQL
`fg_classificacao()` devolve JSON por ano (de 2026 até ao ano atual) com **a mesma forma** que `standings(y)` e `winners(y)` devolvem hoje, para o ecrã não mudar:

- `emJogo(y,m)`: `y*12+m >= 2026*12+10`.
- por loja e mês: `v` = valor registado (só se em jogo); `pm` = publicações com `at` nesse (ano, mês) de Lisboa; `sh` = partilhas dessa loja a essas publicações **feitas dentro do próprio mês**; `b` = 1 se `pm>0` e `sh = pm`, senão 0.
- `lp` = soma de `v/1000`; `bonus` = soma de `b`; `pts = lp + bonus`.
- só as cinco lojas; ordem por `pts` desc, empate pela ordem `valbom, stovidio, pedroucos, riotinto, arrifana` (é o que o `sort` estável do JS faz hoje).
- vencedores por mês: máximo de `v/1000 + b`, só se `> 0`; empate = várias; estado `fora / fechado / jogo / futuro` pelo mês atual de Lisboa.

No cliente, `standings(y)` e `winners(y)` passam a **ler** esse JSON (carregado no arranque e recarregado quando chegam eventos de `lucro`, `pub`, `pub_partilhas` e ao voltar à app). Não há regra duplicada. Os pontos podem demorar ~100 ms a atualizar depois de registar (vêm do servidor); o valor registado aparece logo (otimista).

### 4.3 Permissões (RLS)

Identidade: cada conta da equipa é um utilizador Auth com `contas.user_id`. Funções `security definer` `fg_conta()`, `fg_tipo()`, `fg_loja()`, `fg_pub()` leem a linha de `contas` pelo `auth.uid()`. O cliente usa a chave `anon` (papel `anon`).

| Tabela | cliente (anon) | loja | oficina / filipe | foreverbu |
|---|---|---|---|---|
| lojas | ler | ler; **atualizar só a sua** (colunas permitidas) | ler | ler |
| pecas, peca_fotos | ler | ler; escrever/apagar **só da sua loja** | ler | ler |
| chat | — | ler; inserir com `by = eu` | idem | idem |
| cotacoes | — | ler; inserir/atualizar (`by = eu`, dia ≤ hoje) | idem | idem |
| lucro | — | ler tudo; escrever **só a sua loja, mês atual** | ler | ler |
| pub | — | ler | ler | ler; **criar/editar/apagar** |
| pub_partilhas | — | ler; inserir/apagar **só a sua loja, mês atual** | ler | ler |
| vistos | — | só os seus | só os seus | só os seus |
| contas | — | ler | ler | ler |
| pins, dispositivos | — | — | — | — (só `service_role`) |
| push_subs | — | só as suas | só as suas | só as suas |

Storage:
- `pecas` — público para leitura (o cliente vê as fotos). Escrita só da loja dona: caminho `{loja}/{peca}/{foto}.jpg`, validado pelo prefixo.
- `pub` — **privado**. Leitura só da equipa (URL assinado). Escrita só `foreverbu`. Tamanho máx. do ficheiro igual ao protótipo (80 MB; ver `DUVIDAS.md` nº 7).

Realtime: publicação `supabase_realtime` com as tabelas visíveis ao cliente/equipa; `replica identity full` onde o DELETE precisa da chave de pai (`peca_fotos`).

### 4.4 Dados de exemplo
Migração com função `fg_seed()`, chamada uma vez e protegida por `fg_meta`: só corre se `pecas`, `chat`, `cotacoes`, `pub` estiverem vazias. Gera as mesmas 16 peças, 3 mensagens, 12 cotações (valores do mesmo gerador `rng(20261007)`, calculados no script e escritos como constantes), 1 publicidade e os `vistos` iniciais, tudo com `ex = true`. As 5 lojas base (`LOJAS_BASE`) entram sempre (não são exemplo). O botão "apagar dados de exemplo" chama `fg_apagar_exemplos()` (só staff) e apaga também os ficheiros do Storage.

### 4.5 `commit(...)` do protótipo → operação nova

`commit(fn, op)` mantém a assinatura e o retorno síncrono: aplica `fn` a `this.data` (ecrã atualiza já), dispara `op()` (promessa). Se falhar: recarrega do servidor só as tabelas tocadas (não se repõe um snapshot inteiro, para não apagar o que outros telemóveis acabaram de mandar) e mostra o mesmo toast de erro. As funções `fn` dos `commit` **ficam como estão**; só se acrescenta o segundo argumento.

| # | Onde (método) | Hoje | Passa a ser |
|---|---|---|---|
| 1 | `markSeen` | `d.seen[me][k]=t` | `repo.vistos.mark(me, kinds)` |
| 2 | `submitPin` (confirmar) | `d.pins[a.id]={salt,hash}` | `auth.definirPin(conta, pin)` → Edge `definir-pin` |
| 3 | `submitPin` (enter) | compara hash local + `bloqueio` local | `auth.entrar(conta, pin)` → Edge `entrar` |
| 4 | `forgot` | `delete d.pins[a.id]` | `auth.repor(conta)` → Edge `repor-pin` (exige token do dispositivo) |
| 5 | `savePeca` | `unshift` / `Object.assign` + `media.put` | `media.upload(fotos novas)` depois `repo.pecas.upsert(rec, fotos[])` |
| 6 | `setEstado` | `q.estado=e` | `repo.pecas.setEstado(id, e)` |
| 7 | `delPeca` | `filter` + `media.del` | `repo.pecas.remove(id)` (apaga fotos do Storage) |
| 8 | `saveLoja` | `Object.assign(d.lojas[..])` | `repo.lojas.updateInfo(id, {morada,horario,tel,whats,email})` |
| 9 | `sendChat` | `push` + `seen.chat` | `repo.chat.send({id,txt,urg})` (+ `vistos.mark('chat')`) |
| 10 | `publishCot` | `d.cot[k]=…` + `seen.cot` | `repo.cot.set(dia, rec)` (+ `vistos.mark('cot')`) |
| 11 | `registarLucro` | `d.lucro[y][loja][m]={…}` | `repo.lucro.set(ano, mes, valor)` |
| 12 | `savePub` | `unshift` / `Object.assign` + `media.put` | `media.upload` depois `repo.pub.upsert(rec)` |
| 13 | `delPub` | `filter` + `media.del` | `repo.pub.remove(id)` (partilhas caem em cascata) |
| 14 | `toggleShare` | `partilhas[loja]=Date.now()` / `delete` | `repo.pub.marcarPartilhada(id)` / `desmarcarPartilhada(id)` |
| 15 | `clearEx` | filtros `ex` | `repo.ex.apagar()` → RPC `fg_apagar_exemplos` |
| — | `db.load()` | localStorage | `repo.carregar(papel)`: cliente = lojas, pecas, fotos; equipa = tudo + `fg_classificacao()` |
| — | `db.subscribe(cb)` | BroadcastChannel/`storage` | `realtime.subscribe(deltas)`; aplica o delta a `this.data` e chama `sync()` (a lógica de `feed`/banner/`notifySys` fica igual) |
| — | `sessao` | `fg-sessao` | `fg-sessao` (conta) **+** sessão Supabase; ao arrancar, a conta vem do JWT |
| — | `bloqueio` | localStorage | estado vem do servidor (ver 5) |
| — | `media.put/get/del` | IndexedDB | Storage: `put` = upload, `get` → URL (público em `pecas`, assinado em `pub`), `del` = remove |

Detalhes de fidelidade nos média:
- `url(id)` continua a devolver um URL de forma assíncrona e a fazer `forceUpdate()`. Para o botão **Descarregar** (`<a download>`) funcionar com URL de outro domínio, o ficheiro do `pub` é sacado para `Blob` e usa `URL.createObjectURL` (como hoje). O `<video>` usa o URL assinado diretamente, para não obrigar a sacar 80 MB antes de ver.
- `comprimeImagem` mantém-se (1400 px, JPEG 0,84; 2600 px acima de 12 MB, como no `pickMedia`).

---

## 5. Fase C — códigos, push e PWA

### 5.1 Códigos de 4 dígitos
Ecrã e fluxo iguais. Por baixo:

- 8 utilizadores Auth (um por conta da equipa). A palavra-passe de cada um é `HMAC-SHA256(AUTH_SECRET, conta)`: forte, **nunca guardada** e nunca sai da Edge Function. O JWT leva `app_metadata.conta`.
- Função pública `fg_estado_contas()` (executável por `anon`) devolve, por conta: `{ tem_pin, bloqueado_ate }`. Só booleanos e uma hora. Alimenta `setAcc` e `vmLogin`.
- **`entrar(conta, pin)`** (Edge, `service_role`):
  1. reserva a tentativa de forma atómica (`update pins set tentativas = tentativas+1 … where bloqueado_ate < now() returning`), por isso tentativas em paralelo não furam o limite;
  2. compara com `bcrypt(HMAC(PIMENTA, conta|pin))`;
  3. errado: devolve `{ ok:false, restantes, bloqueado_ate }` (5.ª falha → `bloqueado_ate = now()+30 s`, tentativas a zero); o cliente compõe as **mesmas** mensagens ("Código errado. Restam 3 tentativas." / "Resta 1 tentativa." / "Demasiadas tentativas erradas… daqui a N s.");
  4. certo: zera tentativas, devolve `{ ok:true, session }` (tokens) e, se o dispositivo ainda não tem token de confiança, cria-o e devolve-o.
  Parâmetro `so_verificar: true` para "Alterar código" (já com sessão): verifica sem criar sessão nova.
- **`definir-pin(conta, pin)`**: aceita se (a) o pedido traz sessão válida **dessa** conta, ou (b) a conta ainda não tem código (primeiro uso), ou (c) traz o bilhete de uma reposição acabada de aceitar (válido 10 min, uso único). Guarda o hash; devolve tokens e o token do dispositivo.
- **`repor-pin(conta, token_dispositivo)`**: só se o token (hash) estiver em `dispositivos` para essa conta. Apaga o código, devolve o bilhete. Sem token válido responde "não associado" e o cliente mostra, no mesmo estilo de confirmação do `forgot`: *"Este telemóvel não está associado a esta conta. Peça ao Filipe para repor o código."* (o resto do ecrã não muda).
- **`admin-repor-pin(conta)`**: apaga código e tokens da conta. Autorizada por sessão do `foreverfilipe` **ou** por `ADMIN_SECRET`. Sem botão novo na app (seria funcionalidade nova): `node tools/repor-pin.mjs <conta>` documentado no README. Ver `DUVIDAS.md` nº 6.
- Token do dispositivo: 32 bytes aleatórios em `localStorage` (`fg-disp-<conta>`), hash SHA-256 no servidor. Instalada no ecrã principal, o iOS não apaga o armazenamento da PWA; no Safari normal pode apagar ao fim de ~7 dias sem uso (nesse caso pede-se ao Filipe).

### 5.2 Notificações push
- Tabela `push_subs`. `askNotif` (botão que já existe no Perfil) passa a: pedir permissão → `pushManager.subscribe(VAPID_PUBLIC)` → gravar em `push_subs` (conta + dispositivo). Ao entrar com permissão já dada, re-sincroniza a subscrição; ao sair, apaga a deste dispositivo.
- Triggers (`pg_net`/Database Webhook) → Edge Function **`notificar`**, protegida por segredo partilhado:

| Evento | Quem recebe | Título | Corpo |
|---|---|---|---|
| `chat` INSERT | equipa menos o autor | `Chat · Nome` / urgente: ver `DUVIDAS.md` nº 2 | texto da mensagem; urgente vibra `[40,60,40]` |
| `cotacoes` INSERT **ou** UPDATE | equipa menos `by` | `Cotação diária` | `dd/mm: Ouro fino … · usado … | Prata fina … · usada … €/g · Nome` (+ `. nota`) — igual ao `feed` |
| `pub` INSERT | equipa menos BU | `Publicidade` | `Nova publicação: título` |
| `lucro` | **sem push** no pedido; só banner dentro da app, como hoje (ver `DUVIDAS.md` nº 4) | — | — |

  Os textos são construídos com as **mesmas** funções (`cotResumo`, `numero`, `pad`) copiadas para a Edge Function, para os corpos saírem idênticos aos do `feed`. `tag: 'fg-' + k` igual a `notifySys`, por isso um aviso em primeiro plano e um push nunca aparecem duplicados (o segundo substitui o primeiro). Subscrições com resposta 404/410 são apagadas.
- `sw.js`: no `push`, se houver janela visível não mostra nada (o banner dentro da app já trata); senão `showNotification`. No `notificationclick`, foca/abre `/?ir=chat|cot|pub|lucro` e o `boot()` chama `navTo(k)` com esse valor (única linha nova na classe fora dos dados).
- Clientes não têm subscrições nem recebem push.
- **iPhone:** só com iOS 16.4+ e a app adicionada ao ecrã principal. Mostro a instrução no sítio onde o protótipo já mostra o estado das notificações (`notifTxt`/botão), com o mesmo estilo. Texto proposto em `DUVIDAS.md` nº 9.

### 5.3 PWA
- `manifest`: nome ForeverGold, `display: standalone`, `theme_color` e `background_color` `#070D0B`, ícones 192/512 e maskable; `apple-touch-icon` 180; imagens de splash iOS. Tudo gerado por `tools/gen-icons.mjs` a partir de `FG_LOGO` sobre `#070D0B`.
- Service worker (Workbox via `injectManifest`): pré-cache do invólucro (HTML, JS, CSS, fontes, ícones) para abrir sem rede; **nunca** guarda respostas do Supabase. O que se mostra sem rede e sem dados: `DUVIDAS.md` nº 8.

---

## 6. Segurança — o que decidi sem perguntar
- "Pimenta" no hash do código: 4 dígitos têm só 10 000 combinações; sem pimenta, quem copiasse a tabela `pins` descobria todos os códigos em segundos. A pimenta está em segredo da Edge Function, fora da base de dados.
- `service_role` nunca vai para o cliente nem para o repositório. No browser só vai a chave `anon`.
- Segredos em `.env` (local) e em *secrets* do Supabase/Vercel. `.env.example` sem valores.
- Tudo o que o ecrã esconde (cliente vs equipa, dono vs não dono) é também imposto por RLS e testado em `tests/rls` com utilizadores de cada papel (incluindo tentativas que **têm** de falhar: loja a escrever noutra loja, cliente a ler `chat`, loja a criar publicidade, BU a registar lucro, etc.).

---

## 7. Ordem de trabalho e commits

**Fase A** (sem servidor)
1. scaffold Vite + `.gitignore` + fontes locais + `global.css`
2. `tools/dc2jsx.mjs` + `Template.jsx` + `pseudo.css`
3. `App.jsx` (classe copiada) + `fg-core.js`/`fg-assets.js` como módulos
4. testes DOM + pixel (protótipo vs app) e correções até diferença nula
5. ícones, `manifest`, `index.html` (sem push ainda)

**Fase B**
6. migrações: tabelas, funções de apoio, triggers, RLS, Storage, Realtime
7. `fg_classificacao()` + testes dos pontos (casos: mês antes de outubro de 2026, empate, bónus só no próprio mês, publicidade apagada, 31 dez → 1 jan)
8. `fg_seed()` / `fg_apagar_exemplos()`
9. `repo.js`, `realtime.js`, `media.js`; `commit(fn, op)` e os 15 pontos da tabela 4.5
10. teste com **dois navegadores** e duas contas em simultâneo (escrita concorrente, banner em tempo real, permissões)

**Fase C**
11. Edge Functions `entrar`, `definir-pin`, `repor-pin`, `admin-repor-pin` + ecrã de login ligado
12. `push_subs`, `notificar`, `sw.js`, subscrição no `askNotif`
13. PWA final, README (local, criar projeto Supabase, variáveis, publicar em Vercel/Netlify, instalar em iPhone e Android)

**Fase D** (Capacitor): só se pedires.

Commits pequenos, um por passo, na branch `claude/laughing-johnson-xwbmyt`. Sem PR a não ser que o peças.

---

## 8. O que preciso de ti (e quando)

| Quando | O quê |
|---|---|
| Já | Respostas a `DUVIDAS.md` (sobretudo 1, 2, 5, 6, 7) |
| Antes da Fase B | Projeto Supabase criado por ti (região UE) e enviares URL + chave `anon` (a `service_role` não me mandes por chat: entra só nos *secrets*). Se preferires, deixo o README passo-a-passo e crias tu |
| Antes da Fase C | Gero eu o par de chaves VAPID e dou-te os comandos para as pores nos *secrets* |
| Antes de publicar | Escolha Vercel ou Netlify e (opcional) domínio |

Nota honesta de ambiente: neste contentor não posso criar o projeto Supabase na nuvem por ti. Os testes de RLS e da função de pontos corro-os numa base Postgres local; o teste final "dois telemóveis ao mesmo tempo" precisa do teu projeto Supabase real.
