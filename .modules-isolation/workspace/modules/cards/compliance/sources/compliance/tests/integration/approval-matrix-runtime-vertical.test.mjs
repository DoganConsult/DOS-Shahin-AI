/**
 * W64 — /api/compliance/approval-matrix-runtime vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, bindAuditPort, buildChain } = require('../../dist/index.js');

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

function makeClient({ matrix = [] } = {}) {
  const decisions = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 0; let out = decisions.slice();
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND entity_id =')) { out = out.filter((r) => r.entity_id === p[i]); i++; }
    if (s.includes('AND outcome =')) { out = out.filter((r) => r.outcome === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT rule_id') && s.includes('approval_matrix')) {
        const out = matrix.filter((r) => r.entity_type === p[0] && r.action === p[1]);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT decision_id')) {
        if (s.includes('WHERE decision_id = $1')) {
          const m = decisions.find((r) => r.decision_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('approval_decisions')) {
        const [entity_type, entity_id, action, outcome, chain, context, created_by] = p;
        const row = {
          decision_id: `dec-${++id}`, entity_type, entity_id, action, outcome,
          chain: typeof chain === 'string' ? JSON.parse(chain) : chain,
          context: typeof context === 'string' ? JSON.parse(context) : context,
          created_at: new Date(Date.now() + id).toISOString(), created_by,
        };
        decisions.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ matrix, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    approvalMatrixRuntimeDeps: {
      client: makeClient({ matrix }),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app };
}

test('buildChain: empty rules → auto_approved', () => {
  const r = buildChain([], {});
  assert.equal(r.outcome, 'auto_approved');
  assert.deepEqual(r.chain, []);
});

test('buildChain: explicit none rule → not_required', () => {
  const r = buildChain([
    { rule_id: 'r1', approver_role: 'x', rule_kind: 'none', threshold_field: null, threshold_min: null, ordinal: 0 },
  ], {});
  assert.equal(r.outcome, 'not_required');
});

test('buildChain: ordered chain by ordinal, threshold filtered', () => {
  const r = buildChain([
    { rule_id: 'r2', approver_role: 'cfo', rule_kind: 'required', threshold_field: 'amount', threshold_min: 100000, ordinal: 2 },
    { rule_id: 'r1', approver_role: 'manager', rule_kind: 'required', threshold_field: null, threshold_min: null, ordinal: 1 },
  ], { amount: 50000 });
  assert.equal(r.outcome, 'pending');
  assert.equal(r.chain.length, 1);
  assert.equal(r.chain[0].approverRole, 'manager');
});

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /resolve no rules → auto_approved + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp({ matrix: [] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime/resolve', 'POST', {
      entityType: 'policy', entityId: 'p-1', action: 'publish',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.outcome, 'auto_approved');
    assert.equal(r.body.data.chain.length, 0);
    const a = captured.find((e) => e.action === 'approval.resolve');
    assert.equal(a.after.outcome, 'auto_approved');
  } finally { server.close(); }
});

test('POST /resolve with required rules → pending chain', async () => {
  const matrix = [
    { rule_id: 'r1', entity_type: 'policy', action: 'publish', approver_role: 'manager', rule_kind: 'required', threshold_field: null, threshold_min: null, ordinal: 1 },
    { rule_id: 'r2', entity_type: 'policy', action: 'publish', approver_role: 'cfo', rule_kind: 'required', threshold_field: 'amount', threshold_min: 50000, ordinal: 2 },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime/resolve', 'POST', {
      entityType: 'policy', entityId: 'p-2', action: 'publish', context: { amount: 100000 },
    });
    assert.equal(r.body.data.outcome, 'pending');
    assert.equal(r.body.data.chain.length, 2);
    assert.equal(r.body.data.chain[0].approverRole, 'manager');
    assert.equal(r.body.data.chain[1].approverRole, 'cfo');
  } finally { server.close(); }
});

test('POST /resolve threshold not met filters step', async () => {
  const matrix = [
    { rule_id: 'r1', entity_type: 'policy', action: 'publish', approver_role: 'cfo', rule_kind: 'required', threshold_field: 'amount', threshold_min: 1000000, ordinal: 1 },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime/resolve', 'POST', {
      entityType: 'policy', entityId: 'p-3', action: 'publish', context: { amount: 100 },
    });
    assert.equal(r.body.data.outcome, 'auto_approved');
  } finally { server.close(); }
});

test('POST /resolve none rule → not_required', async () => {
  const matrix = [
    { rule_id: 'r1', entity_type: 'expense', action: 'submit', approver_role: '-', rule_kind: 'none', threshold_field: null, threshold_min: null, ordinal: 0 },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime/resolve', 'POST', {
      entityType: 'expense', entityId: 'e-1', action: 'submit',
    });
    assert.equal(r.body.data.outcome, 'not_required');
  } finally { server.close(); }
});

test('POST /resolve missing required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/approval-matrix-runtime/resolve', 'POST', {
      entityType: 'x',
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('GET /:id 404 + list filter outcome + permission gate write 403', async () => {
  const { app: app1 } = buildApp({ matrix: [] });
  const l1 = await listen(app1);
  try {
    const r404 = await fetchJson(l1.port, '/api/compliance/approval-matrix-runtime/missing');
    assert.equal(r404.status, 404);
    await fetchJson(l1.port, '/api/compliance/approval-matrix-runtime/resolve', 'POST',
      { entityType: 'a', entityId: '1', action: 'go' });
    const r = await fetchJson(l1.port, '/api/compliance/approval-matrix-runtime?outcome=auto_approved');
    assert.equal(r.body.meta.total, 1);
  } finally { l1.server.close(); }
  const { app: app2 } = buildApp({ hasPermission: (k) => k === 'approval.decision.read' });
  const l2 = await listen(app2);
  try {
    const r = await fetchJson(l2.port, '/api/compliance/approval-matrix-runtime/resolve', 'POST',
      { entityType: 'a', entityId: '1', action: 'go' });
    assert.equal(r.status, 403);
  } finally { l2.server.close(); }
});
