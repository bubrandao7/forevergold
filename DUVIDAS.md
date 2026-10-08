# Decisões da Bu (resolvem as dúvidas abaixo)

1. **Plano gratuito do Supabase.** Limite de vídeo passa a **50 MB** (o texto do aviso passa a dizer 50 MB). Ver nota na resposta.
2. **Código inicial igual para todas as contas.** O código inicial é definido no servidor por script (não fica escrito no repositório) e cada pessoa pode mudá-lo depois em Perfil › alterar código. Isto também resolve o "primeiro uso aberto": nenhuma conta fica sem código.
3. **Toast de falha ao guardar:** passa a começar por «Erro». Texto: *«Erro ao guardar. Verifique a ligação e tente outra vez.»*
4. **Título da notificação urgente:** «Aviso urgente · Nome» (como no protótipo).
5. **Lucro do mês:** sem notificação. Sai do banner, do push e da lista de avisos.
6. **Notificações novas:** vencedora de cada mês (no fecho do mês) e vencedora da temporada (no fim do jogo, 31 de dezembro). Textos propostos na secção «Textos novos a aprovar».
7. **Sem rede:** aviso discreto com símbolo de rede e o texto «Sem ligação à internet».
8. **Fuso horário:** Lisboa em todo o lado, também no ecrã.
9. **iPhone:** explicado à Bu no chat; o texto da instrução mantém-se como proposto.

## Textos novos a aprovar
- Sem rede: «Sem ligação à internet»
- Vencedora do mês (push, título «Vencedora de <mês>»): «<Loja> ganhou <mês> com <N,N> pontos.» (empate: «<Loja A> e <Loja B> ganharam…»). Não há notificação se ninguém pontuou.
- Vencedora da temporada (título «Vencedora de <ano>»): «<Loja> ganhou a temporada <ano> com <N,N> pontos. Parabéns!»

---

# Dúvidas

Coisas do protótipo ou do pedido que me parecem erradas, ambíguas ou em conflito. **Não mudei nada**: em cada ponto fica o comportamento por omissão que vou seguir se não disseres o contrário.

## Preciso de resposta

**1. Toast de erro ao falhar a gravação.**
O protótipo diz: *"Não foi possível guardar: o espaço da app neste telemóvel está cheio. Apague fotografias ou vídeos antigos."* Com servidor, a falha típica é falta de rede ou permissão, e esse texto seria enganador.
- Por omissão: uso exatamente esse texto (pediste "o mesmo toast").
- Proposta: um texto novo para falha de rede, por exemplo *"Não foi possível guardar. Verifique a ligação e tente outra vez."*

**2. Título da notificação urgente.**
O pedido diz título "Urgente". O `notifySys` do protótipo usa `Aviso urgente · <Nome>` (e `Chat · <Nome>` nas normais), e pedes também "mesmos títulos/corpos que `notifySys` e `showBanner` já constroem".
- Por omissão: igual ao protótipo (`Aviso urgente · Nome`). A vibração `[40,60,40]` fica.

**3. Código de 4 dígitos: força bruta.**
5 tentativas por 30 s dá 10 000 combinações em cerca de 17 horas, de qualquer parte do mundo, contra uma conta. Há ainda o contrário: qualquer pessoa pode bloquear a conta de um colega 30 s de cada vez, só com a página de login.
- Por omissão: igual ao protótipo (5 tentativas → 30 s, mensagens iguais), mas o bloqueio passa a ser no servidor.
- Proposta (invisível no ecrã): depois de bloqueios repetidos seguidos, o tempo sobe (30 s → 5 min → 1 h → 24 h) e volta a 30 s no primeiro código certo. O texto da contagem é o mesmo.

**4. Notificação de "Lucro do mês".**
No protótipo, um lucro registado gera banner dentro da app (entra no `feed`). A lista de notificações push do pedido (chat, cotação, publicidade) não o inclui.
- Por omissão: só banner dentro da app, sem push.

**5. Primeiro uso aberto.**
"`definirPin` só com sessão válida, ou no primeiro uso." Isto quer dizer que, depois de publicada a app, quem abrir a página primeiro e escolher o código de `foreverbu` (ou de qualquer conta ainda sem código) fica dono da conta. É o mesmo risco para qualquer conta nova.
- Por omissão: igual ao pedido; no README digo para a equipa escolher os 8 códigos no próprio dia da publicação.
- Proposta: o Filipe define o código inicial de cada conta com `tools/repor-pin.mjs`, e o primeiro uso passa a exigir o "bilhete" dessa reposição. O ecrã não muda.

**6. Como o Filipe repõe um código (e quem repõe o do próprio Filipe).**
Pedes uma Edge Function de administração, mas "sem funcionalidades novas" na app. Então não há botão: o Filipe corre `node tools/repor-pin.mjs <conta>` no computador (com o segredo de administração). Se o Filipe perder o telemóvel, a reposição do código dele é feita por ti pelo painel do Supabase ou pelo mesmo script.
- Por omissão: só script. Diz-me se queres um botão escondido no Perfil do Filipe (seria uma funcionalidade nova).

**7. Limite de 80 MB de vídeo vs. plano gratuito do Supabase.**
O plano gratuito aceita no máximo **50 MB por ficheiro** e **1 GB** no total. O protótipo deixa subir vídeos até 80 MB. Para manter os 80 MB (e ter folga para fotos e vídeos), é preciso o plano Pro do Supabase (cerca de 25 USD/mês, convém confirmar o preço atual no site deles).
- Por omissão: mantenho 80 MB no código; se estiveres no plano gratuito, ficheiros entre 50 e 80 MB falham e mostram o toast do ponto 1.
- Isto é uma decisão de custo: sugiro dormires sobre ela 24 h antes de subir de plano.

**8. Sem rede, o que se vê?**
O protótipo guardava tudo no telemóvel, por isso nunca teve este estado. Pedes só "offline do invólucro". Sem rede, a app abre mas não tem dados nem texto previsto para isso.
- Por omissão: a app abre e fica com listas vazias; as ações falham com o toast do ponto 1.
- Proposta: guardar a última cópia dos dados no telemóvel e mostrá-la, e um aviso discreto "Sem ligação" (texto novo, a aprovar).

**9. Texto da instrução para iPhone (texto novo, a aprovar).**
Vai no sítio de `notifTxt` do Perfil, no mesmo estilo:
> Para receber avisos no iPhone: toque em Partilhar › «Adicionar ao ecrã principal» e abra a ForeverGold a partir do ícone. Precisa de iOS 16.4 ou mais recente.

Hoje, num navegador sem `Notification`, o texto é *"Este navegador não mostra notificações. Os avisos aparecem dentro da app."* — proponho trocá-lo por este quando for iPhone e a app ainda não estiver instalada.

**10. Fuso horário (o Dubai, Bu!).**
O protótipo decide "hoje", "mês atual" e "mês fechado" pela hora do telemóvel. O servidor tem de decidir sozinho para ninguém fazer batota, e vai usar Lisboa. Num telemóvel com outro fuso (ex.: Dubai, +3 h) há umas horas por mês em que o ecrã e o servidor discordam sobre qual é o mês.
- Por omissão: o ecrã continua a usar a hora do telemóvel; o servidor usa Lisboa e é ele que manda (o ecrã mostra o erro do ponto 1 nessas horas).
- Proposta: o ecrã passar a usar sempre a hora de Lisboa nessas contas (mexe em vários `new Date()`).

## Só para saberes (sem decisão necessária)

- `at` (hora de uma mensagem/cotação/publicação) passa a ser a hora do servidor, não a do telemóvel de quem escreveu. Evita banners perdidos por relógio desacertado. Não se vê.
- `pub_partilhas` fica por loja e não por conta, porque é assim que o código marca (`partilhas[a.loja]`); só contas de loja partilham.
- Corrigir uma cotação (e, no protótipo, qualquer ação que refresque `at`) volta a gerar banner e push aos outros, porque o protótipo já trata assim ("A equipa foi avisada").
- Registar o lucro de novo no mesmo mês (corrigir) também refresca `at` e gera banner, igual ao protótipo.
- No protótipo, "Esqueci" repõe o código em qualquer telemóvel. Com servidor isso seria uma porta aberta, por isso a regra do teu briefing ("cada um repõe o seu no próprio telemóvel") passa a ser aplicada de verdade (secção 5.1 do plano).
- O `.gitignore` do repositório é um modelo de Flutter; vou acrescentar as entradas de Node/Vite/`.env`.
