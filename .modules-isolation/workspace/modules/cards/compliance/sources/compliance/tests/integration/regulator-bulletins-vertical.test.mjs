/**
 * W53 — /api/compliance/regulator-bulletins vertical wiring tests.
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
    if (s.includes('AND regulator_code =')) { out = out.filter((r) => r.regulator_code === p[i]); i++; }
    if (s.includes('AND severity =')) { out = out.filter((r) => r.severity === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND published_at >=')) { out = out.filter((r) => (r.published_at ?? '') >= p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.title ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT bulletin_id')) {
        if (s.includes('WHERE bulletin_id = $1')) {
          const m = rows.find((r) => r.bulletin_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('regulator_bulletins')) {
        const [regulator_code, bulletin_code, title, summary, severity, status,
          published_at, effective_date, source_url] = p;
        const now = new Date().toISOString();
        const row = {
          bulletin_id: `b-${++id}`, regulator_code, bulletin_code, title, summary,
          severity, status, published_at, effective_date, source_url,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('regulator_bulletins') && s.includes('SET status')) {
        const [bulletinId, status, stamp] = p;
        const row = rows.find((x) => x.bulletin_id === bulletinId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (stamp && row.published_at == null) row.published_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('regulator_bulletins')) {
        const idx = rows.findIndex((x) => x.bulletin_id === p[0]);
        if (idx === -1) return { rows: [], rowCount: 0 };
        const [removed] = rows.splice(idx, 1);
        return { rows: [removed], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    regulatorBulletinsDeps: {
      client: makeClient(),
      resolveContext: () => ({
        tenantId: ctx?.tenantId ?? 't1',
        userId: ctx?.userId ?? 'u1',
        tenantSchema: ctx?.tenantSchema ?? 'tenant_t1',
        hasPermission,
      }),
    },
  });
  return { app };
}

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with severity=medium + status=draft + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'NCA', bulletinCode: 'NCA-2025-001', title: 'New ECC-2 Update' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.severity, 'medium');
    assert.equal(r.body.data.status, 'draft');
    assert.equal(r.body.data.publishedAt, null);
    const a = captured.find((e) => e.action === 'regulator_bulletin.create');
    assert.equal(a.after.regulatorCode, 'NCA');
  } finally { server.close(); }
});

test('POST without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'NCA' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bad severity → bad_severity', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'X', title: 'X', severity: 'urgent' });
    assert.equal(r.body.error.code, 'bad_severity');
  } finally { server.close(); }
});

test('PATCH /:id/status published auto-stamps publishedAt', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'SAMA', bulletinCode: 'CSF-1', title: 'CSF v2 update' });
    assert.equal(c.body.data.publishedAt, null);
    const r = await fetchJson(port,
      `/api/compliance/regulator-bulletins/${c.body.data.bulletinId}/status`,
      'PATCH', { status: 'published' });
    assert.equal(r.body.data.status, 'published');
    assert.notEqual(r.body.data.publishedAt, null);
  } finally { server.close(); }
});

test('PATCH bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'X', title: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/regulator-bulletins/${c.body.data.bulletinId}/status`,
      'PATCH', { status: 'pending' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filter narrows by regulatorCode + severity', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'NCA', bulletinCode: 'A', title: 'A', severity: 'critical' });
    await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'NCA', bulletinCode: 'B', title: 'B', severity: 'low' });
    await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'SAMA', bulletinCode: 'C', title: 'C', severity: 'critical' });
    const r = await fetchJson(port,
      '/api/compliance/regulator-bulletins?regulatorCode=NCA&severity=critical');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('search ILIKE narrows on title', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'A', title: 'PDPL Update' });
    await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'B', title: 'CCC Update' });
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins?search=pdpl');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'D', title: 'D' });
    const d1 = await fetchJson(port,
      `/api/compliance/regulator-bulletins/${c.body.data.bulletinId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/regulator-bulletins/${c.body.data.bulletinId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulator-bulletins', 'POST',
      { regulatorCode: 'X', bulletinCode: 'X', title: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
