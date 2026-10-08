# ForeverGold

App da ForeverGold (clientes e equipa), instalável no telemóvel. O aspeto, os textos e o comportamento são os do protótipo em `referencia/`; este projeto é só a camada técnica por baixo.

Estado: **Fase A concluída** (app Vite a correr com os dados locais do protótipo, paridade visual verificada). Fases B (Supabase) e C (códigos no servidor, notificações push) por fazer. Ver `PLANO.md` e `DUVIDAS.md`.

## Correr em local

Precisa de Node 20 ou mais recente.

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

Para ver a versão de produção (com o service worker):

```bash
npm run build
npm run preview      # http://127.0.0.1:4173
```

Na Fase A os dados ficam no próprio navegador (localStorage e IndexedDB), como no protótipo. Para voltar ao início, apague os dados do site no navegador.

## Testes de paridade visual

Comparam o protótipo (`referencia/`) com a app nova, ecrã a ecrã, a 390×844: primeiro o HTML renderizado, depois os pixels (diferença zero). Cobrem login (todas as contas, código novo, errado, bloqueio, esqueci-me, alterar), cliente, loja dona, chat, cotação, lucro, publicidade, perfil, confirmações, toasts, banner, BU, oficina, Filipe, versão com animações congeladas e moldura de computador.

```bash
npx playwright test              # corre tudo (cerca de 8 minutos)
npx playwright test login        # só um ficheiro
```

Os testes arrancam sozinhos o protótipo (porta 5000) e a app (porta 4173). Em caso de diferença, os ficheiros ficam em `tests/visual/__out__/` (`.ref.png`, `.app.png`, `.diff.png`, `.ref.html`, `.app.html`).

## Regenerar peças geradas

| Comando | O que faz |
|---|---|
| `npm run convert` | Converte o template do protótipo em `src/ui/Template.jsx` e `src/ui/pseudo.css`. **Não editar esses dois ficheiros à mão.** |
| `node tools/gen-icons.mjs` | Ícones, `apple-touch-icon` e imagens de splash iOS em `public/` |
| `node tools/fetch-fonts.mjs` | Descarrega Bodoni Moda e Jost para `src/fonts/` (já estão no repositório) |

## Estrutura

Ver `PLANO.md`, secção 1.

## Instalar no telemóvel (depois de publicada)

- **iPhone (iOS 16.4 ou mais recente):** abrir o endereço no Safari, tocar em Partilhar, «Adicionar ao ecrã principal», e abrir a app a partir do ícone. É obrigatório para receber notificações.
- **Android:** abrir o endereço no Chrome e aceitar «Instalar app» (ou menu ⋮ › «Instalar aplicação»).

As secções de Supabase, variáveis de ambiente e publicação (Vercel/Netlify) entram nas Fases B e C.
