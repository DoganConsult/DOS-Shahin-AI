/**
 * W19 — /api/compliance/monitoring vertical wiring tests.
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
      if (s.startsWith('SELECT id, tenant_id, requirement_id, monitoring_type')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND monitoring_type =')) { out = out.filter((r) => r.monitoring_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND automated =')) { out = out.filter((r) => r.automated === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND monitoring_type =')) { out = out.filter((r) => r.monitoring_type === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND automated =')) { out = out.filter((r) => r.automated === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_monitoring')) {
        const [tenant_id, requirement_id, monitoring_type, frequency,
               last_checked, next_check, status, automated, alertJson] = p;
        const now = new Date().toISOString();
        const row = {
          id: `mon-${++id}`, tenant_id, requirement_id, monitoring_type,
          frequency, last_checked, next_check, status, automated,
          alert_threshold: JSON.parse(alertJson),
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_monitoring')) {
        const [tenant_id, id_, checkedAt, nextCheck, status] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.last_checked = checkedAt ?? new Date().toISOString();
        if (nextCheck !== null) r.next_check = nextCheck;
        if (status !== null) r.status = status;
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
    monitoringDeps: {
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

test('GET /api/compliance/monitoring empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/monitoring');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates monitoring with defaults active/false; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'req-1', monitoringType: 'periodic', frequency: 'monthly' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'active');
    assert.equal(c.body.data.automated, false);
    assert.deepEqual(c.body.data.alertThreshold, {});
    const one = await fetchJson(port, `/api/compliance/monitoring/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without requirementId/monitoringType → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/monitoring', 'POST', { frequency: 'daily' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r', monitoringType: 't', status: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters: monitoringType + automated narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r1', monitoringType: 'periodic', automated: true });
    await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r2', monitoringType: 'periodic', automated: false });
    await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r3', monitoringType: 'continuous', automated: true });
    const periodic = await fetchJson(port, '/api/compliance/monitoring?monitoringType=periodic');
    assert.equal(periodic.body.meta.total, 2);
    const auto = await fetchJson(port, '/api/compliance/monitoring?automated=true');
    assert.equal(auto.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/monitoring?monitoringType=periodic&automated=true');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/check sets lastChecked/nextCheck/status and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r', monitoringType: 'periodic' });
    const id = c.body.data.id;
    const next = '2030-01-01T00:00:00.000Z';
    const u = await fetchJson(port, `/api/compliance/monitoring/${id}/check`, 'PATCH',
      { nextCheck: next, status: 'failed' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'failed');
    assert.equal(u.body.data.nextCheck, next);
    assert.ok(u.body.data.lastChecked);
    const a = captured.find((e) => e.action === 'monitoring.check');
    assert.ok(a);
    assert.equal(a.before.status, 'active');
    assert.equal(a.after.status, 'failed');
    assert.equal(a.before.lastChecked, null);
    assert.ok(a.after.lastChecked);
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/monitoring/missing/check', 'PATCH', {});
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without monitoring.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'monitoring.record.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/monitoring');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/monitoring', 'POST',
      { requirementId: 'r', monitoringType: 't' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /monitoring\.record\.write/);
  } finally { server.close(); }
});
