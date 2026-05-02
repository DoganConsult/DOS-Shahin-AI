/**
 * W39 — /api/compliance/attestation-campaigns vertical wiring tests.
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
    if (s.includes('AND policy_id =')) { out = out.filter((r) => r.policy_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT campaign_id, name, policy_id')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('attestation_campaigns')) {
        const [name, policy_id, entity_type, entity_id, due_date, created_by, metadata] = p;
        const now = new Date().toISOString();
        const row = {
          campaign_id: `c-${++id}`, name, policy_id, entity_type, entity_id,
          status: 'draft', due_date, created_by, metadata,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('attestation_campaigns')) {
        const [campaign_id, status] = p;
        const row = rows.find((x) => x.campaign_id === campaign_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('attestation_campaigns')) {
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
    attestationCampaignsDeps: {
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

test('GET /api/compliance/attestation-campaigns empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-campaigns');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults entityType=framework, status=draft', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'Q4 SOC2 attest' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.name, 'Q4 SOC2 attest');
    assert.equal(c.body.data.entityType, 'framework');
    assert.equal(c.body.data.status, 'draft');
    assert.equal(c.body.data.createdBy, 'u1');
  } finally { server.close(); }
});

test('POST without name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad entityType → 400 bad_entity_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'X', entityType: 'asset' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_entity_type');
  } finally { server.close(); }
});

test('list filters narrow by policyId + status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'A', policyId: 'P-1' });
    await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'B', policyId: 'P-2' });
    await fetchJson(port,
      `/api/compliance/attestation-campaigns/${a.body.data.campaignId}/status`,
      'PATCH', { status: 'active' });
    const r = await fetchJson(port,
      '/api/compliance/attestation-campaigns?policyId=P-1&status=active');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status transitions + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-campaigns/${c.body.data.campaignId}/status`,
      'PATCH', { status: 'in_progress' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'in_progress');
    const a = captured.find((e) => e.action === 'attestation_campaign.status');
    assert.ok(a);
    assert.equal(a.before.status, 'draft');
    assert.equal(a.after.status, 'in_progress');
  } finally { server.close(); }
});

test('PATCH /:id/status with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-campaigns/${c.body.data.campaignId}/status`,
      'PATCH', { status: 'pending' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'X' });
    const d1 = await fetchJson(port,
      `/api/compliance/attestation-campaigns/${c.body.data.campaignId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/attestation-campaigns/${c.body.data.campaignId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'attestation_campaign.campaign.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/attestation-campaigns', 'POST',
      { name: 'X' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
