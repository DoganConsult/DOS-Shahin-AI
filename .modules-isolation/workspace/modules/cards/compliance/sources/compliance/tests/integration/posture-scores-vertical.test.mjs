/**
 * W20 — /api/compliance/posture-scores vertical wiring tests.
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
    if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
    if (s.includes('AND period =')) { out = out.filter((r) => r.period === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, framework_id, score')) {
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        out.sort((a, b) => (a.computed_at < b.computed_at ? 1 : -1));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT DISTINCT ON (framework_id)')) {
        const out = matchFilters(s, p);
        const byFw = new Map();
        for (const r of out.sort((a, b) => (a.computed_at < b.computed_at ? 1 : -1))) {
          if (!byFw.has(r.framework_id)) byFw.set(r.framework_id, r);
        }
        const arr = Array.from(byFw.values());
        return { rows: arr, rowCount: arr.length };
      }
      if (s.startsWith('SELECT COUNT(DISTINCT framework_id)')) {
        const out = matchFilters(s, p);
        const set = new Set(out.map((r) => r.framework_id));
        return { rows: [{ n: String(set.size) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_posture_scores')) {
        const [tenant_id, framework_id, score, total_requirements,
               compliant, partially_compliant, non_compliant, not_applicable,
               computedAt, period] = p;
        const now = new Date().toISOString();
        const row = {
          id: `ps-${++id}`, tenant_id, framework_id, score,
          total_requirements, compliant, partially_compliant,
          non_compliant, not_applicable,
          computed_at: computedAt ?? now, period,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
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
    postureScoresDeps: {
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

test('GET /api/compliance/posture-scores empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/posture-scores');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST records a new snapshot; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'fw-1', score: 87.5, totalRequirements: 100, compliant: 87, period: '2026-Q2' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.score, 87.5);
    assert.equal(c.body.data.totalRequirements, 100);
    assert.equal(c.body.data.period, '2026-Q2');
    assert.ok(c.body.data.computedAt);
    const one = await fetchJson(port, `/api/compliance/posture-scores/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without frameworkId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/posture-scores', 'POST', { score: 50 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with score out of range → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'fw', score: 150 });
    assert.equal(a.status, 400);
    assert.equal(a.body.error.code, 'bad_input');
    const b = await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'fw', score: -1 });
    assert.equal(b.status, 400);
    assert.equal(b.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filter: frameworkId narrows result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'A', score: 50, computedAt: '2026-01-01T00:00:00.000Z' });
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'A', score: 75, computedAt: '2026-02-01T00:00:00.000Z' });
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'B', score: 60, computedAt: '2026-01-15T00:00:00.000Z' });
    const all = await fetchJson(port, '/api/compliance/posture-scores');
    assert.equal(all.body.meta.total, 3);
    const onlyA = await fetchJson(port, '/api/compliance/posture-scores?frameworkId=A');
    assert.equal(onlyA.body.meta.total, 2);
  } finally { server.close(); }
});

test('list latest=true returns one snapshot per framework, newest', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'A', score: 50, computedAt: '2026-01-01T00:00:00.000Z' });
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'A', score: 75, computedAt: '2026-02-01T00:00:00.000Z' });
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'B', score: 60, computedAt: '2026-01-15T00:00:00.000Z' });
    const latest = await fetchJson(port, '/api/compliance/posture-scores?latest=true');
    assert.equal(latest.body.meta.total, 2);
    const a = latest.body.data.find((r) => r.frameworkId === 'A');
    assert.equal(a.score, 75);
  } finally { server.close(); }
});

test('audit trail captures posture_score.record', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'fw', score: 90 });
    const a = captured.find((e) => e.action === 'posture_score.record');
    assert.ok(a);
    assert.equal(a.after.score, 90);
  } finally { server.close(); }
});

test('permission gate denies write without posture_score.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'posture_score.record.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/posture-scores');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/posture-scores', 'POST',
      { frameworkId: 'fw', score: 50 });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /posture_score\.record\.write/);
  } finally { server.close(); }
});
