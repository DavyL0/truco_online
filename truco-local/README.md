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

## Deploy (monolito no Render)

O Node serve o front (`dist/`) e a API na **mesma URL** — sem CORS, sem variável de ambiente no client. O servidor do jogo é stateful (salas em memória, SSE, timers de bot), por isso precisa de um host Node contínuo — não funciona como função serverless.

### 1. Criar o serviço (https://dashboard.render.com → New → Web Service)

- Conecte o repositório do GitHub. O `render.yaml` na raiz do repo já traz a configuração:
  - **Root Directory:** `truco-local`
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
  - **Environment Variables:** `HOST` = `0.0.0.0` (o único necessário)
- Pronto — a URL pública do Render (ex.: `https://truco-online-1-wltb.onrender.com`) é o jogo completo.

### 2. Segurar o plano grátis (keep-alive)

No plano gratuito o serviço "dorme" após ~15 min sem tráfego. O repositório já tem `.github/workflows/keep-alive.yml` — basta:

1. No GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `RENDER_URL` · Value: a URL do serviço (ex.: `https://truco-online-1-wltb.onrender.com`)
2. Faça merge/push do workflow para a branch padrão (o cron só roda nela).

O workflow pinga o servidor a cada 10 minutos. Observações: o GitHub pode pausar crons de repositórios sem atividade há 60+ dias (você recebe um e-mail e pode reativar com um clique), e o plano grátis do Render tem teto de 750 h/mês — um serviço 24/7 usa ~720 h, então evite manter outros serviços acordados na mesma conta.

### 3. Validar

Abra a URL do Render, crie uma sala e jogue. No DevTools (Network), o `POST /api/create` deve ir para o **mesmo domínio** da página e retornar 200 com JSON.

### Opcional: domínio próprio e Vercel

- Para um endereço mais amigável, o Render permite **custom domain** grátis (Settings → Custom Domains) — ex.: `truco.seudominio.com`.
- Se um dia quiser voltar a servir o front pela Vercel: defina `VITE_API_URL` nas variáveis de build do projeto Vercel (URL do servidor, sem barra no final) e liste as origens da Vercel em `ALLOWED_ORIGINS` no servidor (suporta wildcard, ex.: `https://*.vercel.app`).

## API

- `POST /api/create` — `{ id, name }` → `{ code, token }`
- `POST /api/join` — `{ id, name, code }` → `{ code, token }`
- `POST /api/act` — `{ id, code, token, type, c? }` → `{ ok }`
- `GET /api/events?code=&id=&token=` — stream de estado (SSE)

O servidor é a autoridade do jogo: as cartas dos adversários nunca chegam ao seu navegador.
