/**
 * W46 — /api/compliance/sod-conflict-matrix vertical wiring tests.
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
    if (s.includes('AND role_a =')) { out = out.filter((r) => r.role_a === p[i]); i++; }
    if (s.includes('AND role_b =')) { out = out.filter((r) => r.role_b === p[i]); i++; }
    if (s.includes('AND conflict_type =')) { out = out.filter((r) => r.conflict_type === p[i]); i++; }
    if (s.includes('AND severity =')) { out = out.filter((r) => r.severity === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, role_a, role_b')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('sod_conflict_matrix')) {
        const [role_a, role_b, conflict_type, severity, tenant_id] = p;
        const now = new Date().toISOString();
        const row = {
          id: `s-${++id}`, role_a, role_b, conflict_type, severity,
          tenant_id, created_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('sod_conflict_matrix')) {
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
    sodConflictMatrixDeps: {
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

test('GET /api/compliance/sod-conflict-matrix empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults forbidden+high + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'maker', roleB: 'checker' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.conflictType, 'forbidden');
    assert.equal(r.body.data.severity, 'high');
    const a = captured.find((e) => e.action === 'sod_conflict.create');
    assert.ok(a);
    assert.equal(a.after.roleA, 'maker');
  } finally { server.close(); }
});

test('POST without required → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST roleA===roleB → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'admin', roleB: 'admin' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus conflictType → 400 bad_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'a', roleB: 'b', conflictType: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_type');
  } finally { server.close(); }
});

test('POST bogus severity → 400 bad_severity', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'a', roleB: 'b', severity: 'extreme' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_severity');
  } finally { server.close(); }
});

test('list filters narrow by roleA + severity', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'finance_writer', roleB: 'finance_approver', severity: 'critical' });
    await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'finance_writer', roleB: 'auditor', severity: 'low' });
    await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'devops', roleB: 'sec_approver', severity: 'critical' });
    const r = await fetchJson(port,
      '/api/compliance/sod-conflict-matrix?roleA=finance_writer&severity=critical');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'x', roleB: 'y' });
    const d1 = await fetchJson(port,
      `/api/compliance/sod-conflict-matrix/${c.body.data.id}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/sod-conflict-matrix/${c.body.data.id}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-conflict-matrix', 'POST',
      { roleA: 'a', roleB: 'b' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
