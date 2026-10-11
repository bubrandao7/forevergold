# lovelynailsbylu — notas para continuar

**Site online:** https://lovelynailsbylu.vercel.app (Vercel, equipa `bu`, projeto `lovelynailsbylu`, grátis)
**Ficheiro:** `lovelynailsbylu/index.html` (um só ficheiro, imagens embutidas)
**Branch:** `claude/ecstatic-fermat-0i5v1l`

## Como republicar
O projeto Vercel NÃO está ligado ao GitHub. Para atualizar: fazer commit/push e criar novo deployment
(gitSource github bubrandao7/forevergold, ref da branch, target production). Definições já guardadas
no projeto: rootDirectory `lovelynailsbylu`, outputDirectory `.`, sem build.

## Feito
- Nome do site: lovelynailsbylu (título, partilha, JSON-LD). Textos visíveis e logótipo intocados.
- Motions: frase com scrub ao scroll, faixa/selo com velocidade do scroll, linhas que se desenham,
  preços em cascata, botões magnéticos, arcos com tilt 3D, inércia no arrastar, deriva Lurdes/Andrade,
  fallback JS para scroll-timelines, reduced-motion respeitado.
- Corrigido: hover dos botões revelados; removido preload duplicado de 119 KB.

## Por fazer / ideias
- Criar imagem de partilha `/img/laranja.jpg` (og:image ainda aponta para um ficheiro inexistente).
- Separar o logótipo (colado 4x no HTML, ~190 KB a mais) para um ficheiro à parte.
- Lightbox ao tocar numa foto dos trabalhos.
- Decidir se o rodapé/alt do logótipo passam a "lovelynailsbylu".
- Domínio próprio (.pt) tem custo — só se quiseres.
