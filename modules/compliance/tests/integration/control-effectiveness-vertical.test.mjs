/**
 * W36 — /api/compliance/control-effectiveness vertical wiring tests.
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
  let seq = 0;
  const matchFilters = (s, p) => {
    let i = 0;
    let out = rows.slice();
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND assessment_type =')) { out = out.filter((r) => r.assessment_type === p[i]); i++; }
    if (s.includes('AND rating =')) { out = out.filter((r) => r.rating === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT assessment_id, control_id, assessment_type')) {
        if (s.includes('WHERE assessment_id = $1')) {
          const m = rows.find((r) => r.assessment_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes('WHERE control_id = $1') && s.includes('ORDER BY assessment_date DESC LIMIT 1')) {
          let out = rows.filter((r) => r.control_id === p[0]);
          if (s.includes('AND assessment_type = $2')) {
            out = out.filter((r) => r.assessment_type === p[1]);
          }
          out.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
          const m = out[0];
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('control_effectiveness_assessments')) {
        const [control_id, assessment_type, rating, evidence_reference, assessed_by, notes] = p;
        const row = {
          assessment_id: `e-${++id}`, control_id, assessment_type, rating,
          evidence_reference, assessed_by, notes,
          assessment_date: new Date(Date.now() + (++seq) * 1000).toISOString(),
          created_at: new Date().toISOString(),
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
    controlEffectivenessDeps: {
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

test('GET /api/compliance/control-effectiveness empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-effectiveness');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST defaults type=design rating=not_assessed assessedBy=actor', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.assessmentType, 'design');
    assert.equal(c.body.data.rating, 'not_assessed');
    assert.equal(c.body.data.assessedBy, 'u1');
  } finally { server.close(); }
});

test('POST without controlId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { rating: 'effective' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad rating → 400 bad_rating', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', rating: 'amazing' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_rating');
  } finally { server.close(); }
});

test('list filters: controlId + assessmentType + rating narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', assessmentType: 'design', rating: 'effective' });
    await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', assessmentType: 'operating', rating: 'partially_effective' });
    await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-2', assessmentType: 'design', rating: 'effective' });
    const ac1 = await fetchJson(port, '/api/compliance/control-effectiveness?controlId=AC-1');
    assert.equal(ac1.body.meta.total, 2);
    const eff = await fetchJson(port, '/api/compliance/control-effectiveness?rating=effective');
    assert.equal(eff.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/control-effectiveness?controlId=AC-1&assessmentType=design');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('GET /latest/:controlId returns most recent assessment', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', rating: 'partially_effective' });
    await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', rating: 'effective' });
    const lat = await fetchJson(port, '/api/compliance/control-effectiveness/latest/AC-1');
    assert.equal(lat.status, 200);
    assert.equal(lat.body.data.rating, 'effective');
  } finally { server.close(); }
});

test('POST fires audit control_effectiveness.record with rating in after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1', assessmentType: 'operating', rating: 'effective' });
    assert.equal(c.status, 201);
    const a = captured.find((e) => e.action === 'control_effectiveness.record');
    assert.ok(a);
    assert.equal(a.after.rating, 'effective');
    assert.equal(a.after.assessmentType, 'operating');
  } finally { server.close(); }
});

test('permission gate denies write without control_effectiveness.assessment.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'control_effectiveness.assessment.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/control-effectiveness');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/control-effectiveness', 'POST',
      { controlId: 'AC-1' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /control_effectiveness\.assessment\.write/);
  } finally { server.close(); }
});
