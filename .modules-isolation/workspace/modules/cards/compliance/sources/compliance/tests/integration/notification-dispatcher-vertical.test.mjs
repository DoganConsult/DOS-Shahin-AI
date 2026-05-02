/**
 * W69 — /api/compliance/notification-dispatcher vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES,
} = require('../../dist/index.js');

function listen(app) {
  return new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r({ server: s, port: s.address().port }));
  });
}
function fetchJson(port, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, path, method,
      headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function makeClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('INSERT INTO') && s.includes('notifications')) {
        const row = {
          notification_id: `n-${++id}`,
          recipient_user_id: p[0], channel: p[1], subject: p[2], body: p[3],
          payload: typeof p[4] === 'string' ? JSON.parse(p[4]) : p[4],
          status: 'queued', attempts: '0', last_error: null,
          created_at: new Date(Date.now() + id).toISOString(),
          created_by: p[5], sent_at: null,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT notification_id')) {
        if (s.includes('WHERE notification_id = $1')) {
          const m = rows.find((r) => r.notification_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes("status = 'queued'")) {
          const out = rows.filter((r) => r.status === 'queued')
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          return { rows: out, rowCount: out.length };
        }
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND channel =')) { out = out.filter((r) => r.channel === p[i]); i++; }
        if (s.includes('AND recipient_user_id =')) { out = out.filter((r) => r.recipient_user_id === p[i]); i++; }
        out = out.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('notifications')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND channel =')) { out = out.filter((r) => r.channel === p[i]); i++; }
        if (s.includes('AND recipient_user_id =')) { out = out.filter((r) => r.recipient_user_id === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'sent'")) {
        const r = rows.find((x) => x.notification_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = 'sent'; r.sent_at = new Date().toISOString();
        r.attempts = String(Number(r.attempts) + 1); r.last_error = null;
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'failed'")) {
        const r = rows.find((x) => x.notification_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = 'failed'; r.attempts = String(Number(r.attempts) + 1);
        r.last_error = p[1];
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'cancelled'")) {
        const r = rows.find((x) => x.notification_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = 'cancelled';
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ hasPermission, handler } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    notificationDispatcherDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
      handler,
    },
  });
  return { app, client };
}

test('NOTIFICATION_CHANNELS + NOTIFICATION_STATUSES exposed', () => {
  assert.deepEqual(NOTIFICATION_CHANNELS.slice().sort(),
    ['email', 'in_app', 'sms', 'webhook']);
  assert.deepEqual(NOTIFICATION_STATUSES.slice().sort(),
    ['cancelled', 'failed', 'queued', 'sent']);
});

test('GET requires permission notification.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires permission notification.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'notification.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'email', subject: 's',
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing recipientUserId → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    channel: 'email', subject: 's',
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST bad channel → 400 bad_channel', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'pigeon', subject: 's',
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_channel');
});

test('POST enqueues queued notification', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'in_app', subject: 'Hello', body: 'world',
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'queued');
  assert.equal(r.body.data.channel, 'in_app');
  assert.equal(client._rows.length, 1);
});

test('POST /dispatch sends queued via handler', async () => {
  const seen = [];
  const { app, client } = buildApp({
    hasPermission: () => true,
    handler: (row) => { seen.push(row.notificationId); },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'email', subject: 'a',
  });
  await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u3', channel: 'email', subject: 'b',
  });
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher/dispatch', 'POST', {});
  server.close();
  assert.equal(r.body.data.scanned, 2);
  assert.equal(r.body.data.sent, 2);
  assert.equal(r.body.data.failed, 0);
  assert.equal(seen.length, 2);
  assert.ok(client._rows.every((r) => r.status === 'sent'));
});

test('POST /dispatch failures are captured + attempts incremented', async () => {
  const { app, client } = buildApp({
    hasPermission: () => true,
    handler: () => { throw new Error('smtp down'); },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'email', subject: 'a',
  });
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher/dispatch', 'POST', {});
  server.close();
  assert.equal(r.body.data.failed, 1);
  assert.equal(r.body.data.sent, 0);
  assert.equal(client._rows[0].status, 'failed');
  assert.match(client._rows[0].last_error, /smtp down/);
  assert.equal(client._rows[0].attempts, '1');
});

test('POST /:id/cancel marks cancelled when queued', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const created = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'sms', subject: 'a',
  });
  const id = created.body.data.notificationId;
  const r = await fetchJson(port, `/api/compliance/notification-dispatcher/${id}/cancel`, 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'cancelled');
});

test('POST /:id/cancel on sent → 409 bad_state', async () => {
  const { app } = buildApp({ hasPermission: () => true, handler: () => {} });
  const { server, port } = await listen(app);
  const created = await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'sms', subject: 'a',
  });
  const id = created.body.data.notificationId;
  await fetchJson(port, '/api/compliance/notification-dispatcher/dispatch', 'POST', {});
  const r = await fetchJson(port, `/api/compliance/notification-dispatcher/${id}/cancel`, 'POST', {});
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'bad_state');
});

test('POST /:id/cancel unknown → 404 not_found', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher/nope/cancel', 'POST', {});
  server.close();
  assert.equal(r.status, 404);
});

test('GET list filters by status, channel, recipientUserId', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u2', channel: 'email', subject: 'a',
  });
  await fetchJson(port, '/api/compliance/notification-dispatcher', 'POST', {
    recipientUserId: 'u3', channel: 'in_app', subject: 'b',
  });
  const all = await fetchJson(port, '/api/compliance/notification-dispatcher');
  const email = await fetchJson(port, '/api/compliance/notification-dispatcher?channel=email');
  const u3 = await fetchJson(port, '/api/compliance/notification-dispatcher?recipientUserId=u3');
  const queued = await fetchJson(port, '/api/compliance/notification-dispatcher?status=queued');
  server.close();
  assert.equal(all.body.meta.total, 2);
  assert.equal(email.body.meta.total, 1);
  assert.equal(u3.body.meta.total, 1);
  assert.equal(queued.body.meta.total, 2);
});

test('GET /:id 404 unknown', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/notification-dispatcher/nope');
  server.close();
  assert.equal(r.status, 404);
});
