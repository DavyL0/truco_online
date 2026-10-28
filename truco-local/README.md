# Truco Mineiro 3D

Truco Mineiro multiplayer em 3D com React, Three.js e salas por link. Projeto monolito: servidor Node (sem dependências de produção) + client React/TypeScript no mesmo repositório, com um único `package.json`.

## Subindo o projeto

```bash
npm install        # primeira vez (instala tudo, client + servidor)

npm run dev        # desenvolvimento: sobe o jogo em :3311 e o Vite em :5173
                   # acesse http://localhost:5173

npm run build      # gera o client em dist/
npm start          # produção: tudo servido pelo Node em http://localhost:3000
```

## Estrutura

```
server.js               # entry point do servidor (autoridade do jogo)
scripts/dev.js          # sobe servidor + Vite juntos em dev
index.html              # entry point do client (Vite)
vite.config.ts          # dev server, proxy /api e /texture para o jogo (:3311)
src/
  client/               # React + TypeScript + Three.js (alias "@/" -> src/client)
  server/               # HTTP server, rotas /api, SSE, arquivos estáticos
  services/             # RoomStore, ClientRegistry
  models/               # regras do jogo (Room)
  ai/                   # BotAI
  texture/              # texturas servidas em /texture/*
  utils/, constants.js
static/index.html       # client vanilla de fallback (quando dist/ não existe)
tests/                  # testes do servidor (node --test)
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Dev: jogo (:3311) + Vite com proxy (:5173) |
| `npm start` | Produção: Node serve a API + o `dist/` em :3000 |
| `npm run build` | `tsc -b` + build do client para `dist/` |
| `npm test` | Testes do servidor |
| `npm run check` | Checa sintaxe dos arquivos do servidor |
| `npm run lint` | ESLint no client |

## Deploy (front na Vercel + servidor no Render)

O servidor do jogo é stateful (salas em memória, SSE, timers de bot) — ele precisa de um host Node contínuo. Não funciona como função serverless.

O repositório tem o jogo dentro da pasta `truco-local`; os dois serviços usam o mesmo repo e apontam o **Root Directory** para ela.

### 1. Servidor no Render (https://dashboard.render.com → New → Web Service)

- Conecte o repositório do GitHub. O `render.yaml` na pasta `truco-local` já traz a configuração (Render detecta o blueprint automaticamente se o arquivo estiver na raiz do repo — caso contrário, configure manualmente):
  - **Root Directory:** `truco-local`
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
  - **Environment Variables:**
    - `HOST` = `0.0.0.0`
    - `ALLOWED_ORIGINS` = `https://truco-online-eight.vercel.app`
- Ao final, anote a URL pública (ex.: `https://truco-api.onrender.com`).

⚠️ No plano gratuito o serviço "dorme" após ~15 min sem tráfego. Para segurar o plano grátis, o repositório já tem `.github/workflows/keep-alive.yml` — basta:

1. No GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `RENDER_URL` · Value: a URL do servidor (ex.: `https://truco-api.onrender.com`)
2. Faça merge/push do workflow para a branch padrão (o cron só roda nela).

O workflow pinga o servidor a cada 10 minutos. Observações: o GitHub pode pausar crons de repositórios sem atividade há 60+ dias (você recebe um e-mail e pode reativar com um clique), e o plano grátis do Render tem teto de 750 h/mês — um serviço 24/7 usa ~720 h, então evite manter outros serviços acordados na mesma conta.

### 2. Front na Vercel (https://vercel.com)

- **Root Directory:** `truco-local` (o `vercel.json` já define o build do Vite).
- **Environment Variables** (seção do projeto → Settings → Environment Variables):
  - `VITE_API_URL` = URL do servidor do passo 1 (ex.: `https://truco-api.onrender.com`) — **sem barra no final**
- Faça **Redeploy** (a variável só entra no build novo).

### 3. Validar

Abra o app na Vercel, crie uma sala e confira no DevTools (Network) se o `POST /api/create` vai para o domínio do Render e retorna 200 com JSON.

## API

- `POST /api/create` — `{ id, name }` → `{ code, token }`
- `POST /api/join` — `{ id, name, code }` → `{ code, token }`
- `POST /api/act` — `{ id, code, token, type, c? }` → `{ ok }`
- `GET /api/events?code=&id=&token=` — stream de estado (SSE)

O servidor é a autoridade do jogo: as cartas dos adversários nunca chegam ao seu navegador.
