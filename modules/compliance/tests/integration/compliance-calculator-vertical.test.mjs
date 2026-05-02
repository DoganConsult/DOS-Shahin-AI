/**
 * W57 — /api/compliance/compliance-calculator vertical wiring tests.
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

function makeClient({ requirements = [], gaps = [] } = {}) {
  const calcs = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 0;
    let out = calcs.slice();
    if (s.includes('AND scope =')) { out = out.filter((r) => r.scope === p[i]); i++; }
    if (s.includes('AND scope_ref =')) { out = out.filter((r) => r.scope_ref === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // requirements aggregation
      if (s.startsWith('SELECT status, COUNT(*)::text AS n FROM') && s.includes('.requirements')) {
        const ref = p[0];
        const matched = requirements.filter((r) => r.framework_code === ref || r.control_id === ref || r.workspace_id === ref);
        const grouped = {};
        for (const r of matched) grouped[r.status] = (grouped[r.status] ?? 0) + 1;
        return { rows: Object.entries(grouped).map(([status, n]) => ({ status, n: String(n) })), rowCount: Object.keys(grouped).length };
      }
      // gaps aggregation
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('.gaps')) {
        const ref = p[0];
        const matched = gaps.filter((g) =>
          (g.framework_code === ref || g.control_id === ref || g.workspace_id === ref)
          && !['closed', 'resolved'].includes(g.status));
        return { rows: [{ n: String(matched.length) }], rowCount: 1 };
      }
      // SELECT calc rows
      if (s.startsWith('SELECT calculation_id')) {
        if (s.includes('WHERE calculation_id = $1')) {
          const m = calcs.find((r) => r.calculation_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes('ORDER BY computed_at DESC LIMIT 1')) {
          const out = calcs
            .filter((r) => r.scope === p[0] && r.scope_ref === p[1])
            .sort((a, b) => b.computed_at.localeCompare(a.computed_at));
          return out.length ? { rows: [out[0]], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('.compliance_calculations')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // INSERT calc
      if (s.startsWith('INSERT INTO') && s.includes('compliance_calculations')) {
        const [scope, scope_ref, score_pct, total_requirements,
               satisfied_requirements, partial_requirements, unsatisfied_requirements,
               open_gaps, breakdown, computed_by] = p;
        const now = new Date().toISOString();
        const row = {
          calculation_id: `cc-${++id}`,
          scope, scope_ref, score_pct, total_requirements,
          satisfied_requirements, partial_requirements, unsatisfied_requirements,
          open_gaps,
          breakdown: typeof breakdown === 'string' ? JSON.parse(breakdown) : breakdown,
          computed_at: now, computed_by,
        };
        calcs.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ requirements, gaps, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    complianceCalculatorDeps: {
      client: makeClient({ requirements, gaps }),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app };
}

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /run with all met → 100', async () => {
  const reqs = [
    { framework_code: 'F1', status: 'met' },
    { framework_code: 'F1', status: 'met' },
  ];
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp({ requirements: reqs });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'F1' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.scorePct, 100);
    assert.equal(r.body.data.totalRequirements, 2);
    assert.equal(r.body.data.satisfiedRequirements, 2);
    const a = captured.find((e) => e.action === 'compliance_calculator.run');
    assert.equal(a.after.scope, 'framework');
  } finally { server.close(); }
});

test('POST /run with mixed → weighted partial', async () => {
  const reqs = [
    { framework_code: 'F2', status: 'met' },
    { framework_code: 'F2', status: 'partial' },
    { framework_code: 'F2', status: 'open' },
    { framework_code: 'F2', status: 'open' },
  ];
  const { app } = buildApp({ requirements: reqs });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'F2' });
    // satisfied=1, partial=1, total=4 → (1 + 0.5)/4 = 37.5
    assert.equal(r.body.data.scorePct, 37.5);
    assert.equal(r.body.data.partialRequirements, 1);
    assert.equal(r.body.data.unsatisfiedRequirements, 2);
  } finally { server.close(); }
});

test('POST /run with zero requirements → 0 score', async () => {
  const { app } = buildApp({ requirements: [] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'EMPTY' });
    assert.equal(r.body.data.scorePct, 0);
    assert.equal(r.body.data.totalRequirements, 0);
  } finally { server.close(); }
});

test('POST /run counts open gaps excluding closed/resolved', async () => {
  const reqs = [{ framework_code: 'F3', status: 'met' }];
  const gaps = [
    { framework_code: 'F3', status: 'open' },
    { framework_code: 'F3', status: 'in_remediation' },
    { framework_code: 'F3', status: 'closed' },
    { framework_code: 'F3', status: 'resolved' },
  ];
  const { app } = buildApp({ requirements: reqs, gaps });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'F3' });
    assert.equal(r.body.data.openGaps, 2);
  } finally { server.close(); }
});

test('POST /run without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST /run with bad scope → bad_scope', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'tenant', scopeRef: 'X' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_scope');
  } finally { server.close(); }
});

test('GET /latest returns most recent snapshot', async () => {
  const reqs = [{ framework_code: 'F4', status: 'met' }];
  const { app } = buildApp({ requirements: reqs });
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'F4' });
    await new Promise((r) => setTimeout(r, 5));
    await fetchJson(port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'F4' });
    const r = await fetchJson(port,
      '/api/compliance/compliance-calculator/latest?scope=framework&scopeRef=F4');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.scope, 'framework');
    assert.equal(r.body.data.scopeRef, 'F4');
  } finally { server.close(); }
});

test('GET /latest with missing scope → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-calculator/latest');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('GET /:id 404 + permission gate denies write', async () => {
  const { app: app1 } = buildApp();
  const l1 = await listen(app1);
  try {
    const r = await fetchJson(l1.port, '/api/compliance/compliance-calculator/missing');
    assert.equal(r.status, 404);
  } finally { l1.server.close(); }
  const { app: app2 } = buildApp({
    hasPermission: (k) => k === 'compliance_calculator.calc.read',
  });
  const l2 = await listen(app2);
  try {
    const r = await fetchJson(l2.port, '/api/compliance/compliance-calculator/run', 'POST',
      { scope: 'framework', scopeRef: 'X' });
    assert.equal(r.status, 403);
  } finally { l2.server.close(); }
});
