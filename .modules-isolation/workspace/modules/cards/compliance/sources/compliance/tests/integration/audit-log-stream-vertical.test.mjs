/**
 * W73 — /api/compliance/audit-log-stream vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, encodeAuditCursor, decodeAuditCursor } = require('../../dist/index.js');

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

function makeClient(seed = []) {
  const rows = seed.slice();
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT event_id') && s.includes('FROM') && s.includes('audit_events')) {
        let out = rows.slice();
        let i = 0;
        if (s.includes('AND module =')) { out = out.filter((r) => r.module === p[i]); i++; }
        if (s.includes('AND action =')) { out = out.filter((r) => r.action === p[i]); i++; }
        if (s.includes('AND actor_id =')) { out = out.filter((r) => r.actor_id === p[i]); i++; }
        if (s.includes('AND resource_type =')) { out = out.filter((r) => r.resource_type === p[i]); i++; }
        if (s.includes('AND resource_id =')) { out = out.filter((r) => r.resource_id === p[i]); i++; }
        if (s.includes('AND occurred_at >=')) { out = out.filter((r) => r.occurred_at >= p[i]); i++; }
        if (s.includes('AND occurred_at <')) { out = out.filter((r) => r.occurred_at < p[i]); i++; }
        if (s.includes('AND (occurred_at <')) {
          const ts = p[i]; const id = p[i + 1];
          out = out.filter((r) => r.occurred_at < ts || (r.occurred_at === ts && r.event_id < id));
        }
        out.sort((a, b) => {
          if (a.occurred_at !== b.occurred_at) return a.occurred_at < b.occurred_at ? 1 : -1;
          return a.event_id < b.event_id ? 1 : -1;
        });
        const m = s.match(/LIMIT (\d+)/);
        const lim = m ? Number(m[1]) : out.length;
        return { rows: out.slice(0, lim), rowCount: Math.min(out.length, lim) };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('audit_events')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND module =')) { out = out.filter((r) => r.module === p[i]); i++; }
        if (s.includes('AND action =')) { out = out.filter((r) => r.action === p[i]); i++; }
        if (s.includes('AND actor_id =')) { out = out.filter((r) => r.actor_id === p[i]); i++; }
        if (s.includes('AND resource_type =')) { out = out.filter((r) => r.resource_type === p[i]); i++; }
        if (s.includes('AND resource_id =')) { out = out.filter((r) => r.resource_id === p[i]); i++; }
        if (s.includes('AND occurred_at >=')) { out = out.filter((r) => r.occurred_at >= p[i]); i++; }
        if (s.includes('AND occurred_at <')) { out = out.filter((r) => r.occurred_at < p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function seed5() {
  return [
    { event_id: 'e1', occurred_at: '2026-01-01T00:00:00Z', actor_id: 'u1', module: 'compliance', action: 'create', resource_type: 'r', resource_id: '1', before: null, after: null, context: null },
    { event_id: 'e2', occurred_at: '2026-01-02T00:00:00Z', actor_id: 'u1', module: 'compliance', action: 'update', resource_type: 'r', resource_id: '1', before: null, after: null, context: null },
    { event_id: 'e3', occurred_at: '2026-01-03T00:00:00Z', actor_id: 'u2', module: 'risk',       action: 'create', resource_type: 'r', resource_id: '2', before: null, after: null, context: null },
    { event_id: 'e4', occurred_at: '2026-01-04T00:00:00Z', actor_id: 'u2', module: 'compliance', action: 'delete', resource_type: 'r', resource_id: '1', before: null, after: null, context: null },
    { event_id: 'e5', occurred_at: '2026-01-05T00:00:00Z', actor_id: 'u3', module: 'compliance', action: 'create', resource_type: 's', resource_id: '9', before: null, after: null, context: null },
  ];
}

function buildApp({ hasPermission, seed = seed5() } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient(seed);
  registerCompliance({
    app,
    auditLogStreamDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('encode/decode cursor round-trips', () => {
  const c = { ts: '2026-01-01T00:00:00Z', id: 'e1' };
  assert.deepEqual(decodeAuditCursor(encodeAuditCursor(c)), c);
});

test('decodeCursor on garbage → throws bad_cursor', () => {
  assert.throws(() => decodeAuditCursor('!!!notbase64!!!'), /bad cursor/);
});

test('GET requires audit.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream');
  server.close();
  assert.equal(r.status, 403);
});

test('GET returns rows in DESC order', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 5);
  assert.equal(r.body.data[0].eventId, 'e5');
  assert.equal(r.body.data[4].eventId, 'e1');
  assert.equal(r.body.meta.nextCursor, null);
});

test('GET filter by module', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream?module=risk');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].eventId, 'e3');
});

test('GET filter by actorId+action', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream?actorId=u1&action=update');
  server.close();
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].eventId, 'e2');
});

test('GET pagination via cursor', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r1 = await fetchJson(port, '/api/compliance/audit-log-stream?limit=2');
  assert.equal(r1.body.data.length, 2);
  assert.equal(r1.body.data[0].eventId, 'e5');
  assert.equal(r1.body.data[1].eventId, 'e4');
  assert.ok(r1.body.meta.nextCursor);
  const r2 = await fetchJson(port, `/api/compliance/audit-log-stream?limit=2&cursor=${encodeURIComponent(r1.body.meta.nextCursor)}`);
  server.close();
  assert.equal(r2.body.data[0].eventId, 'e3');
  assert.equal(r2.body.data[1].eventId, 'e2');
});

test('GET bad cursor → 400 bad_cursor', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream?cursor=!!!');
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_cursor');
});

test('GET occurredFrom/occurredTo window', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream?occurredFrom=2026-01-02T00:00:00Z&occurredTo=2026-01-04T00:00:00Z');
  server.close();
  assert.equal(r.body.data.length, 2);
  assert.equal(r.body.data[0].eventId, 'e3');
  assert.equal(r.body.data[1].eventId, 'e2');
});

test('GET /count returns total', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream/count?module=compliance');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.total, 4);
});

test('GET /count requires audit.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/audit-log-stream/count');
  server.close();
  assert.equal(r.status, 403);
});
