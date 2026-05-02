/**
 * W44 — /api/compliance/ucf-controls vertical wiring tests.
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
    if (s.includes('AND lifecycle_state =')) { out = out.filter((r) => r.lifecycle_state === p[i]); i++; }
    if (s.includes('AND owner =')) { out = out.filter((r) => r.owner === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) =>
        (r.code ?? '').toLowerCase().includes(pat) ||
        (r.objective_en ?? '').toLowerCase().includes(pat) ||
        (r.activity_en ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT control_id, code, objective_en')) {
        if (s.includes('WHERE control_id = $1')) {
          const m = rows.find((r) => r.control_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('ucf_controls')) {
        const [code, objective_en, objective_ar, activity_en, activity_ar,
               owner, frequency, evidence_requirements, test_steps, exception_rules] = p;
        const now = new Date().toISOString();
        const row = {
          control_id: `u-${++id}`, code,
          objective_en, objective_ar, activity_en, activity_ar,
          owner, frequency, evidence_requirements, test_steps, exception_rules,
          lifecycle_state: 'draft', created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('ucf_controls') && s.includes('lifecycle_state = $2')) {
        const [control_id, lifecycle_state] = p;
        const row = rows.find((x) => x.control_id === control_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.lifecycle_state = lifecycle_state;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('ucf_controls')) {
        const [control_id, objective_en, objective_ar, activity_en, activity_ar,
               owner, frequency, evidence_requirements, test_steps, exception_rules] = p;
        const row = rows.find((x) => x.control_id === control_id);
        if (!row) return { rows: [], rowCount: 0 };
        if (objective_en !== null) row.objective_en = objective_en;
        if (objective_ar !== null) row.objective_ar = objective_ar;
        if (activity_en !== null) row.activity_en = activity_en;
        if (activity_ar !== null) row.activity_ar = activity_ar;
        if (owner !== null) row.owner = owner;
        if (frequency !== null) row.frequency = frequency;
        if (evidence_requirements !== null) row.evidence_requirements = evidence_requirements;
        if (test_steps !== null) row.test_steps = test_steps;
        if (exception_rules !== null) row.exception_rules = exception_rules;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('ucf_controls')) {
        const idx = rows.findIndex((x) => x.control_id === p[0]);
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
    ucfControlsDeps: {
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

test('GET /api/compliance/ucf-controls empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ucf-controls');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults lifecycle_state=draft', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-001', objectiveEn: 'Access control' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.code, 'UCF-001');
    assert.equal(r.body.data.lifecycleState, 'draft');
    assert.deepEqual(r.body.data.evidenceRequirements, []);
  } finally { server.close(); }
});

test('POST without code → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ucf-controls', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('PATCH updates owner+frequency via COALESCE + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-002', owner: 'alice' });
    const r = await fetchJson(port,
      `/api/compliance/ucf-controls/${c.body.data.controlId}`,
      'PATCH', { owner: 'bob', frequency: 'monthly' });
    assert.equal(r.body.data.owner, 'bob');
    assert.equal(r.body.data.frequency, 'monthly');
    const a = captured.find((e) => e.action === 'ucf_control.update');
    assert.ok(a);
    assert.equal(a.before.owner, 'alice');
    assert.equal(a.after.owner, 'bob');
  } finally { server.close(); }
});

test('PATCH /:id/lifecycle active stamps + audit; bad state → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-003' });
    const r = await fetchJson(port,
      `/api/compliance/ucf-controls/${c.body.data.controlId}/lifecycle`,
      'PATCH', { lifecycleState: 'active' });
    assert.equal(r.body.data.lifecycleState, 'active');
    const bad = await fetchJson(port,
      `/api/compliance/ucf-controls/${c.body.data.controlId}/lifecycle`,
      'PATCH', { lifecycleState: 'bogus' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'bad_state');
  } finally { server.close(); }
});

test('list filters narrow by lifecycle_state + owner', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-A', owner: 'alice' });
    await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-B', owner: 'bob' });
    await fetchJson(port,
      `/api/compliance/ucf-controls/${a.body.data.controlId}/lifecycle`,
      'PATCH', { lifecycleState: 'active' });
    const r = await fetchJson(port,
      '/api/compliance/ucf-controls?lifecycleState=active&owner=alice');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('search ILIKE narrows on code/objective_en', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'AC-1', objectiveEn: 'Identity provisioning' });
    await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'CR-1', objectiveEn: 'Encryption at rest' });
    const r = await fetchJson(port, '/api/compliance/ucf-controls?search=identity');
    assert.equal(r.body.meta.total, 1);
    assert.equal(r.body.data[0].code, 'AC-1');
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ucf-controls', 'POST',
      { code: 'UCF-D' });
    const d1 = await fetchJson(port,
      `/api/compliance/ucf-controls/${c.body.data.controlId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/ucf-controls/${c.body.data.controlId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'ucf_control.control.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/ucf-controls', 'POST',
      { code: 'X' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
