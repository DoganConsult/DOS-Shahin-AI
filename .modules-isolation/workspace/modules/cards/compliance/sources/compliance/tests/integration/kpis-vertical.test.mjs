/**
 * W25 — /api/compliance/kpis vertical wiring tests.
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
    let i = 1;
    let out = rows.filter((r) => r.tenant_id === p[0]);
    if (s.includes('AND kpi_code =')) { out = out.filter((r) => r.kpi_code === p[i]); i++; }
    if (s.includes('AND trend =')) { out = out.filter((r) => r.trend === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, kpi_code, name')) {
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        return { rows: matchFilters(s, p), rowCount: matchFilters(s, p).length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_kpis')) {
        const [tenant_id, kpi_code, name, current_value, target_value,
               unit, period_start, period_end, trend] = p;
        const now = new Date().toISOString();
        const row = {
          id: `kpi-${++id}`, tenant_id, kpi_code, name,
          current_value, target_value, unit, period_start, period_end, trend,
          computed_at: now, created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_kpis')) {
        const [tenant_id, id_, currentValue, trend] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.current_value = currentValue;
        if (trend) r.trend = trend;
        r.computed_at = new Date().toISOString();
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
    kpisDeps: {
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

test('GET /api/compliance/kpis empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/kpis');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates KPI; GET reads it back with numeric coercion', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'pdpl-coverage', name: 'PDPL Coverage', currentValue: 87.5, targetValue: 100, unit: '%' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.kpiCode, 'pdpl-coverage');
    assert.equal(c.body.data.currentValue, 87.5);
    assert.equal(c.body.data.targetValue, 100);
    const one = await fetchJson(port, `/api/compliance/kpis/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without kpiCode/name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/kpis', 'POST', { unit: '%' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad trend → 400 bad_trend', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'k', name: 'n', trend: 'sideways' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_trend');
  } finally { server.close(); }
});

test('list filters: kpiCode + trend narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'A', name: 'A', trend: 'up' });
    await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'A', name: 'A2', trend: 'down' });
    await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'B', name: 'B', trend: 'up' });
    const onA = await fetchJson(port, '/api/compliance/kpis?kpiCode=A');
    assert.equal(onA.body.meta.total, 2);
    const upT = await fetchJson(port, '/api/compliance/kpis?trend=up');
    assert.equal(upT.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/kpis?kpiCode=A&trend=up');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/value records new value + trend, stamps computed_at, audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'k', name: 'k', currentValue: 50, trend: 'flat' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/kpis/${id}/value`, 'PATCH',
      { currentValue: 78, trend: 'up' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.currentValue, 78);
    assert.equal(u.body.data.trend, 'up');
    const a = captured.find((e) => e.action === 'kpi.value_change');
    assert.ok(a);
    assert.equal(a.before.currentValue, 50);
    assert.equal(a.after.currentValue, 78);
    assert.equal(a.before.trend, 'flat');
    assert.equal(a.after.trend, 'up');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/kpis/missing/value', 'PATCH',
      { currentValue: 10 });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without kpi.metric.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'kpi.metric.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/kpis');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/kpis', 'POST',
      { kpiCode: 'k', name: 'k' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /kpi\.metric\.write/);
  } finally { server.close(); }
});
