/**
 * W35 — /api/compliance/control-deficiencies vertical wiring tests.
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
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND severity =')) { out = out.filter((r) => r.severity === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT deficiency_id, control_id, title')) {
        if (s.includes('WHERE deficiency_id = $1')) {
          const m = rows.find((r) => r.deficiency_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('control_deficiencies')) {
        const [control_id, title, description, severity, identified_by,
          remediation_plan, remediation_owner, remediation_deadline] = p;
        const now = new Date().toISOString();
        const row = {
          deficiency_id: `d-${++id}`, control_id, title, description,
          severity, identified_by, status: 'identified',
          remediation_plan, remediation_owner, remediation_deadline,
          closure_notes: null, created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('control_deficiencies')) {
        const [deficiency_id, status, closure_notes] = p;
        const row = rows.find((x) => x.deficiency_id === deficiency_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (closure_notes !== null) row.closure_notes = closure_notes;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('control_deficiencies')) {
        const idx = rows.findIndex((x) => x.deficiency_id === p[0]);
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
    controlDeficienciesDeps: {
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

test('GET /api/compliance/control-deficiencies empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-deficiencies');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates deficiency with default severity=medium status=identified', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 'logging gap' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.severity, 'medium');
    assert.equal(c.body.data.status, 'identified');
    assert.equal(c.body.data.identifiedBy, 'u1');
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad severity → 400 bad_severity', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't', severity: 'extreme' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_severity');
  } finally { server.close(); }
});

test('list filters: controlId + status + severity narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't1', severity: 'high' });
    await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't2', severity: 'low' });
    await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-2', title: 't3', severity: 'high' });
    const ac1 = await fetchJson(port, '/api/compliance/control-deficiencies?controlId=AC-1');
    assert.equal(ac1.body.meta.total, 2);
    const high = await fetchJson(port, '/api/compliance/control-deficiencies?severity=high');
    assert.equal(high.body.meta.total, 2);
  } finally { server.close(); }
});

test('PATCH /status closes with notes; audit before/after captured', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't' });
    const id = c.body.data.deficiencyId;
    const r = await fetchJson(port, `/api/compliance/control-deficiencies/${id}/status`, 'PATCH',
      { status: 'closed', closureNotes: 'remediated and validated' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'closed');
    assert.equal(r.body.data.closureNotes, 'remediated and validated');
    const a = captured.find((e) => e.action === 'control_deficiency.status');
    assert.ok(a);
    assert.equal(a.before.status, 'identified');
    assert.equal(a.after.status, 'closed');
  } finally { server.close(); }
});

test('PATCH /status with bogus status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't' });
    const r = await fetchJson(port, `/api/compliance/control-deficiencies/${c.body.data.deficiencyId}/status`, 'PATCH',
      { status: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('permission gate denies write without control_deficiency.finding.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'control_deficiency.finding.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/control-deficiencies');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/control-deficiencies', 'POST',
      { controlId: 'AC-1', title: 't' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /control_deficiency\.finding\.write/);
  } finally { server.close(); }
});
