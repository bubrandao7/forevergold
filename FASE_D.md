# Fase D: ForeverGold nas lojas (App Store e Google Play)

Estado: **preparado, nada submetido, nada pago.** A app instalada pelo Safari/Chrome (PWA) continua a funcionar e não depende disto.

## O que já está feito
- Capacitor 7 instalado; `capacitor.config.json` (id `pt.forevergold.app`, nome ForeverGold, pasta `dist`).
- Projetos nativos gerados: `android/` e `ios/`.
- Ícones e ecrã de abertura (splash) das lojas gerados a partir do logótipo (`assets/` → `npx capacitor-assets generate`).
- Scripts: `npm run build:app` (compila em modo online e sincroniza), `npm run cap:android`, `npm run cap:ios`.
- `public/privacidade.html` (rascunho da política de privacidade, o endereço será `https://forevergold.vercel.app/privacidade.html`).

## Importante: notificações na app nativa
As notificações de hoje usam Web Push, que **não funciona dentro da app das lojas** (nem no iPhone nem no Android). No ecrã de perfil a app nativa vai dizer que não suporta notificações. Para as ter é preciso trabalho extra, ainda não feito:
- Android: Firebase Cloud Messaging (conta Firebase grátis).
- iPhone: chave APNs (precisa da conta Apple paga).
- Plugin `@capacitor/push-notifications`, uma tabela de tokens nativos e a Edge Function `notificar` a enviar também por FCM/APNs.

Alternativa: quem precisar de avisos usa a versão instalada pelo Safari/Chrome.

## Tu: contas e custos (espera 24 horas antes de pagar)
| Loja | Custo | O que é preciso |
|---|---|---|
| Apple Developer Program | 99 USD/ano | conta Apple com 2FA; um Mac com Xcode; verificação pode demorar dias |
| Google Play Console | 25 USD (uma vez) | conta Google; verificação de identidade; contas novas pessoais têm de ter 12 testadores durante 14 dias antes de publicar |

## Passos Android (num computador com Android Studio)
1. `npm install`, depois `npm run cap:android` (abre o Android Studio).
2. Build › Generate Signed Bundle (AAB). **Guarda a chave de assinatura num sítio seguro**: sem ela não há atualizações.
3. Play Console: criar app, ficha da loja, política de privacidade, questionário de segurança dos dados, enviar o AAB para teste interno.

## Passos iPhone (num Mac com Xcode)
1. `npm install`, depois `npm run cap:ios` (abre o Xcode). Em *Signing & Capabilities* escolhe a equipa Apple.
2. Product › Archive › Distribute App › App Store Connect.
3. App Store Connect: ficha da app, capturas de ecrã, política de privacidade, "App Privacy". Enviar para TestFlight primeiro.

## Riscos na revisão
- A Apple pode recusar apps que sejam "só um site". Esta tem funcionalidades nativas limitadas, por isso convém ter as notificações nativas feitas antes de submeter.
- A app tem contas só para a equipa (sem registo público). Na descrição indica isso e dá uma conta de demonstração para o revisor.
- A política de privacidade é um rascunho: revê o texto antes.
