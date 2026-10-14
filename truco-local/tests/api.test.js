const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

function startServer() {
  return new Promise((resolve, reject) => {
    const port = 30000 + Math.floor(Math.random() * 10000);
    const child = spawn(process.execPath, ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Servidor não iniciou a tempo'));
    }, 5000);

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (output.includes('rodando!')) {
        clearTimeout(timeout);
        resolve({ child, port });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

test('security token flow through HTTP', async () => {
  const { child, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;

  try {
    const created = await fetch(`${base}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'h1', name: 'Human' }),
    }).then((response) => response.json());

    assert.ok(created.code);
    assert.ok(created.token);

    const joined = await fetch(`${base}/api/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: created.code, id: 'h2', name: 'Human 2' }),
    }).then((response) => response.json());
    assert.ok(joined.token);

    const invalidAction = await fetch(`${base}/api/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: created.code, id: 'h1', type: 'start', token: 'invalid' }),
    }).then((response) => response.json());
    assert.equal(invalidAction.error, 'token inválido');

    const validAction = await fetch(`${base}/api/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: created.code, id: 'h1', type: 'start', token: created.token }),
    }).then((response) => response.json());
    assert.deepEqual(validAction, { ok: 1 });

    const invalidStream = await fetch(`${base}/api/events?code=${created.code}&id=h1&token=bad`);
    assert.equal(invalidStream.status, 403);

    const validStream = await fetch(`${base}/api/events?code=${created.code}&id=h1&token=${created.token}`);
    assert.equal(validStream.status, 200);
    validStream.body.cancel();
  } finally {
    child.kill();
  }
});