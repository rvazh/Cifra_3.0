# CIFRA

Gestão financeira pessoal — versão web.
Feito com **React + React Router**, empacotado com **Vite**.

## Rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # abre em http://localhost:5173 e atualiza sozinho ao salvar
```

Para gerar a versão final (pasta `dist/`):

```bash
npm run build
npm run preview  # confere a versão final localmente
```

## Estrutura

```
src/
├── main.jsx               ponto de entrada (liga o React Router)
├── App.jsx                rotas: /, /quem-somos, /planos, /blog, /entrar
├── styles/global.css      cores (variáveis), fonte e estilos básicos
├── components/
│   ├── Header.jsx/.css    logo + menu + botão Entrar
│   ├── Footer.jsx/.css    rodapé
│   ├── Logo.jsx/.css      logo (provisória — veja o comentário no arquivo)
│   ├── PainelExemplo.jsx  ilustração do app na página inicial
│   └── Icones.jsx         ícones em SVG
└── pages/
    ├── Inicio.jsx/.css    página inicial
    └── EmBreve.jsx/.css   página provisória das outras seções
```

**Trocar as cores:** edite as variáveis no topo de `src/styles/global.css`.

## Publicar no GitHub Pages

O arquivo `.github/workflows/deploy.yml` publica o site sozinho a cada `git push` na branch `main`.
Só é preciso ativar uma vez: no GitHub, vá em **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.

As páginas usam endereços com `#` (ex.: `.../cifra/#/planos`), o que funciona no GitHub Pages sem configuração extra.
