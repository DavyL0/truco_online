// Truco Mineiro 3D — servidor local (Node 16+, sem dependências).
// O servidor é a autoridade do jogo: as cartas dos outros jogadores nunca são enviadas ao seu navegador.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { RoomStore } = require('./src/services/RoomStore');
const { ClientRegistry } = require('./src/services/ClientRegistry');
const { BotAI } = require('./src/ai/BotAI');

const argv = process.argv.slice(2);
const argumentValue = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const PORT = Number(process.env.PORT || argumentValue('--port') || 3000);
const HOST = process.env.HOST || argumentValue('--host') || '0.0.0.0';
const roomStore = new RoomStore();
const clientRegistry = new ClientRegistry();

const RATE_LIMITS = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 240;
function checkRateLimit(ip) {
  const now = Date.now();
  const current = RATE_LIMITS.get(ip);
  if (!current || now > current.resetAt) {
    RATE_LIMITS.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_MAX_REQUESTS;
}

function clean(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function commit(room) {
  if (!room) return;
  room.rev = (room.rev || 0) + 1;
  const code = room.code;
  for (const client of clientRegistry.list(code)) {
    client.res.write('data: ' + JSON.stringify(room.viewFor(client.id)) + '\n\n');
  }
}

function scheduleNextDeal(room) {
  const roomReference = room;
  if (roomReference.botTimer) {
    clearTimeout(roomReference.botTimer);
    roomReference.botTimer = null;
  }
  setTimeout(() => {
    roomReference.deal();
    commit(roomReference);
    scheduleBotTurn(roomReference);
  }, 2600);
}

function scheduleBotTurn(room) {
  if (!room || room.phase !== 'play') return;
  if (room.botTimer) {
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }

  let actorSeat = -1;
  if (room.pend) {
    for (let i = 0; i < room.n; i += 1) {
      if (room.players[i] && room.players[i].isBot && i % 2 !== room.pend.team) {
        actorSeat = i;
        break;
      }
    }
  } else if (room.players[room.turn] && room.players[room.turn].isBot) {
    actorSeat = room.turn;
  }

  if (actorSeat < 0) return;

  const delay = 900 + Math.floor(Math.random() * 700);
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    const player = room.players[actorSeat];
    const decision = BotAI.decide(room, actorSeat);
    if (!decision) return;
    room.handleAction({
      type: decision.type,
      c: decision.c || '',
      id: player.id,
    });
    if (room.phase === 'show') {
      scheduleNextDeal(room);
    }
    commit(room);
    scheduleBotTurn(room);
  }, delay);
}

function handleJsonResponse(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (error) {
        resolve({});
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://x');
    const url = requestUrl;
    if (!checkRateLimit(req.socket.remoteAddress || 'unknown')) {
      return handleJsonResponse(res, { error: 'Muitas requisições. Tente novamente em instantes.' }, 429);
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      const code = clean(url.searchParams.get('code'), 8).toUpperCase();
      const id = clean(url.searchParams.get('id'), 40);
      const token = clean(url.searchParams.get('token'), 80);
      const room = roomStore.get(code);
      if (!room) {
        res.writeHead(404);
        return res.end();
      }
      const player = room.players.find((item) => item.id === id);
      if (!player || player.isBot || player.token !== token) {
        res.writeHead(403);
        return res.end();
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const client = { id, res };
      clientRegistry.add(code, client);
      res.write('data: ' + JSON.stringify(room.viewFor(id)) + '\n\n');

      const heartbeat = setInterval(() => {
        res.write(': hb\n\n');
      }, 20000);

      req.on('close', () => {
        clearInterval(heartbeat);
        clientRegistry.remove(code, client);
      });
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      const body = await readBody(req);
      const id = clean(body.id, 40);
      const name = clean(body.name, 14).trim() || 'Jogador';

      if (!id) {
        return handleJsonResponse(res, { error: 'id inválido' }, 400);
      }

      if (url.pathname === '/api/create') {
        const room = roomStore.create(id, name);
        return handleJsonResponse(res, { code: room.code, token: room.players[0].token });
      }

      if (url.pathname === '/api/join') {
        const code = clean(body.code, 8).toUpperCase();
        const room = roomStore.get(code);
        if (!room) {
          return handleJsonResponse(res, { error: 'Sala não encontrada.' });
        }
        if (!room.hasPlayer(id)) {
          if (room.phase !== 'lobby') {
            return handleJsonResponse(res, { error: 'A partida já começou.' });
          }
          if (room.players.length >= 4) {
            return handleJsonResponse(res, { error: 'Sala cheia.' });
          }
          room.addPlayer(id, name);
          commit(room);
        }
        const player = room.players.find((item) => item.id === id);
        return handleJsonResponse(res, { code, token: player ? player.token : null });
      }

      if (url.pathname === '/api/act') {
        const code = clean(body.code, 8).toUpperCase();
        const token = clean(body.token, 80);
        const room = roomStore.get(code);
        if (!room) {
          return handleJsonResponse(res, { error: 'sala' }, 404);
        }
        const player = room.players.find((item) => item.id === id);
        if (!player || player.isBot) {
          return handleJsonResponse(res, { error: 'jogador inválido' }, 403);
        }
        if (player.token !== token) {
          return handleJsonResponse(res, { error: 'token inválido' }, 403);
        }

        const beforePhase = room.phase;
        room.handleAction({
          type: clean(body.type, 10),
          c: clean(body.c, 3),
          id,
        });

        if (room.phase === 'show' && beforePhase === 'play') {
          scheduleNextDeal(room);
        }

        commit(room);
        scheduleBotTurn(room);
        return handleJsonResponse(res, { ok: 1 });
      }

      return handleJsonResponse(res, { error: 'rota' }, 404);
    }

    if (req.method === 'GET' && url.pathname.startsWith('/texture/')) {
      const relativePath = decodeURIComponent(url.pathname.slice('/texture/'.length));
      const textureDirectory = path.join(__dirname, 'src', 'texture');
      const filePath = path.normalize(path.join(textureDirectory, relativePath));
      if (!filePath.startsWith(textureDirectory)) {
        res.writeHead(403);
        return res.end('Acesso negado');
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404);
          return res.end('Textura não encontrada');
        }
        const extension = path.extname(filePath).toLowerCase();
        const contentType =
          extension === '.jpg' || extension === '.jpeg'
            ? 'image/jpeg'
            : extension === '.png'
            ? 'image/png'
            : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
      return;
    }

    fs.readFile(
      path.join(__dirname, 'public', 'index.html'),
      (error, data) => {
        if (error) {
          res.writeHead(500);
          return res.end('index.html não encontrado');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      }
    );
  })
  .listen(PORT, HOST, () => {
    console.log('\n🃏 Truco Mineiro 3D rodando!\n  Local:  http://localhost:' + PORT);
    for (const networkInterface of Object.values(os.networkInterfaces()).flat()) {
      if (networkInterface && networkInterface.family === 'IPv4' && !networkInterface.internal) {
        console.log(
          '  Rede:   http://' + networkInterface.address + ':' + PORT + '  (amigos na mesma rede Wi-Fi)'
        );
      }
    }
    console.log('');
  });