/**
 * W9 — /api/controls real vertical wiring tests.
 *
 * Run: node --test tests/integration/controls-vertical.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, bindAuditPort } = require('../../dist/index.js');

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

function makeControlsClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, status, metadata,')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const match = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return match ? { rows: [match], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const status = p[1];
        const out = rows
          .filter((r) => r.tenant_id === tenantId)
          .filter((r) => !status || r.status === status);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        const status = p[1];
        const out = rows.filter((r) => r.tenant_id === tenantId).filter((r) => !status || r.status === status);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO "tenant_t1".compliance_controls') || s.includes('compliance_controls')) {
        const tenant_id = p[0];
        const status = p[1];
        const metadata = JSON.parse(p[2]);
        const actor = p[3];
        const now = new Date().toISOString();
        const row = {
          id: `ctl-${++id}`, tenant_id, status, metadata,
          created_at: now, updated_at: now, created_by: actor, updated_by: actor,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeControlsClient();
  registerCompliance({
    app,
    controlsDeps: {
      client,
      resolveContext: () => ({
        tenantId: ctx?.tenantId ?? 't1',
        userId: ctx?.userId ?? 'u1',
        tenantSchema: ctx?.tenantSchema ?? 'tenant_t1',
        hasPermission,
      }),
    },
  });
  return { app, client };
}

test('aggregator marks /api/controls as wired when controlsDeps provided', () => {
  const app = express();
  const r = registerCompliance({
    app,
    controlsDeps: {
      client: makeControlsClient(),
      resolveContext: () => ({ tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1' }),
    },
  });
  const m = r.mounts.find((x) => x.routeBase === '/api/controls');
  assert.equal(m.wired, true);
});

test('GET /api/controls returns empty list with meta.total=0', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/controls');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST /api/controls creates row, GET returns it; bad schema rejected', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/controls', 'POST', { status: 'active', metadata: { code: 'ACC-1' } });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'active');
    assert.equal(c.body.data.metadata.code, 'ACC-1');

    const list = await fetchJson(port, '/api/controls');
    assert.equal(list.body.meta.total, 1);
    const id = c.body.data.id;

    const one = await fetchJson(port, `/api/controls/${id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, id);

    const miss = await fetchJson(port, '/api/controls/nope');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('permission gate: hasPermission=false → 403; admin gate blocks POST', async () => {
  // Read denied
  let app = buildApp({ hasPermission: () => false }).app;
  let s = await listen(app);
  try {
    const r = await fetchJson(s.port, '/api/controls');
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'forbidden');
  } finally { s.server.close(); }

  // Read allowed but admin denied for POST
  app = buildApp({ hasPermission: (k) => k === 'compliance.read' }).app;
  s = await listen(app);
  try {
    const ok = await fetchJson(s.port, '/api/controls');
    assert.equal(ok.status, 200);
    const post = await fetchJson(s.port, '/api/controls', 'POST', { status: 'x' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /compliance\.admin/);
  } finally { s.server.close(); }
});

test('audit port receives control.create entry on successful POST', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/controls', 'POST', { status: 'draft' });
    assert.equal(c.status, 201);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].action, 'control.create');
    assert.equal(captured[0].resourceId, c.body.data.id);
    assert.equal(captured[0].module, 'compliance');
  } finally { server.close(); }
});

test('bad tenantSchema (not tenant_*) rejected with 400', async () => {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    controlsDeps: {
      client: makeControlsClient(),
      resolveContext: () => ({ tenantId: 't1', userId: 'u1', tenantSchema: 'public; DROP TABLE x;' }),
    },
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/controls');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_schema');
  } finally { server.close(); }
});
