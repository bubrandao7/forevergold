# Site público da Forevergold

Site estático (HTML, CSS e JavaScript, sem build) com o design do artifact «Forevergold». É independente da app da equipa que está na raiz do repositório.

## Ver no computador

```bash
python3 -m http.server -d site 8080     # abrir http://127.0.0.1:8080
```

## Mudar o conteúdo

Tudo o que é texto, artigos, avaliações, lojas e contactos está em `js/dados.js`:

- `produtos`: artigos da loja. `preco: null` mostra «Preço sob consulta». Para pôr fotografia, guarde a imagem em `site/img/` e use `"img": "img/nome.jpg"`. Tire a etiqueta «Exemplo» com `"exemplo": false`.
- `reviews`: só avaliações verdadeiras deixadas no Google.
- `lojas`: `sede: true` só para a sede (Gondomar). As restantes contam como lojas.
- `marca.whatsapp`: número que recebe as encomendas do carrinho.
- `marca.instagram` e `marca.facebook`: aparecem no rodapé quando preenchidos.

## Publicar

GitHub Pages (automático): cada mudança em `site/` que chegue ao `main` publica o site (workflow `.github/workflows/site.yml`). Só é preciso ativar uma vez em Settings › Pages › Source: GitHub Actions.

Alternativa, Vercel ou Netlify: projeto novo com a pasta raiz `site` e sem comando de build. Não use o projeto da app, que compila a raiz.

## Notas

- O carrinho guarda-se no navegador de cada cliente e a encomenda segue por WhatsApp (`wa.me`). Não há pagamentos online.
- Os tipos de letra vêm do Google Fonts.
