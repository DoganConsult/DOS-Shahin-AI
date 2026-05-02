/**
 * W24 — /api/compliance/controls-mapping vertical wiring tests.
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
    if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND mapping_status =')) { out = out.filter((r) => r.mapping_status === p[i]); i++; }
    if (s.includes('AND effectiveness =')) { out = out.filter((r) => r.effectiveness === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, requirement_id, control_id, mapping_status')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_controls_mapping')) {
        const [tenant_id, requirement_id, control_id, mapping_status,
               effectiveness, last_tested, next_test_date, tester_id] = p;
        const now = new Date().toISOString();
        const row = {
          id: `cm-${++id}`, tenant_id, requirement_id, control_id,
          mapping_status, effectiveness,
          last_tested, next_test_date, tester_id,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_controls_mapping')) {
        const [tenant_id, id_, effectiveness, lastTested, nextTestDate, testerId] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.effectiveness = effectiveness;
        r.last_tested = lastTested ?? new Date().toISOString().slice(0, 10);
        if (nextTestDate) r.next_test_date = nextTestDate;
        if (testerId) r.tester_id = testerId;
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
    controlsMappingDeps: {
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

test('GET /api/compliance/controls-mapping empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/controls-mapping');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates mapping with default mapping_status active; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'req-1', controlId: 'ctl-1' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.mappingStatus, 'active');
    assert.equal(c.body.data.requirementId, 'req-1');
    const one = await fetchJson(port, `/api/compliance/controls-mapping/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without requirementId/controlId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { mappingStatus: 'active' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad effectiveness → 400 bad_effectiveness', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'r', controlId: 'c', effectiveness: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_effectiveness');
  } finally { server.close(); }
});

test('list filters: requirementId + mappingStatus narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'req-A', controlId: 'c1', mappingStatus: 'active' });
    await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'req-A', controlId: 'c2', mappingStatus: 'deprecated' });
    await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'req-B', controlId: 'c3', mappingStatus: 'active' });
    const onA = await fetchJson(port, '/api/compliance/controls-mapping?requirementId=req-A');
    assert.equal(onA.body.meta.total, 2);
    const act = await fetchJson(port, '/api/compliance/controls-mapping?mappingStatus=active');
    assert.equal(act.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/controls-mapping?requirementId=req-A&mappingStatus=active');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/test records effectiveness + lastTested and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'r', controlId: 'c' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/controls-mapping/${id}/test`, 'PATCH',
      { effectiveness: 'effective', testerId: 'u-tester' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.effectiveness, 'effective');
    assert.ok(u.body.data.lastTested);
    const a = captured.find((e) => e.action === 'controls_mapping.test');
    assert.ok(a);
    assert.equal(a.before.effectiveness, null);
    assert.equal(a.after.effectiveness, 'effective');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/controls-mapping/missing/test', 'PATCH',
      { effectiveness: 'effective' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without controls_mapping.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'controls_mapping.record.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/controls-mapping');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/controls-mapping', 'POST',
      { requirementId: 'r', controlId: 'c' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /controls_mapping\.record\.write/);
  } finally { server.close(); }
});
