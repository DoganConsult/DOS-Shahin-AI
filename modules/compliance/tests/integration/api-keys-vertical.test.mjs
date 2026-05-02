/**
 * W78 — /api/compliance/api-keys* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  hashApiKeyPlaintext,
  API_KEY_STATUSES,
  API_KEY_VERIFY_REASONS,
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

function makeClient(initial = []) {
  const rows = initial.slice();
  let seq = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT key_id') && s.includes('WHERE key_id = $1')) {
        const x = rows.find((r) => r.key_id === p[0]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT key_id') && s.includes('WHERE key_prefix = $1')) {
        const out = rows.filter((r) => r.key_prefix === p[0]);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT key_id') && s.includes('WHERE 1=1')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        out.sort((a, b) => a.created_at < b.created_at ? 1 : -1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('api_keys')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('api_keys')) {
        seq++;
        const x = {
          key_id: p[0], key_prefix: p[1], key_hash: p[2], label: p[3],
          scopes: JSON.parse(p[4]), status: 'active',
          created_at: new Date(2026, 0, seq).toISOString(),
          created_by: p[5], expires_at: p[6],
          last_used_at: null, revoked_at: null, revoked_by: null,
        };
        rows.push(x);
        return { rows: [x], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('api_keys') && s.includes('SET last_used_at = NOW()')) {
        const x = rows.find((r) => r.key_id === p[0]);
        if (x) x.last_used_at = new Date().toISOString();
        return { rows: [], rowCount: x ? 1 : 0 };
      }
      if (s.startsWith('UPDATE') && s.includes('api_keys') && s.includes("status = 'revoked'")) {
        const x = rows.find((r) => r.key_id === p[0]);
        if (x) {
          x.status = 'revoked';
          x.revoked_at = new Date().toISOString();
          x.revoked_by = p[1];
        }
        return { rows: x ? [x] : [], rowCount: x ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    apiKeysDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('API_KEY_STATUSES + API_KEY_VERIFY_REASONS exposed', () => {
  assert.deepEqual([...API_KEY_STATUSES].sort(), ['active', 'revoked']);
  for (const r of ['not_found', 'hash_mismatch', 'revoked', 'expired', 'ok']) {
    assert.ok(API_KEY_VERIFY_REASONS.includes(r));
  }
});

test('hashApiKeyPlaintext is deterministic SHA-256 hex', () => {
  const a = hashApiKeyPlaintext('hello');
  const b = hashApiKeyPlaintext('hello');
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test('GET requires api_key.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires api_key.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'api_key.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'x' });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing label → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys', 'POST', { scopes: ['x'] });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST issues plaintext exactly once', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys', 'POST', {
    label: 'webhook-key', scopes: ['scope-a'],
  });
  server.close();
  assert.equal(r.status, 201);
  assert.ok(r.body.data.plaintext.startsWith('dos_'));
  assert.equal(r.body.data.row.label, 'webhook-key');
  assert.equal(client._rows.length, 1);
});

test('verify ok → reason=ok and stamps last_used_at', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const c = await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'l' });
  const plaintext = c.body.data.plaintext;
  const r = await fetchJson(port, '/api/compliance/api-keys/verify', 'POST', { plaintext });
  server.close();
  assert.equal(r.body.data.reason, 'ok');
  assert.equal(r.body.data.ok, true);
  assert.ok(client._rows[0].last_used_at);
});

test('verify wrong key → reason=not_found', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys/verify', 'POST', {
    plaintext: 'dos_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
  });
  server.close();
  assert.equal(r.body.data.reason, 'not_found');
});

test('verify after revoke → reason=revoked', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const c = await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'l' });
  const id = c.body.data.row.keyId;
  const plaintext = c.body.data.plaintext;
  await fetchJson(port, `/api/compliance/api-keys/${id}/revoke`, 'POST', {});
  const r = await fetchJson(port, '/api/compliance/api-keys/verify', 'POST', { plaintext });
  server.close();
  assert.equal(r.body.data.reason, 'revoked');
});

test('revoke is idempotent', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const c = await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'l' });
  const id = c.body.data.row.keyId;
  await fetchJson(port, `/api/compliance/api-keys/${id}/revoke`, 'POST', {});
  const r = await fetchJson(port, `/api/compliance/api-keys/${id}/revoke`, 'POST', {});
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'revoked');
});

test('revoke unknown id → 404 not_found', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys/nope/revoke', 'POST', {});
  server.close();
  assert.equal(r.status, 404);
});

test('GET /:id 404 when missing', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys/nope');
  server.close();
  assert.equal(r.status, 404);
});

test('GET list filters by status', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const a = await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'a' });
  await fetchJson(port, '/api/compliance/api-keys', 'POST', { label: 'b' });
  await fetchJson(port, `/api/compliance/api-keys/${a.body.data.row.keyId}/revoke`, 'POST', {});
  const r = await fetchJson(port, '/api/compliance/api-keys?status=active');
  server.close();
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].label, 'b');
});

test('verify requires api_key.verify permission', async () => {
  const { app } = buildApp({ hasPermission: (k) => k !== 'api_key.verify' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/api-keys/verify', 'POST', {
    plaintext: 'dos_anything',
  });
  server.close();
  assert.equal(r.status, 403);
});
