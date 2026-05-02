/**
 * W18 — /api/compliance/regulatory-changes vertical wiring tests.
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
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, regulation_name, change_type')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND regulation_name =')) { out = out.filter((r) => r.regulation_name === p[i]); i++; }
        if (s.includes('AND change_type =')) { out = out.filter((r) => r.change_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND assigned_to =')) { out = out.filter((r) => r.assigned_to === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND regulation_name =')) { out = out.filter((r) => r.regulation_name === p[i]); i++; }
        if (s.includes('AND change_type =')) { out = out.filter((r) => r.change_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND assigned_to =')) { out = out.filter((r) => r.assigned_to === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_regulatory_changes')) {
        const [tenant_id, regulation_name, change_type, description,
               effective_date, impact_assessment, status, assigned_to, actionItemsJson] = p;
        const now = new Date().toISOString();
        const row = {
          id: `rc-${++id}`, tenant_id, regulation_name, change_type, description,
          effective_date, impact_assessment, status, assigned_to,
          action_items: JSON.parse(actionItemsJson),
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_regulatory_changes')) {
        const [tenant_id, id_, status, assignedTo] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = status;
        if (assignedTo !== null) r.assigned_to = assignedTo;
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
  const client = makeClient();
  registerCompliance({
    app,
    regulatoryChangesDeps: {
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

test('GET /api/compliance/regulatory-changes empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulatory-changes');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates regulatory change with default status new; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'PDPL', changeType: 'amendment', description: 'New article 42' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'new');
    assert.equal(c.body.data.regulationName, 'PDPL');
    assert.deepEqual(c.body.data.actionItems, []);
    const one = await fetchJson(port, `/api/compliance/regulatory-changes/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without regulationName/changeType → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { description: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'r', changeType: 't', status: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters: changeType + status narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'A', changeType: 'amendment', status: 'new' });
    await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'B', changeType: 'amendment', status: 'in_progress' });
    await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'C', changeType: 'new_regulation', status: 'new' });
    const amend = await fetchJson(port, '/api/compliance/regulatory-changes?changeType=amendment');
    assert.equal(amend.body.meta.total, 2);
    const news = await fetchJson(port, '/api/compliance/regulatory-changes?status=new');
    assert.equal(news.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/regulatory-changes?changeType=amendment&status=new');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status transitions and writes audit before/after with assignedTo update', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'r', changeType: 'amendment' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/regulatory-changes/${id}/status`, 'PATCH',
      { status: 'in_progress', assignedTo: 'user-42' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'in_progress');
    assert.equal(u.body.data.assignedTo, 'user-42');
    const a = captured.find((e) => e.action === 'regulatory_change.status_change');
    assert.ok(a);
    assert.equal(a.before.status, 'new');
    assert.equal(a.after.status, 'in_progress');
    assert.equal(a.before.assignedTo, null);
    assert.equal(a.after.assignedTo, 'user-42');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/regulatory-changes/missing/status', 'PATCH',
      { status: 'dismissed' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without regulatory_change.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'regulatory_change.record.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/regulatory-changes');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/regulatory-changes', 'POST',
      { regulationName: 'r', changeType: 'amendment' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /regulatory_change\.record\.write/);
  } finally { server.close(); }
});
