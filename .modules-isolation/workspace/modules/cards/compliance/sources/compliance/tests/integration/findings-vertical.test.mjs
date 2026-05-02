/**
 * W48 — /api/compliance/findings vertical wiring tests.
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
    if (s.includes('AND severity =')) { out = out.filter((r) => r.severity === p[i]); i++; }
    if (s.includes('AND source =')) { out = out.filter((r) => r.source === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
    if (s.includes('AND owner_user_id =')) { out = out.filter((r) => r.owner_user_id === p[i]); i++; }
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
      if (s.startsWith('SELECT finding_id')) {
        if (s.includes('WHERE finding_id = $1')) {
          const m = rows.find((r) => r.finding_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('findings')) {
        const [title, description, severity, source, status,
          control_id, requirement_id, gap_id, owner_user_id, identified_by] = p;
        const now = new Date().toISOString();
        const row = {
          finding_id: `f-${++id}`, title, description, severity, source, status,
          control_id, requirement_id, gap_id, owner_user_id, identified_by,
          closed_at: null, created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('findings') && s.includes('SET status')) {
        const [findingId, status, closed] = p;
        const row = rows.find((x) => x.finding_id === findingId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        row.closed_at = closed ? new Date().toISOString() : null;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('findings')) {
        const idx = rows.findIndex((x) => x.finding_id === p[0]);
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
    findingsDeps: {
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

test('GET /api/compliance/findings empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates with defaults medium+internal+open + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'Missing audit log retention' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.severity, 'medium');
    assert.equal(r.body.data.source, 'internal');
    assert.equal(r.body.data.status, 'open');
    assert.equal(r.body.data.identifiedBy, 'u1');
    const a = captured.find((e) => e.action === 'finding.create');
    assert.ok(a);
    assert.equal(a.after.title, 'Missing audit log retention');
  } finally { server.close(); }
});

test('POST without title → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus severity/source → 400 bad_severity / bad_source', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r1 = await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'X', severity: 'apocalyptic' });
    assert.equal(r1.status, 400);
    assert.equal(r1.body.error.code, 'bad_severity');
    const r2 = await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'Y', source: 'crystal_ball' });
    assert.equal(r2.status, 400);
    assert.equal(r2.body.error.code, 'bad_source');
  } finally { server.close(); }
});

test('PATCH /:id/status closed stamps closed_at; bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'F-1' });
    const r = await fetchJson(port,
      `/api/compliance/findings/${c.body.data.findingId}/status`,
      'PATCH', { status: 'closed' });
    assert.equal(r.body.data.status, 'closed');
    assert.ok(r.body.data.closedAt);
    const reopen = await fetchJson(port,
      `/api/compliance/findings/${c.body.data.findingId}/status`,
      'PATCH', { status: 'open' });
    assert.equal(reopen.body.data.closedAt, null);
    const bad = await fetchJson(port,
      `/api/compliance/findings/${c.body.data.findingId}/status`,
      'PATCH', { status: 'bogus' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters narrow by severity + source + controlId', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'a', severity: 'critical', source: 'regulator', controlId: 'c-1' });
    await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'b', severity: 'low', source: 'internal', controlId: 'c-1' });
    await fetchJson(port, '/api/compliance/findings', 'POST',
      { title: 'c', severity: 'critical', source: 'regulator', controlId: 'c-2' });
    const r = await fetchJson(port,
      '/api/compliance/findings?severity=critical&source=regulator&controlId=c-1');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('search ILIKE narrows on title', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/findings', 'POST', { title: 'NCA control gap' });
    await fetchJson(port, '/api/compliance/findings', 'POST', { title: 'Backup verification missing' });
    const r = await fetchJson(port, '/api/compliance/findings?search=nca');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/findings', 'POST', { title: 'ToDelete' });
    const d1 = await fetchJson(port,
      `/api/compliance/findings/${c.body.data.findingId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/findings/${c.body.data.findingId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings', 'POST', { title: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
