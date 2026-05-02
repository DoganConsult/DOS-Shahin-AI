/**
 * W41 — /api/compliance/attestation-drafts vertical wiring tests.
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
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND entity_id =')) { out = out.filter((r) => r.entity_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT draft_id, entity_type, entity_id')) {
        if (s.includes('WHERE draft_id = $1')) {
          const m = rows.find((r) => r.draft_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('attestation_drafts')) {
        const [entity_type, entity_id, entity_name, readiness_score, content, expires_at] = p;
        const now = new Date().toISOString();
        const row = {
          draft_id: `d-${++id}`, entity_type, entity_id, entity_name,
          readiness_score, content, status: 'draft', generated_at: now,
          approved_by: null, approved_at: null, expires_at,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('attestation_drafts')) {
        const [draft_id, status, actor, stamp] = p;
        const row = rows.find((x) => x.draft_id === draft_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (stamp) {
          row.approved_by = actor;
          row.approved_at = new Date().toISOString();
        }
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('attestation_drafts')) {
        const idx = rows.findIndex((x) => x.draft_id === p[0]);
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
    attestationDraftsDeps: {
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

test('GET /api/compliance/attestation-drafts empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-drafts');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with defaults entityType=framework, status=draft', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityId: 'fw-1', entityName: 'SOC2' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.entityType, 'framework');
    assert.equal(c.body.data.status, 'draft');
    assert.equal(c.body.data.approvedBy, null);
  } finally { server.close(); }
});

test('POST without entityId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('PATCH /:id/review → approved stamps approved_by + approved_at + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityType: 'control', entityId: 'AC-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-drafts/${c.body.data.draftId}/review`,
      'PATCH', { status: 'approved' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'approved');
    assert.equal(r.body.data.approvedBy, 'u1');
    assert.ok(r.body.data.approvedAt);
    const a = captured.find((e) => e.action === 'attestation_draft.review');
    assert.ok(a);
    assert.equal(a.before.status, 'draft');
    assert.equal(a.after.status, 'approved');
  } finally { server.close(); }
});

test('PATCH /:id/review pending_review keeps approved_by null', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityType: 'control', entityId: 'AC-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-drafts/${c.body.data.draftId}/review`,
      'PATCH', { status: 'pending_review' });
    assert.equal(r.body.data.status, 'pending_review');
    assert.equal(r.body.data.approvedBy, null);
  } finally { server.close(); }
});

test('PATCH /:id/review with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityId: 'fw-1' });
    const r = await fetchJson(port,
      `/api/compliance/attestation-drafts/${c.body.data.draftId}/review`,
      'PATCH', { status: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters narrow by entityType+status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityType: 'framework', entityId: 'fw-1' });
    await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityType: 'control', entityId: 'AC-1' });
    const r = await fetchJson(port,
      '/api/compliance/attestation-drafts?entityType=control');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attestation-drafts', 'POST',
      { entityId: 'fw-1' });
    const d1 = await fetchJson(port,
      `/api/compliance/attestation-drafts/${c.body.data.draftId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/attestation-drafts/${c.body.data.draftId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'attestation_draft.draft.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/attestation-drafts', 'POST',
      { entityId: 'fw-1' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
