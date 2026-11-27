import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('player accounts, invitations and game reports', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'goop-player-test-'));
  const adminCode = randomUUID();
  // Each Node test file runs in its own process. Never use a configured hosted database here.
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  delete process.env.RENDER;
  process.env.CHAT_DB_FILE = join(dir, 'test.sqlite');
  process.env.CHAT_DATA_FILE = join(dir, 'empty.json');
  process.env.GOOP_CHAT_ADMIN_CODE = adminCode;

  const { chat } = await import('../backend/chat.mjs');
  const server = createServer((req, res) => chat(req, res, req.url, []));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/chat/';
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });

  async function call(path, token, data, status = 200, visit) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (visit) headers['X-Goop-Visit'] = visit;
    const response = await fetch(base + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers,
      body: JSON.stringify(data)
    });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }

  const password = randomUUID();
  const first = (await call('signup', null, { name: 'firstplayer', password })).token;
  const second = (await call('signup', null, { name: 'secondplayer', password })).token;
  const bookmark = { kind: 'bookmark', name: 'Example', url: 'https://example.org/' };
  const favorite = { kind: 'favorite', source: 'offline', name: '2048' };
  const save = (op, item) => ({ changes: [{ op, item }] });

  await Promise.all([bookmark, favorite].map(item => call('player-items', first, save('put', item))));
  assert.equal((await call('player-items', first)).items.length, 2);
  assert.deepEqual((await call('player-items', second)).items, []);
  await call('player-items', first, save('remove', bookmark));
  assert.deepEqual((await call('player-items', first)).items, [favorite]);
  await call('player-items', first, save('put', { ...bookmark, url: 'data:text/plain,invalid' }), 400);

  const dm = await call('dm', first, { handle: 'secondplayer' });
  const invite = { source: 'multiplayer', name: 'Gartic Phone', roomUrl: 'https://garticphone.com/en/?c=test-room' };
  for (const room of ['general', dm.id]) {
    const path = 'messages/' + room;
    const message = { invite, nonce: randomUUID() };
    const receipt = await call(path, first, message);
    assert.equal((await call(path, first, message)).id, receipt.id);
    const history = await call(path, second);
    assert.deepEqual(history.messages.find(m => m.id === receipt.id).invite, invite);
  }
  await call('messages/general', first, {
    invite: { ...invite, roomUrl: 'https://example.org/' }, nonce: randomUUID()
  }, 400);

  await call('game-report', second, { game: favorite, detail: 'The board froze.' });
  await call('game-reports', second, undefined, 403);
  const { continuation } = await call('signin', null, { name: adminCode });
  const admin = await call('signin', null, { name: 'firstplayer', password, continuation });
  const controller = new AbortController();
  try {
    const stream = await fetch(base + 'visit-connection', {
      headers: { Authorization: 'Bearer ' + admin.token, 'X-Goop-Visit': admin.visit },
      signal: controller.signal
    });
    assert.equal(stream.status, 200);
    await stream.body.getReader().read();
    const reports = () => call('game-reports', admin.token, undefined, 200, admin.visit);
    const [report] = (await reports()).reports;
    assert.equal(report.detail, 'The board froze.');
    await call('game-reports', admin.token, { id: report.id }, 200, admin.visit);
    assert.deepEqual((await reports()).reports, []);
  } finally {
    controller.abort();
  }
});
