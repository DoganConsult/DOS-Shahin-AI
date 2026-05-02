/**
 * W34 — /api/compliance/versions vertical wiring tests.
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

function makeClient() {
  const rows = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 1;
    let out = rows.filter((r) => r.tenant_id === p[0]);
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND entity_id =')) { out = out.filter((r) => r.entity_id === p[i]); i++; }
    if (s.includes('AND changed_by =')) { out = out.filter((r) => r.changed_by === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_id, entity_type, version')) {
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes('WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY version DESC LIMIT 1')) {
          const m = rows
            .filter((r) => r.tenant_id === p[0] && r.entity_type === p[1] && r.entity_id === p[2])
            .sort((a, b) => b.version - a.version)[0];
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_versions')) {
        const [tenant_id, entity_id, entity_type, dataJson, changed_by] = p;
        const max = rows
          .filter((r) => r.tenant_id === tenant_id && r.entity_type === entity_type && r.entity_id === entity_id)
          .reduce((m, r) => Math.max(m, r.version), 0);
        const now = new Date().toISOString();
        const row = {
          id: `v-${++id}`, tenant_id, entity_id, entity_type,
          version: max + 1, data: JSON.parse(dataJson),
          changed_by, changed_at: now, created_at: now, updated_at: now,
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
  const client = makeClient();
  registerCompliance({
    app,
    versionsDeps: {
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

test('GET /api/compliance/versions empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/versions');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST records version 1; second POST same entity → version 2', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r1 = await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: { name: 'v1' } });
    assert.equal(r1.status, 201);
    assert.equal(r1.body.data.version, 1);
    const r2 = await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: { name: 'v2' } });
    assert.equal(r2.body.data.version, 2);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('GET /versions/latest/:entityType/:entityId returns highest version', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: {} });
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: {} });
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: {} });
    const lat = await fetchJson(port, '/api/compliance/versions/latest/control/c1');
    assert.equal(lat.status, 200);
    assert.equal(lat.body.data.version, 3);
  } finally { server.close(); }
});

test('GET /versions/latest for missing entity → 404 not_found', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/versions/latest/control/missing');
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'not_found');
  } finally { server.close(); }
});

test('list filters: entityType + entityId narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: {} });
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c2', data: {} });
    await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'framework', entityId: 'f1', data: {} });
    const ctl = await fetchJson(port, '/api/compliance/versions?entityType=control');
    assert.equal(ctl.body.meta.total, 2);
    const c1 = await fetchJson(port, '/api/compliance/versions?entityType=control&entityId=c1');
    assert.equal(c1.body.meta.total, 1);
  } finally { server.close(); }
});

test('POST fires audit version.record with version number in after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'control', entityId: 'c1', data: {} });
    assert.equal(c.status, 201);
    const a = captured.find((e) => e.action === 'version.record');
    assert.ok(a);
    assert.equal(a.after.version, 1);
    assert.equal(a.after.entityType, 'control');
  } finally { server.close(); }
});

test('permission gate denies write without version.snapshot.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'version.snapshot.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/versions');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/versions', 'POST',
      { entityType: 'c', entityId: 'i', data: {} });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /version\.snapshot\.write/);
  } finally { server.close(); }
});
