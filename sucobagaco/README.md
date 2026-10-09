# Suco Bagaço Portugal — site

Site estático (HTML, CSS e JavaScript, **sem build, sem frameworks, sem CDNs**) feito a partir do desenho «Suco Bagaço · Home». É independente da app e do site ForeverGold que estão no resto do repositório.

## Ver no computador

```bash
node sucobagaco/tests/serve.mjs          # http://127.0.0.1:8090
```

Serve com os mesmos cabeçalhos de segurança de produção (incluindo a CSP). Evite `file://`: a geolocalização e os módulos JavaScript precisam de `http(s)`.

## Testes

```bash
npm install                              # na raiz, uma vez (usa o @playwright/test do projeto)
node sucobagaco/tests/smoke.mjs
```

11 verificações: sem erros na consola nem violações da CSP, separadores (rato e teclado), geolocalização aceite e recusada, ligações Maps/WhatsApp de cada loja, botão flutuante, introdução, «reduzir movimento», site sem WebGL, site sem JavaScript e telemóvel sem scroll horizontal.

## Onde mudar o quê

| O quê | Onde |
|---|---|
| Textos, menu (sumos, descrições) | `index.html` — cada separador é um `<div role="tabpanel">` |
| Cor do sabor e do cartão de cada separador | atributos `data-flavor` e `data-bg` nos botões `.tab` |
| Lojas (morada, coordenadas) | `index.html` — cada loja é um `<li class="store">` com `data-lat` e `data-lng`; atualize também o bloco `application/ld+json` no `<head>` |
| WhatsApp | procurar `351935353535` em `index.html` |
| Fotografias do Instagram | guardar em `img/instagram/` e seguir o comentário em `index.html` (secção «Segue o sabor») |
| Cores, tipos de letra, espaçamentos | `css/styles.css` (variáveis no topo) |
| Copos 3D | `js/cups3d.js` (opções em `js/main.js`, função `setupCups`) |

## Como funciona

- **Copos 3D** com three.js (`vendor/`, versão 0.165, copiada para o projeto). Carregam à parte: se o WebGL não existir ou falhar, aparece o logótipo no lugar do copo e o resto do site funciona igual. O copo do Bifásico e o do menu só se criam quando estão perto do ecrã.
- **Sem JavaScript** o site lê-se completo: o menu e as lojas estão no HTML.
- **Acessibilidade:** separadores com setas, Home e End; mensagem de localização anunciada por leitores de ecrã; ligação «Saltar para o conteúdo»; `prefers-reduced-motion` desliga a introdução e as animações.
- **Privacidade:** sem cookies, sem analytics, sem pedidos a terceiros. A localização é calculada no dispositivo e nunca é enviada. A introdução só guarda `sb-intro-visto` em `sessionStorage` para não repetir na mesma sessão.
- **Segurança:** CSP restrita (`script-src 'self'`, sem estilos nem scripts inline), `nosniff`, `Referrer-Policy` e `Permissions-Policy`. Se acrescentar analytics, formulários ou vídeo incorporado, tem de abrir a CSP para esses domínios e atualizar o aviso de privacidade do rodapé.

## Publicar

Basta servir a pasta `sucobagaco/` na raiz de um domínio.

- **Vercel:** novo projeto com *Root Directory* `sucobagaco`, sem comando de build. O `vercel.json` já traz cabeçalhos e cache.
- **Netlify / Cloudflare Pages:** pasta de publicação `sucobagaco`, sem build. O ficheiro `_headers` traz os mesmos cabeçalhos.
- **GitHub Pages:** os cabeçalhos (CSP) não se aplicam; funciona na mesma, mas sem essa proteção.

Não use o projeto Vercel/Netlify da app ForeverGold: esse compila a raiz do repositório.

### Depois de ter o domínio

1. Em `index.html`, trocar `content="img/og.jpg"` por `content="https://O-SEU-DOMINIO/img/og.jpg"` (as redes sociais exigem URL absoluto).
2. Acrescentar `<link rel="canonical" href="https://O-SEU-DOMINIO/">` e um `sitemap.xml`.
3. Confirmar o texto legal do rodapé («Livro de Reclamações», aviso de privacidade) com quem trata da contabilidade ou do jurídico da empresa.

## Notas

- Os nomes de sumos e descrições vieram do desenho. Não há preços nem horários porque o desenho não os tem: se quiser mostrá-los, é só acrescentar no `index.html` (horários de loja podem entrar também no `ld+json` com `openingHours`).
- A morada e as coordenadas de Lisboa (UBBO, Amadora) devem ser confirmadas: as coordenadas só servem para ordenar por distância, mas convém estarem certas.
- As ligações «Queres abrir uma loja?» e «Suco Bagaço Brasil» vêm do desenho e não foram testadas (este ambiente não acede a esses domínios).
