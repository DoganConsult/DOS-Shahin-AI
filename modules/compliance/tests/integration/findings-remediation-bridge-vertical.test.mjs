/**
 * W62 — /api/compliance/findings-remediation-bridge vertical wiring tests.
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

function makeClient({ findings = [] } = {}) {
  const actions = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 0;
    let out = actions.slice();
    if (s.includes('AND finding_id =')) { out = out.filter((r) => r.finding_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND owner_user_id =')) { out = out.filter((r) => r.owner_user_id === p[i]); i++; }
    return out;
  };
  return {
    findings,
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT finding_id, finding_status FROM')) {
        const f = findings.find((r) => r.finding_id === p[0]);
        return f ? { rows: [f], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT action_id')) {
        if (s.includes('WHERE action_id = $1')) {
          const m = actions.find((r) => r.action_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('remediation_actions')) {
        const [finding_id, owner_user_id, plan, priority, due_date, created_by] = p;
        const row = {
          action_id: `act-${++id}`, finding_id, owner_user_id, plan,
          status: 'open', priority, due_date, completed_at: null,
          created_at: new Date(Date.now() + id).toISOString(), created_by,
        };
        actions.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('findings') && s.includes("finding_status = 'in_remediation'")) {
        const f = findings.find((r) => r.finding_id === p[0] && r.finding_status === 'open');
        if (!f) return { rows: [], rowCount: 0 };
        f.finding_status = 'in_remediation';
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('remediation_actions')) {
        const row = actions.find((r) => r.action_id === p[0]);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = p[1];
        if (p[1] === 'completed') row.completed_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ findings, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ findings });
  registerCompliance({
    app,
    findingsRemediationBridgeDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /from-finding creates action + advances open finding + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const findings = [{ finding_id: 'f-1', finding_status: 'open' }];
  const { app } = buildApp({ findings });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f-1', ownerUserId: 'u-2', plan: 'patch and verify',
      priority: 'high', dueDate: '2026-12-31',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.action.findingId, 'f-1');
    assert.equal(r.body.data.action.status, 'open');
    assert.equal(r.body.data.action.priority, 'high');
    assert.equal(r.body.data.findingAdvanced, true);
    assert.equal(findings[0].finding_status, 'in_remediation');
    const a = captured.find((e) => e.action === 'remediation.action.bridge_from_finding');
    assert.equal(a.after.findingAdvanced, true);
  } finally { server.close(); }
});

test('POST /from-finding does not advance finding already in_remediation', async () => {
  const findings = [{ finding_id: 'f-2', finding_status: 'in_remediation' }];
  const { app } = buildApp({ findings });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f-2', ownerUserId: 'u', plan: 'p',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.findingAdvanced, false);
  } finally { server.close(); }
});

test('POST /from-finding with missing finding → 404', async () => {
  const { app } = buildApp({ findings: [] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'missing', ownerUserId: 'u', plan: 'p',
    });
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'not_found');
  } finally { server.close(); }
});

test('POST /from-finding without required → bad_input', async () => {
  const { app } = buildApp({ findings: [{ finding_id: 'f', finding_status: 'open' }] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f',
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST /from-finding bad priority → bad_priority', async () => {
  const { app } = buildApp({ findings: [{ finding_id: 'f', finding_status: 'open' }] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f', ownerUserId: 'u', plan: 'p', priority: 'bogus',
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_priority');
  } finally { server.close(); }
});

test('PATCH status=completed stamps completed_at + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const findings = [{ finding_id: 'f-3', finding_status: 'open' }];
  const { app } = buildApp({ findings });
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f-3', ownerUserId: 'u', plan: 'p',
    });
    const id = c.body.data.action.actionId;
    const r = await fetchJson(port, `/api/compliance/findings-remediation-bridge/${id}/status`, 'PATCH', {
      status: 'completed',
    });
    assert.equal(r.body.data.status, 'completed');
    assert.ok(r.body.data.completedAt);
    const a = captured.find((e) => e.action === 'remediation.action.status');
    assert.equal(a.after.status, 'completed');
  } finally { server.close(); }
});

test('PATCH status with bad value → bad_status', async () => {
  const findings = [{ finding_id: 'f-4', finding_status: 'open' }];
  const { app } = buildApp({ findings });
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST', {
      findingId: 'f-4', ownerUserId: 'u', plan: 'p',
    });
    const id = c.body.data.action.actionId;
    const r = await fetchJson(port, `/api/compliance/findings-remediation-bridge/${id}/status`, 'PATCH', {
      status: 'unknown',
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('GET /:id 404 + list filter by status', async () => {
  const findings = [
    { finding_id: 'fa', finding_status: 'open' },
    { finding_id: 'fb', finding_status: 'open' },
  ];
  const { app } = buildApp({ findings });
  const { server, port } = await listen(app);
  try {
    const r404 = await fetchJson(port, '/api/compliance/findings-remediation-bridge/missing');
    assert.equal(r404.status, 404);
    const c1 = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST',
      { findingId: 'fa', ownerUserId: 'u', plan: 'p' });
    await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST',
      { findingId: 'fb', ownerUserId: 'u', plan: 'p' });
    await fetchJson(port, `/api/compliance/findings-remediation-bridge/${c1.body.data.action.actionId}/status`, 'PATCH',
      { status: 'in_progress' });
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge?status=open');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('permission gate denies write 403', async () => {
  const { app } = buildApp({
    findings: [{ finding_id: 'f', finding_status: 'open' }],
    hasPermission: (k) => k === 'remediation.action.read',
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/findings-remediation-bridge/from-finding', 'POST',
      { findingId: 'f', ownerUserId: 'u', plan: 'p' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
