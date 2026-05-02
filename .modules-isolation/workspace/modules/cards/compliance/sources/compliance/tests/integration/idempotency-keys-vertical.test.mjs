/**
 * W76 — /api/compliance/idempotency-keys* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, isIdempotencyExpired } = require('../../dist/index.js');

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

function makeClient(initial = []) {
  const rows = initial.slice();
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT scope') && s.includes('WHERE scope = $1 AND key = $2')) {
        const x = rows.find((r) => r.scope === p[0] && r.key === p[1]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT scope') && s.includes('WHERE 1=1')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND scope =')) { out = out.filter((r) => r.scope === p[i]); i++; }
        out.sort((a, b) => a.created_at < b.created_at ? 1 : -1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('idempotency_keys') && s.includes('WHERE 1=1')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND scope =')) { out = out.filter((r) => r.scope === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('idempotency_keys')) {
        return { rows: [{ n: String(rows.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('idempotency_keys')) {
        const r = {
          scope: p[0], key: p[1], request_hash: p[2], response_status: p[3],
          response_body: JSON.parse(p[4]),
          created_at: new Date().toISOString(), ttl_seconds: p[5],
        };
        rows.push(r);
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('idempotency_keys')) {
        const cutoff = Date.parse(p[0]);
        let removed = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          const t = Date.parse(r.created_at) + Number(r.ttl_seconds) * 1000;
          if (t < cutoff) { rows.splice(i, 1); removed++; }
        }
        return { rows: [], rowCount: removed };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ hasPermission, initial } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient(initial);
  registerCompliance({
    app,
    idempotencyKeysDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('isIdempotencyExpired: ttl elapsed → true', () => {
  const row = {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 200,
    responseBody: null, createdAt: '2026-01-01T00:00:00Z', ttlSeconds: 60,
  };
  assert.equal(isIdempotencyExpired(row, new Date('2026-01-01T00:02:00Z')), true);
  assert.equal(isIdempotencyExpired(row, new Date('2026-01-01T00:00:30Z')), false);
});

test('GET requires idempotency.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires idempotency.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'idempotency.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 200,
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing scope → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    key: 'k', requestHash: 'h', responseStatus: 200,
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST ttlSeconds<=0 → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 200, ttlSeconds: 0,
  });
  server.close();
  assert.equal(r.status, 400);
});

test('POST stores first time → 201 stored:true', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 201,
    responseBody: { id: 'r1' },
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.stored, true);
  assert.equal(client._rows.length, 1);
});

test('POST same hash second time → 200 stored:false (cached)', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 201,
  });
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 201,
  });
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.stored, false);
  assert.equal(client._rows.length, 1);
});

test('POST different hash same key → 409 bad_conflict', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h1', responseStatus: 201,
  });
  const r = await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h2', responseStatus: 201,
  });
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'bad_conflict');
});

test('GET /:scope/:key 404 when missing', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys/s/nope');
  server.close();
  assert.equal(r.status, 404);
});

test('GET /:scope/:key returns stored row', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 's', key: 'k', requestHash: 'h', responseStatus: 201,
    responseBody: { ok: true },
  });
  const r = await fetchJson(port, '/api/compliance/idempotency-keys/s/k');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.requestHash, 'h');
  assert.deepEqual(r.body.data.responseBody, { ok: true });
});

test('GET list filters by scope', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 'a', key: 'k1', requestHash: 'h', responseStatus: 200,
  });
  await fetchJson(port, '/api/compliance/idempotency-keys', 'POST', {
    scope: 'b', key: 'k2', requestHash: 'h', responseStatus: 200,
  });
  const r = await fetchJson(port, '/api/compliance/idempotency-keys?scope=a');
  server.close();
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].scope, 'a');
});

test('POST /purge removes expired rows', async () => {
  const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const { app, client } = buildApp({
    hasPermission: () => true,
    initial: [
      { scope: 's', key: 'old', request_hash: 'h', response_status: 200,
        response_body: null, created_at: oldTime, ttl_seconds: 60 },
      { scope: 's', key: 'fresh', request_hash: 'h', response_status: 200,
        response_body: null, created_at: new Date().toISOString(), ttl_seconds: 86400 },
    ],
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys/purge', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.deleted, 1);
  assert.equal(client._rows.length, 1);
  assert.equal(client._rows[0].key, 'fresh');
});

test('POST /purge requires idempotency.write', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/idempotency-keys/purge', 'POST', {});
  server.close();
  assert.equal(r.status, 403);
});
