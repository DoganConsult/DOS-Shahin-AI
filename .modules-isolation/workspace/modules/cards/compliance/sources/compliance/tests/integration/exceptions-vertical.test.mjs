/**
 * W16 — /api/compliance/exceptions vertical wiring tests.
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

function makeExceptionsClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, requirement_id, exception_type')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND exception_type =')) { out = out.filter((r) => r.exception_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND exception_type =')) { out = out.filter((r) => r.exception_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_exceptions')) {
        const [tenant_id, requirement_id, exception_type, justification,
               risk_assessment, compensating_controls, valid_from, valid_to, status] = p;
        const now = new Date().toISOString();
        const row = {
          id: `exc-${++id}`, tenant_id, requirement_id, exception_type,
          justification, risk_assessment, compensating_controls,
          approved_by: null, approved_at: null,
          valid_from, valid_to, status,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_exceptions') && s.includes('SET status')) {
        const [tenant_id, id_, status, approvedBy] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = status;
        if (status === 'approved') {
          r.approved_by = approvedBy;
          r.approved_at = new Date().toISOString();
        }
        r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeExceptionsClient();
  registerCompliance({
    app,
    exceptionsDeps: {
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

test('GET /api/compliance/exceptions empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/exceptions');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates exception with default status pending; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'req-1', exceptionType: 'temporary', justification: 'audit window' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'pending');
    assert.equal(c.body.data.exceptionType, 'temporary');
    assert.equal(c.body.data.approvedBy, null);
    const one = await fetchJson(port, `/api/compliance/exceptions/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without requirementId/exceptionType → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { justification: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'r', exceptionType: 't', status: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters: requirementId + status narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'R1', exceptionType: 'temp', status: 'pending' });
    await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'R1', exceptionType: 'perm', status: 'approved' });
    await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'R2', exceptionType: 'temp', status: 'pending' });
    const byR1 = await fetchJson(port, '/api/compliance/exceptions?requirementId=R1');
    assert.equal(byR1.body.meta.total, 2);
    const pending = await fetchJson(port, '/api/compliance/exceptions?status=pending');
    assert.equal(pending.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/exceptions?requirementId=R1&status=pending');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status → approved sets approvedBy/approvedAt and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'r', exceptionType: 'temp' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/exceptions/${id}/status`, 'PATCH',
      { status: 'approved' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'approved');
    assert.equal(u.body.data.approvedBy, 'u1');
    assert.ok(u.body.data.approvedAt);
    const a = captured.find((e) => e.action === 'exception.status_change');
    assert.ok(a);
    assert.equal(a.before.status, 'pending');
    assert.equal(a.after.status, 'approved');
    assert.equal(a.before.approvedBy, null);
    assert.equal(a.after.approvedBy, 'u1');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/exceptions/missing/status', 'PATCH',
      { status: 'rejected' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without exception.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'exception.record.read' });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/exceptions', 'POST',
      { requirementId: 'r', exceptionType: 't' });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'forbidden');
  } finally { server.close(); }
});
