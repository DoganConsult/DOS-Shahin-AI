/**
 * W47 — /api/compliance/entities vertical wiring tests.
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
    let i = 0;
    let out = rows.slice();
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.name ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, name, entity_type')) {
        if (s.includes('WHERE id = $1')) {
          const m = rows.find((r) => r.id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('entities')) {
        const [name, entity_type, status, tenant_id] = p;
        const now = new Date().toISOString();
        const row = {
          id: `e-${++id}`, name, entity_type, status, tenant_id,
          created_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('entities') && s.includes('SET status')) {
        const [id_, status] = p;
        const row = rows.find((x) => x.id === id_);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('entities')) {
        const idx = rows.findIndex((x) => x.id === p[0]);
        if (idx === -1) return { rows: [], rowCount: 0 };
        const [removed] = rows.splice(idx, 1);
        return { rows: [removed], rowCount: 1 };
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
    entitiesDeps: {
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

test('GET /api/compliance/entities empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/entities');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults subsidiary+active + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'Acme Subsidiary' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.entityType, 'subsidiary');
    assert.equal(r.body.data.status, 'active');
    const a = captured.find((e) => e.action === 'entity.create');
    assert.ok(a);
    assert.equal(a.after.name, 'Acme Subsidiary');
  } finally { server.close(); }
});

test('POST without name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/entities', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus entityType → 400 bad_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'X', entityType: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_type');
  } finally { server.close(); }
});

test('PATCH /:id/status archived stamps + audit; bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'BU-1' });
    const r = await fetchJson(port,
      `/api/compliance/entities/${c.body.data.id}/status`,
      'PATCH', { status: 'archived' });
    assert.equal(r.body.data.status, 'archived');
    const bad = await fetchJson(port,
      `/api/compliance/entities/${c.body.data.id}/status`,
      'PATCH', { status: 'bogus' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters narrow by entityType + status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'Sub1', entityType: 'subsidiary' });
    await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'BU1', entityType: 'business_unit' });
    const c3 = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'BU2', entityType: 'business_unit' });
    await fetchJson(port,
      `/api/compliance/entities/${c3.body.data.id}/status`,
      'PATCH', { status: 'archived' });
    const r = await fetchJson(port,
      '/api/compliance/entities?entityType=business_unit&status=active');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('search ILIKE narrows on name', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/entities', 'POST', { name: 'Acme Holdings' });
    await fetchJson(port, '/api/compliance/entities', 'POST', { name: 'Globex Corp' });
    const r = await fetchJson(port, '/api/compliance/entities?search=acme');
    assert.equal(r.body.meta.total, 1);
    assert.equal(r.body.data[0].name, 'Acme Holdings');
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'ToDelete' });
    const d1 = await fetchJson(port,
      `/api/compliance/entities/${c.body.data.id}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/entities/${c.body.data.id}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/entities', 'POST',
      { name: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
