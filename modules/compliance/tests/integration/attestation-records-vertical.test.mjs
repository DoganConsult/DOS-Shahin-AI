/**
 * W40 — /api/compliance/attestation-records vertical wiring tests.
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
    if (s.includes('AND user_id =')) { out = out.filter((r) => r.user_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT record_id, campaign_id, user_id')) {
        if (s.includes('WHERE record_id = $1')) {
          const m = rows.find((r) => r.record_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('attestation_records')) {
        const [campaign_id, user_id] = p;
        const now = new Date().toISOString();
        const row = {
          record_id: `r-${++id}`, campaign_id, user_id, status: 'pending',
          attested_at: null, declined_reason: null, last_reminded_at: null,
          created_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('attestation_records')) {
        if (s.includes('last_reminded_at = NOW()')) {
          const row = rows.find((x) => x.record_id === p[0]);
          if (!row) return { rows: [], rowCount: 0 };
          row.last_reminded_at = new Date().toISOString();
          return { rows: [row], rowCount: 1 };
        }
        const [record_id, status, declined_reason, stamp] = p;
        const row = rows.find((x) => x.record_id === record_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (stamp) row.attested_at = new Date().toISOString();
        if (declined_reason !== null) row.declined_reason = declined_reason;
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('attestation_records')) {
        const idx = rows.findIndex((x) => x.record_id === p[0]);
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
    attestationRecordsDeps: {
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

test('GET /api/compliance/attestation-records empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-records');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=pending', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'pending');
    assert.equal(c.body.data.attestedAt, null);
  } finally { server.close(); }
});

test('POST without required → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('PATCH /:id/attest → attested stamps attested_at + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-records/${c.body.data.recordId}/attest`,
      'PATCH', { status: 'attested' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'attested');
    assert.ok(r.body.data.attestedAt);
    const a = captured.find((e) => e.action === 'attestation_record.attest');
    assert.ok(a);
    assert.equal(a.before.status, 'pending');
    assert.equal(a.after.status, 'attested');
  } finally { server.close(); }
});

test('PATCH /:id/attest declined keeps attested_at null + stores reason', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-records/${c.body.data.recordId}/attest`,
      'PATCH', { status: 'declined', declinedReason: 'ooo' });
    assert.equal(r.body.data.status, 'declined');
    assert.equal(r.body.data.attestedAt, null);
    assert.equal(r.body.data.declinedReason, 'ooo');
  } finally { server.close(); }
});

test('PATCH /:id/attest with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-records/${c.body.data.recordId}/attest`,
      'PATCH', { status: 'maybe' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH /:id/remind stamps last_reminded_at', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-records/${c.body.data.recordId}/remind`,
      'PATCH', {});
    assert.equal(r.status, 200);
    assert.ok(r.body.data.lastRemindedAt);
  } finally { server.close(); }
});

test('list filters: campaignId+userId+status narrow + DELETE 404 + permission gate', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    await fetchJson(port, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-2' });
    const r = await fetchJson(port,
      '/api/compliance/attestation-records?campaignId=c-1&userId=u-1');
    assert.equal(r.body.meta.total, 1);
    const d1 = await fetchJson(port,
      `/api/compliance/attestation-records/${a.body.data.recordId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/attestation-records/${a.body.data.recordId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'attestation_record.record.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/attestation-records', 'POST',
      { campaignId: 'c-1', userId: 'u-1' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
