# Retomar o trabalho no site Suco Bagaço

Última atualização: 10/10/2026.

## Onde está tudo
- **Código:** repositório `bubrandao7/forevergold`, pasta `sucobagaco/`, branch `claude/peaceful-shannon-i439kk`.
- **Site no ar:** https://suco-bagaco.vercel.app (projeto Vercel `suco-bagaco`, id `prj_G2HfDJ2j1NYjR1EyqXA1FnGRDzif`, equipa `bu-a0e7`, id `team_WdqEYAqZJVxY3N40ABN45bxf`).
- **Desenho original:** ficheiros «Suco Bagaço Home standalone» e «Suco Bagaço Redesign» (HTML do Claude Design). A versão final é a «Home». Não estão no repositório.
- **Como funciona e onde mudar cada coisa:** `README.md` desta pasta. Testes: `node tests/smoke.mjs` (11 verificações).

## Como publicar uma alteração
O Vercel **não republica sozinho**. Depois de fazer commit e push, é preciso criar um deploy novo, por exemplo pedindo ao Claude com o conector Vercel (`create_deployment` com `gitSource` github `bubrandao7/forevergold`, a branch acima e o `sha` do commit, `target: production`, na equipa `bu-a0e7`). Em alternativa, no painel do Vercel: Deployments → Redeploy. Para ficar automático, ligar o repositório ao projeto em Settings → Git.

## Se comprar o domínio
1. Em Vercel → projeto `suco-bagaco` → Settings → Domains, adicionar o domínio e seguir as instruções de DNS (ou pedir ao Claude para o ligar).
2. Em `index.html`, trocar `content="img/og.jpg"` por `content="https://O-DOMINIO/img/og.jpg"` (imagem de partilha com URL absoluto).
3. Acrescentar `<link rel="canonical" href="https://O-DOMINIO/">` no `<head>`.
4. Criar `sitemap.xml` e acrescentar `Sitemap: https://O-DOMINIO/sitemap.xml` ao `robots.txt`.
5. Publicar de novo (ver acima).

Nota: em 10/10/2026 `sucobagaco.pt`, `.com`, `.com.pt` e `sucobagacoportugal.pt` estavam todos ocupados. Falar primeiro com a marca (pode já haver um domínio). Preços: confirmar no registo; não foram verificados.

## Conteúdo (v2)
O cardápio completo e a secção Franquia vieram do desenho «Suco Bagaço Site v2» (textos de sucobagaco.pt, fornecidos pela Bu). Estão em `index.html` (`#cardapio`, `#franquia`). A abertura (logótipo + contador 0–100 % fruta) é a pedida pela Bu: **sem azulejos**, ao contrário do README do v2.

## Por fazer
- [ ] Fotografias reais do Instagram (com autorização): `img/instagram/` e comentário em `index.html`.
- [ ] Confirmar o WhatsApp `9 35 35 35 35` para as 4 lojas (ou números por loja).
- [ ] Confirmar morada e coordenadas de Lisboa (UBBO, Amadora).
- [ ] Confirmar as ligações «Queres abrir uma loja?» e «Suco Bagaço Brasil» (não testadas).
- [ ] Rever o texto legal do rodapé (Livro de Reclamações, privacidade) com quem trata do jurídico/contabilidade.
- [ ] Ver a animação do copo ao mudar de sabor num telemóvel real (corrigida duas vezes; só foi verificada em níveis fixos).
- [ ] Opcional: horários e preços (o desenho não os tem).
