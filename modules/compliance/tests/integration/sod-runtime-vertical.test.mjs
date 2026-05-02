/**
 * W61 — /api/compliance/sod-runtime vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, bindAuditPort, deriveVerdict } = require('../../dist/index.js');

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
  const evals = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT role_a, role_b, conflict_type, severity FROM') && s.includes('sod_conflict_matrix')) {
        const set = new Set(p);
        const out = matrix.filter((m) => set.has(m.role_a) && set.has(m.role_b));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT evaluation_id')) {
        if (s.includes('WHERE evaluation_id = $1')) {
          const m = evals.find((r) => r.evaluation_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = evals.slice(); let i = 0;
        if (s.includes('AND subject_user_id =')) { out = out.filter((r) => r.subject_user_id === p[i]); i++; }
        if (s.includes('AND verdict =')) { out = out.filter((r) => r.verdict === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        let out = evals.slice(); let i = 0;
        if (s.includes('AND subject_user_id =')) { out = out.filter((r) => r.subject_user_id === p[i]); i++; }
        if (s.includes('AND verdict =')) { out = out.filter((r) => r.verdict === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('sod_evaluations')) {
        const [subject_user_id, candidate_roles, verdict, hits, context, evaluated_by] = p;
        const row = {
          evaluation_id: `ev-${++id}`, subject_user_id,
          candidate_roles: typeof candidate_roles === 'string' ? JSON.parse(candidate_roles) : candidate_roles,
          verdict,
          hits: typeof hits === 'string' ? JSON.parse(hits) : hits,
          context: typeof context === 'string' ? JSON.parse(context) : context,
          evaluated_at: new Date().toISOString(), evaluated_by,
        };
        evals.push(row);
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
    sodRuntimeDeps: {
      client: makeClient({ matrix }),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app };
}

test('deriveVerdict: empty hits → allowed', () => {
  assert.equal(deriveVerdict([]), 'allowed');
});

test('deriveVerdict: forbidden dominates', () => {
  const v = deriveVerdict([
    { roleA: 'a', roleB: 'b', conflictType: 'requires_approval', severity: 'low' },
    { roleA: 'c', roleB: 'd', conflictType: 'forbidden', severity: 'high' },
  ]);
  assert.equal(v, 'blocked');
});

test('deriveVerdict: requires_approval over requires_review', () => {
  const v = deriveVerdict([
    { roleA: 'a', roleB: 'b', conflictType: 'requires_review', severity: 'low' },
    { roleA: 'c', roleB: 'd', conflictType: 'requires_approval', severity: 'low' },
  ]);
  assert.equal(v, 'requires_approval');
});

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST /evaluate with no conflicts → allowed + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp({ matrix: [] });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime/evaluate', 'POST', {
      subjectUserId: 'u-99', candidateRoles: ['maker', 'reviewer'],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.verdict, 'allowed');
    assert.equal(r.body.data.hits.length, 0);
    const a = captured.find((e) => e.action === 'sod.evaluate');
    assert.equal(a.after.verdict, 'allowed');
  } finally { server.close(); }
});

test('POST /evaluate with forbidden pair → blocked', async () => {
  const matrix = [
    { role_a: 'maker', role_b: 'approver', conflict_type: 'forbidden', severity: 'high' },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime/evaluate', 'POST', {
      subjectUserId: 'u-1', candidateRoles: ['maker', 'approver'],
    });
    assert.equal(r.body.data.verdict, 'blocked');
    assert.equal(r.body.data.hits.length, 1);
    assert.equal(r.body.data.hits[0].conflictType, 'forbidden');
  } finally { server.close(); }
});

test('POST /evaluate with requires_approval pair', async () => {
  const matrix = [
    { role_a: 'submitter', role_b: 'auditor', conflict_type: 'requires_approval', severity: 'medium' },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime/evaluate', 'POST', {
      subjectUserId: 'u-2', candidateRoles: ['submitter', 'auditor'],
    });
    assert.equal(r.body.data.verdict, 'requires_approval');
  } finally { server.close(); }
});

test('POST /evaluate single role → allowed (no pair check)', async () => {
  const matrix = [
    { role_a: 'maker', role_b: 'approver', conflict_type: 'forbidden', severity: 'high' },
  ];
  const { app } = buildApp({ matrix });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime/evaluate', 'POST', {
      subjectUserId: 'u-x', candidateRoles: ['maker'],
    });
    assert.equal(r.body.data.verdict, 'allowed');
  } finally { server.close(); }
});

test('POST /evaluate without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sod-runtime/evaluate', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filter by verdict narrows + permission gate denies write 403', async () => {
  const matrix = [
    { role_a: 'a', role_b: 'b', conflict_type: 'forbidden', severity: 'high' },
  ];
  const { app: app1 } = buildApp({ matrix });
  const l1 = await listen(app1);
  try {
    await fetchJson(l1.port, '/api/compliance/sod-runtime/evaluate', 'POST',
      { subjectUserId: 'u1', candidateRoles: ['a', 'b'] });
    await fetchJson(l1.port, '/api/compliance/sod-runtime/evaluate', 'POST',
      { subjectUserId: 'u1', candidateRoles: ['x'] });
    const r = await fetchJson(l1.port, '/api/compliance/sod-runtime?verdict=blocked');
    assert.equal(r.body.meta.total, 1);
  } finally { l1.server.close(); }
  const { app: app2 } = buildApp({ hasPermission: (k) => k === 'sod.evaluation.read' });
  const l2 = await listen(app2);
  try {
    const r = await fetchJson(l2.port, '/api/compliance/sod-runtime/evaluate', 'POST',
      { subjectUserId: 'u', candidateRoles: ['a'] });
    assert.equal(r.status, 403);
  } finally { l2.server.close(); }
});
