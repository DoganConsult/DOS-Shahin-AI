/**
 * W43 — /api/compliance/csa-responses vertical wiring tests.
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
    if (s.includes('AND campaign_id =')) { out = out.filter((r) => r.campaign_id === p[i]); i++; }
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND respondent =')) { out = out.filter((r) => r.respondent === p[i]); i++; }
    if (s.includes('AND effectiveness_rating =')) { out = out.filter((r) => r.effectiveness_rating === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT response_id, campaign_id, control_id')) {
        if (s.includes('WHERE response_id = $1')) {
          const m = rows.find((r) => r.response_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('csa_responses')) {
        const [campaign_id, control_id, respondent, effectiveness_rating,
               design_adequate, operating_effective, evidence_available, comments] = p;
        const row = {
          response_id: `r-${++id}`, campaign_id, control_id, respondent,
          effectiveness_rating, design_adequate, operating_effective,
          evidence_available, comments,
          submitted_at: new Date().toISOString(),
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
    csaResponsesDeps: {
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

test('GET /api/compliance/csa-responses empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults respondent=actor + rating=not_assessed', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-1' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.respondent, 'u1');
    assert.equal(r.body.data.effectivenessRating, 'not_assessed');
  } finally { server.close(); }
});

test('POST without campaignId/controlId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad rating → 400 bad_rating', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-1', effectivenessRating: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_rating');
  } finally { server.close(); }
});

test('POST with effective + booleans persists fully + audit submit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses', 'POST', {
      campaignId: 'c-1', controlId: 'AC-1', effectivenessRating: 'effective',
      designAdequate: true, operatingEffective: true, evidenceAvailable: false,
      comments: 'all good',
    });
    assert.equal(r.body.data.effectivenessRating, 'effective');
    assert.equal(r.body.data.designAdequate, true);
    assert.equal(r.body.data.evidenceAvailable, false);
    assert.equal(r.body.data.comments, 'all good');
    const a = captured.find((e) => e.action === 'csa_response.submit');
    assert.ok(a);
    assert.equal(a.after.effectivenessRating, 'effective');
  } finally { server.close(); }
});

test('GET single by id returns 200 then 404 on missing', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-1' });
    const g = await fetchJson(port,
      `/api/compliance/csa-responses/${c.body.data.responseId}`);
    assert.equal(g.status, 200);
    const m = await fetchJson(port, '/api/compliance/csa-responses/missing');
    assert.equal(m.status, 404);
  } finally { server.close(); }
});

test('list filters narrow by campaignId + effectivenessRating', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-1', effectivenessRating: 'effective' });
    await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-2', effectivenessRating: 'ineffective' });
    await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-2', controlId: 'AC-1', effectivenessRating: 'effective' });
    const r = await fetchJson(port,
      '/api/compliance/csa-responses?campaignId=c-1&effectivenessRating=effective');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('permission gate denies write without csa_response.response.write', async () => {
  const gated = buildApp({ hasPermission: (k) => k === 'csa_response.response.read' });
  const { server, port } = await listen(gated.app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-responses', 'POST',
      { campaignId: 'c-1', controlId: 'AC-1' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
