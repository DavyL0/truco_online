'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { BotAI } = require('../ai/BotAI');

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 240;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

function clean(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

// CORS: defina ALLOWED_ORIGINS com as origens do front separadas por vírgula
// (ex.: "https://truco-online-eight.vercel.app,https://*.vercel.app").
// Entradas começando com "*." casam qualquer subdomínio (útil para os URLs de
// preview que a Vercel gera por deploy). Use "*" para liberar qualquer origem.
function corsHeaders(request) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.origin;
  if (!origin) return {};
  const isAllowed = allowed.includes('*') || allowed.some((entry) => {
    const wildcard = entry.indexOf('*.');
    if (wildcard >= 0) return origin.endsWith(entry.slice(wildcard + 1));
    return entry === origin;
  });
  if (isAllowed) {
    return {
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
  return {};
}

function sendJson(response, payload, statusCode = 200, extraHeaders = {}) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Arquivo não encontrado');
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(data);
  });
}

function resolveInsideDirectory(directory, relativePath) {
  const basePath = path.resolve(directory);
  const filePath = path.resolve(basePath, relativePath);
  return filePath.startsWith(basePath) ? filePath : null;
}

function createHttpServer({ roomStore, clientRegistry, staticPaths }) {
  const rateLimits = new Map();

  function checkRateLimit(ip) {
    const now = Date.now();
    const current = rateLimits.get(ip);
    if (!current || now > current.resetAt) {
      rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return true;
    }
    current.count += 1;
    return current.count <= RATE_MAX_REQUESTS;
  }

  function commit(room) {
    if (!room) return;
    room.rev = (room.rev || 0) + 1;
    for (const client of clientRegistry.list(room.code)) {
      client.res.write(`data: ${JSON.stringify(room.viewFor(client.id))}\n\n`);
    }
  }

  function scheduleNextDeal(room) {
    if (room.botTimer) clearTimeout(room.botTimer);
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      room.deal();
      commit(room);
      scheduleBotTurn(room);
    }, 2600);
  }

  function scheduleBotTurn(room) {
    if (!room || room.phase !== 'play') return;
    if (room.botTimer) clearTimeout(room.botTimer);

    let actorSeat = -1;
    if (room.pend) {
      for (let seat = 0; seat < room.n; seat += 1) {
        const player = room.players[seat];
        if (player?.isBot && seat % 2 !== room.pend.team) {
          actorSeat = seat;
          break;
        }
      }
    } else if (room.players[room.turn]?.isBot) {
      actorSeat = room.turn;
    }

    if (actorSeat < 0) return;

    const delay = 900 + Math.floor(Math.random() * 700);
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      const player = room.players[actorSeat];
      const decision = BotAI.decide(room, actorSeat);
      if (!decision) return;

      room.handleAction({ type: decision.type, c: decision.c || '', id: player.id });
      if (room.phase === 'show') scheduleNextDeal(room);
      commit(room);
      scheduleBotTurn(room);
    }, delay);
  }

  function handleEventStream(request, response, url) {
    const code = clean(url.searchParams.get('code'), 8).toUpperCase();
    const id = clean(url.searchParams.get('id'), 40);
    const token = clean(url.searchParams.get('token'), 80);
    const room = roomStore.get(code);
    const player = room?.players.find((item) => item.id === id);

    if (!room || !player || player.isBot || player.token !== token) {
      response.writeHead(403);
      response.end();
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders(request),
    });

    const client = { id, res: response };
    clientRegistry.add(code, client);
    response.write(`data: ${JSON.stringify(room.viewFor(id))}\n\n`);

    const heartbeat = setInterval(() => response.write(': hb\n\n'), 20000);
    request.on('close', () => {
      clearInterval(heartbeat);
      clientRegistry.remove(code, client);
    });
  }

  async function handleApiPost(request, response, url) {
    const reply = (payload, statusCode = 200) => sendJson(response, payload, statusCode, corsHeaders(request));
    const body = await readBody(request);
    const id = clean(body.id, 40);
    const name = clean(body.name, 14).trim() || 'Jogador';

    if (!id) {
      reply({ error: 'id inválido' }, 400);
      return;
    }

    if (url.pathname === '/api/create') {
      const room = roomStore.create(id, name);
      reply({ code: room.code, token: room.players[0].token });
      return;
    }

    if (url.pathname === '/api/join') {
      const code = clean(body.code, 8).toUpperCase();
      const room = roomStore.get(code);
      if (!room) {
        reply({ error: 'Sala não encontrada.' });
        return;
      }
      if (!room.hasPlayer(id)) {
        if (room.phase !== 'lobby') {
          reply({ error: 'A partida já começou.' });
          return;
        }
        if (room.players.length >= 4) {
          reply({ error: 'Sala cheia.' });
          return;
        }
        room.addPlayer(id, name);
        commit(room);
      }
      const player = room.players.find((item) => item.id === id);
      reply({ code, token: player?.token ?? null });
      return;
    }

    if (url.pathname === '/api/act') {
      const code = clean(body.code, 8).toUpperCase();
      const token = clean(body.token, 80);
      const room = roomStore.get(code);
      const player = room?.players.find((item) => item.id === id);

      if (!room) {
        reply({ error: 'sala' }, 404);
        return;
      }
      if (!player || player.isBot) {
        reply({ error: 'jogador inválido' }, 403);
        return;
      }
      if (player.token !== token) {
        reply({ error: 'token inválido' }, 403);
        return;
      }

      const previousPhase = room.phase;
      room.handleAction({ type: clean(body.type, 10), c: clean(body.c, 3), id });
      if (room.phase === 'show' && previousPhase === 'play') scheduleNextDeal(room);
      commit(room);
      scheduleBotTurn(room);
      reply({ ok: 1 });
      return;
    }

    reply({ error: 'rota' }, 404);
  }

  function handleStaticFile(response, url) {
    if (url.pathname.startsWith('/texture/')) {
      const relativePath = decodeURIComponent(url.pathname.slice('/texture/'.length));
      const filePath = resolveInsideDirectory(staticPaths.textureDir, relativePath);
      if (filePath) sendFile(response, filePath);
      else {
        response.writeHead(403);
        response.end('Acesso negado');
      }
      return;
    }

    if (url.pathname.startsWith('/assets/')) {
      const relativePath = decodeURIComponent(url.pathname.slice(1));
      const filePath = resolveInsideDirectory(staticPaths.clientDist, relativePath);
      if (filePath && fs.existsSync(filePath)) sendFile(response, filePath);
      else {
        response.writeHead(404);
        response.end('Arquivo não encontrado');
      }
      return;
    }

    const builtIndex = path.join(staticPaths.clientDist, 'index.html');
    const fallbackIndex = path.join(staticPaths.staticDir, 'index.html');
    const indexPath = fs.existsSync(builtIndex) ? builtIndex : fallbackIndex;
    sendFile(response, indexPath);
  }

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (!checkRateLimit(request.socket.remoteAddress || 'unknown')) {
      sendJson(response, { error: 'Muitas requisições. Tente novamente em instantes.' }, 429, corsHeaders(request));
      return;
    }

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      response.writeHead(204, corsHeaders(request));
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/events') {
      handleEventStream(request, response, url);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/')) {
      await handleApiPost(request, response, url);
      return;
    }

    if (request.method === 'GET') {
      handleStaticFile(response, url);
      return;
    }

    sendJson(response, { error: 'Método não permitido' }, 405, corsHeaders(request));
  });
}

module.exports = { createHttpServer };
