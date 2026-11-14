import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

// Exercise the actual compiled entrypoint without connecting to a database.
const sentinel = 'credential-that-must-never-appear-in-logs';
const child = spawn(process.execPath, ['--input-type=module', '-e', `
  const { default: app } = await import('./dist/app.js');
  const server = app.listen(0, '127.0.0.1', () => {
    console.log('READY:' + server.address().port);
  });
`], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    FRONTEND_URL: 'https://frontend.example.invalid',
    SUPABASE_URL: 'https://supabase.example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'nonfunctional-test-key-at-least-twenty-characters',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', data => { logs += data.toString(); });
child.stderr.on('data', data => { logs += data.toString(); });
const deadline = setTimeout(() => child.kill(), 15000);

try {
  const port = await new Promise((resolve, reject) => {
    child.stdout.on('data', () => {
      const match = logs.match(/READY:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
    child.once('error', reject);
    child.once('exit', () => reject(new Error('App exited before readiness')));
  });
  const base = `http://127.0.0.1:${port}`;
  const health = await fetch(`${base}/health?token=${sentinel}`, {
    headers: { cookie: `session=${sentinel}`, 'x-vercel-oidc-token': sentinel },
  });
  assert.equal(health.status, 200);
  assert.match(health.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const me = await fetch(`${base}/api/users/me`);
  assert.equal(me.status, 401);
  assert.match(me.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await me.json(), { error: 'Missing Bearer token' });
  const missing = await fetch(`${base}/missing-route`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
  await missing.arrayBuffer();
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(logs.includes('"statusCode":401'), 'Request status must remain observable');
  assert.ok(!logs.includes(sentinel), 'Headers and query credentials must not be logged');
  console.log('PASS: entrypoint import, health JSON, unauthenticated 401 JSON, 404 JSON, credential-free logs');
} finally {
  clearTimeout(deadline);
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}
