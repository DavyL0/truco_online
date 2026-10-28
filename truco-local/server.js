// Truco Mineiro 3D — servidor local (Node 16+, sem dependências).
// O servidor é a autoridade do jogo: as cartas dos outros jogadores nunca são enviadas ao seu navegador.
'use strict';

const os = require('os');
const path = require('path');
const { createHttpServer } = require('./src/server/createHttpServer');
const { ClientRegistry } = require('./src/services/ClientRegistry');
const { RoomStore } = require('./src/services/RoomStore');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const port = Number(process.env.PORT || argumentValue('--port') || 3000);
const host = process.env.HOST || argumentValue('--host') || '0.0.0.0';
const rootDir = __dirname;

const server = createHttpServer({
  roomStore: new RoomStore(),
  clientRegistry: new ClientRegistry(),
  staticPaths: {
    clientDist: path.join(rootDir, 'dist'),
    staticDir: path.join(rootDir, 'static'),
    textureDir: path.join(rootDir, 'src', 'texture'),
  },
});

server.listen(port, host, () => {
  console.log(`\nTruco Mineiro 3D rodando!\n  Local:  http://localhost:${port}`);
  for (const networkInterface of Object.values(os.networkInterfaces()).flat()) {
    if (networkInterface?.family === 'IPv4' && !networkInterface.internal) {
      console.log(`  Rede:   http://${networkInterface.address}:${port}  (amigos na mesma rede Wi-Fi)`);
    }
  }
  console.log('');
});
