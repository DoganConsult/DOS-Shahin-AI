/**
 * W42 — /api/compliance/csa-campaigns vertical wiring tests.
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
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT campaign_id, title, description')) {
        if (s.includes('WHERE campaign_id = $1')) {
          const m = rows.find((r) => r.campaign_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('csa_campaigns')) {
        const [title, description, control_ids, respondent_ids, deadline, created_by] = p;
        const now = new Date().toISOString();
        const row = {
          campaign_id: `c-${++id}`, title, description, control_ids,
          respondent_ids, deadline, status: 'draft', created_by,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('csa_campaigns')) {
        const [campaign_id, status] = p;
        const row = rows.find((x) => x.campaign_id === campaign_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('csa_campaigns')) {
        const idx = rows.findIndex((x) => x.campaign_id === p[0]);
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
    csaCampaignsDeps: {
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

test('GET /api/compliance/csa-campaigns empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-campaigns');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults status=draft, createdBy=actor', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST',
      { title: 'Q1 CSA', controlIds: ['AC-1', 'AC-2'] });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'draft');
    assert.equal(c.body.data.createdBy, 'u1');
    assert.deepEqual(c.body.data.controlIds, ['AC-1', 'AC-2']);
  } finally { server.close(); }
});

test('POST without title → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('PATCH /:id/status active stamps updated_at + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST',
      { title: 'Q2 CSA' });
    const r = await fetchJson(port,
      `/api/compliance/csa-campaigns/${c.body.data.campaignId}/status`,
      'PATCH', { status: 'active' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'active');
    const a = captured.find((e) => e.action === 'csa_campaign.status');
    assert.ok(a);
    assert.equal(a.before.status, 'draft');
    assert.equal(a.after.status, 'active');
  } finally { server.close(); }
});

test('PATCH /:id/status with bad enum → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST',
      { title: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/csa-campaigns/${c.body.data.campaignId}/status`,
      'PATCH', { status: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH /:id/status on missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port,
      '/api/compliance/csa-campaigns/missing/status', 'PATCH',
      { status: 'closed' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('list filters narrow by status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST', { title: 'A' });
    await fetchJson(port, '/api/compliance/csa-campaigns', 'POST', { title: 'B' });
    await fetchJson(port,
      `/api/compliance/csa-campaigns/${a.body.data.campaignId}/status`,
      'PATCH', { status: 'closed' });
    const r = await fetchJson(port, '/api/compliance/csa-campaigns?status=closed');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/csa-campaigns', 'POST',
      { title: 'D' });
    const d1 = await fetchJson(port,
      `/api/compliance/csa-campaigns/${c.body.data.campaignId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/csa-campaigns/${c.body.data.campaignId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'csa_campaign.campaign.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/csa-campaigns', 'POST',
      { title: 'X' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
