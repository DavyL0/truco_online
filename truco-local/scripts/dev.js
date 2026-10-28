'use strict';

const { spawn } = require('child_process');
const path = require('path');

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const host = argumentValue('--host') || process.env.HOST || 'localhost';
const port = argumentValue('--port') || process.env.PORT || '5173';
const gameServerPort = process.env.GAME_SERVER_PORT || '3311';

const childOptions = {
  stdio: 'inherit',
  detached: process.platform !== 'win32',
};

const rootDir = path.resolve(__dirname, '..');
const serverEntryPoint = path.join(rootDir, 'server.js');
const viteEntryPoint = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const viteOptions = {
  ...childOptions,
  cwd: rootDir,
};

const children = [
  spawn(process.execPath, [serverEntryPoint, '--host', '127.0.0.1', '--port', gameServerPort], childOptions),
  spawn(process.execPath, [viteEntryPoint, '--host', host, '--port', port], viteOptions),
];

let isStopping = false;

function stopProcessTree(child, signal) {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).unref();
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function stop() {
  if (isStopping) return;
  isStopping = true;
  for (const child of children) {
    stopProcessTree(child, 'SIGTERM');
  }
  setTimeout(() => {
    for (const child of children) {
      stopProcessTree(child, 'SIGKILL');
    }
    process.exit(0);
  }, 1500).unref();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

for (const child of children) {
  child.on('error', (error) => {
    console.error(`Falha ao iniciar processo: ${error.message}`);
    stop();
  });
  child.on('exit', (code, signal) => {
    if (!isStopping && code !== 0 && signal !== 'SIGTERM') {
      console.error(`Processo filho encerrado com código ${code}. Encerrando ambiente de desenvolvimento.`);
      stop();
    }
  });
}
