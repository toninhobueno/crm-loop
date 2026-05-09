# Backend CRM Loop

API backend em Node.js + TypeScript para autenticação, atendimento (tickets), mensagens, contatos, campanhas, integrações (webhooks/WhatsApp) e rotinas assíncronas.

## Requisitos

- Node.js 18+ (recomendado)
- NPM 9+
- Banco de dados configurado no `.env` (MySQL/Postgres, conforme ambiente)
- Redis (necessário para filas/Bull quando habilitado)

## Instalação

1. Entre na pasta do backend:

```bash
cd backend
```

2. Instale as dependências:

```bash
npm install
```

3. Configure variáveis de ambiente:

- Crie/ajuste o arquivo `.env` em `backend/.env`.
- Garanta pelo menos: porta da API, credenciais do banco, JWT, frontend URL, integrações habilitadas.

4. Rode as migrations:

```bash
npm run db:migrate
```

5. (Opcional) Rode seeds:

```bash
npm run db:seed
```

### Migrations, Sequelize CLI e pasta `dist`

O projeto compila TypeScript para **`dist/`** (veja `tsconfig.json`). O arquivo **`.sequelizerc`** na raiz do `backend` configura o **sequelize-cli** para ler:

| Caminho usado pelo CLI | Finalidade |
|------------------------|------------|
| `dist/config/database.js` | Configuração de conexão (gerada a partir de `src/config/database.ts`) |
| `dist/database/migrations` | Migrações compiladas (`src/database/migrations/*.ts` → `.js`) |
| `dist/database/seeds` | Seeds compilados |

Por isso os scripts **`db:migrate`** e **`db:seed`** executam **`npm run build`** antes do Sequelize: sem a pasta **`dist`** o CLI falha com erro do tipo `Cannot find ... dist/config/database.js`.

**Fluxo recomendado**

```bash
cd backend
npm run db:migrate
```

Equivalente manual:

```bash
npm run build
npx sequelize db:migrate
```

**Desenvolvimento:** `npm run dev:server` usa **ts-node** e não exige `dist` para rodar a API — só o **migrate/seed via CLI** dependem do build.

**Se `npm run build` falhar:** corrija os erros do TypeScript antes de rodar migrations; o `tsc` precisa terminar com sucesso para atualizar `dist/`.

## Execução

### Desenvolvimento

Inicia com recarga automática (ts-node-dev):

```bash
npm run dev:server
```

### Build + execução compilada

1. Compilar:

```bash
npm run build
```

2. Iniciar servidor compilado:

```bash
npm start
```

## Comandos úteis

- `npm run db:migrate`: `build` + aplica migrações (usa `.sequelizerc` → `dist/` — ver secção **Migrations** acima).
- `npm run db:seed`: `build` + executa seeds.
- `npm run watch`: compila TypeScript em modo watch.
- `npm run lint`: valida padrão de código com ESLint.
- `npm test`: executa testes (com fluxo de migrate/seed em ambiente de teste).
- `npm run fix:birthday-settings`: script de ajuste de configuração de aniversários.
- `npm run fix:floup-columns`: script de correção de colunas do plugin Floup.

## Estrutura resumida

- `src/routes`: definição de endpoints
- `src/controllers`: camada HTTP
- `src/services`: regras de negócio
- `src/models`: modelos Sequelize
- `src/database/migrations`: histórico de schema
- `src/jobs` e `src/queues`: processamento assíncrono

## Observações operacionais

- O boot da aplicação (`src/server.ts`) inicializa sessões de WhatsApp, filas e jobs de rotina.
- Endpoints protegidos usam JWT via middleware `isAuth`.
- Ajustes em regras de negócio devem considerar escopo por empresa (`companyId`) e efeitos em fila/webhook/socket.
