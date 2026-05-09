# CRM Loop — Frontend

SPA em **React 16** gerada com **Create React App** (`react-scripts`). Comunica com o backend via **REST (axios)** e **Socket.IO** para tempo real (tickets, canais WhatsApp, etc.).

## Pré-requisitos

- **Node.js** compatível com o CRA atual (projeto usa `openssl-legacy-provider` nos scripts npm).
- **Backend** CRM Loop rodando e acessível (porta padrão local típica: **8080**).

## Variáveis de ambiente

Copie o exemplo e ajuste valores:

```bash
cp .env.exemple .env
```

| Variável | Descrição |
|----------|-----------|
| `REACT_APP_BACKEND_URL` | URL base da API (`http://localhost:8080` em desenvolvimento). Usada também para montar URLs de arquivos em `/public/`. |
| `REACT_APP_FACEBOOK_APP_ID` | App ID Meta para Embedded Signup / conexão de canais. |
| `REACT_APP_REQUIRE_BUSINESS_MANAGEMENT` | Regra de permissões ao conectar WhatsApp oficial (`TRUE`/`FALSE`). |
| `REACT_APP_NUMBER_SUPPORT` | Número (exibição/link suporte WhatsApp nas telas que usam `wa.me`). |
| Outras (`GENERATE_SOURCEMAP`, `BUILD_PATH`, flags ESLint/TSC) | Veja [.env.exemple](.env.exemple). |

Runtime em alguns deploys pode injetar config via `window.ENV` (consulte [`src/config.js`](src/config.js)).

## Scripts NPM

| Comando | Observação |
|---------|-------------|
| `npm run start:dev` | **Windows**: define `NODE_OPTIONS` e sobe o dev server (`react-scripts start`). |
| `npm start` | Formato esperado em shell Unix (`export`). No Windows prefira `start:dev`. |
| `npm run build` | Build de produção (memória e OpenSSL herdados configurados no script Unix). |
| `npm run winBuild` | `react-scripts build` direto — útil no Windows se outros scripts falharem. |

O dev server CRA costuma rodar em **http://localhost:3000**. O backend deve aceitar CORS/cookies conforme a configuração do repositório backend.

## Estrutura do código (resumo)

- [`src/routes/index.js`](src/routes/index.js) — Rotas e layout autenticado.
- [`src/routes/Route.js`](src/routes/Route.js) — Rotas privadas, redirecionamento de login e bloqueio por **empresa vencida** (`/financeiro-aberto`).
- [`src/services/api.js`](src/services/api.js) — Cliente axios (`withCredentials`, `baseURL` do env).
- [`src/hooks/useAuth.js`](src/hooks/useAuth.js) — Token no `localStorage`, interceptors e refresh (`/auth/refresh_token`).
- [`src/App.js`](src/App.js) — Tema claro/escuro, logos/cores via configurações públicas, `react-query`.
- `src/pages/` — Telas; `src/components/` — Componentes reutilizáveis; `src/context/` — Estado global (Auth, Tickets, WhatsApps, Socket, etc.).

## IA e contexto do projeto

Para o assistente no Cursor, o skill do repositório **`.cursor/skills/frontend-context/`** descreve arquitetura, mapa de rotas e convenções — use-o em tarefas de frontend.

## Testes

```bash
npm test
```

(Usa os scripts CRA com Node options conforme [`package.json`](package.json).)
