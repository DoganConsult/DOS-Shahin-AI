/**
 * W17 — /api/compliance/evidence-links vertical wiring tests.
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
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, requirement_id, evidence_id')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND evidence_id =')) { out = out.filter((r) => r.evidence_id === p[i]); i++; }
        if (s.includes('AND link_type =')) { out = out.filter((r) => r.link_type === p[i]); i++; }
        if (s.includes('AND verified_at IS NOT NULL')) out = out.filter((r) => r.verified_at !== null);
        if (s.includes('AND verified_at IS NULL')) out = out.filter((r) => r.verified_at === null);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND evidence_id =')) { out = out.filter((r) => r.evidence_id === p[i]); i++; }
        if (s.includes('AND link_type =')) { out = out.filter((r) => r.link_type === p[i]); i++; }
        if (s.includes('AND verified_at IS NOT NULL')) out = out.filter((r) => r.verified_at !== null);
        if (s.includes('AND verified_at IS NULL')) out = out.filter((r) => r.verified_at === null);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_evidence_links')) {
        const [tenant_id, requirement_id, evidence_id, link_type, notes] = p;
        const now = new Date().toISOString();
        const row = {
          id: `el-${++id}`, tenant_id, requirement_id, evidence_id, link_type,
          verified_at: null, verified_by: null, notes,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_evidence_links')) {
        const [tenant_id, id_, verified, verifier, notes] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.verified_at = verified ? new Date().toISOString() : null;
        r.verified_by = verifier;
        if (notes !== null) r.notes = notes;
        r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
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
    evidenceLinksDeps: {
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

test('GET /api/compliance/evidence-links empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-links');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates link with default type supporting; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'req-1', evidenceId: 'ev-1', notes: 'attached' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.linkType, 'supporting');
    assert.equal(c.body.data.verifiedAt, null);
    assert.equal(c.body.data.verifiedBy, null);
    const one = await fetchJson(port, `/api/compliance/evidence-links/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without requirementId/evidenceId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-links', 'POST', { notes: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad linkType → 400 bad_link_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'r', evidenceId: 'e', linkType: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_link_type');
  } finally { server.close(); }
});

test('list filters: requirementId + linkType + verifiedOnly narrow result set', async () => {
  const { app, client } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'R1', evidenceId: 'e1', linkType: 'primary' });
    await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'R1', evidenceId: 'e2', linkType: 'supporting' });
    await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'R2', evidenceId: 'e3', linkType: 'primary' });
    // mark first link verified directly
    client._rows[0].verified_at = new Date().toISOString();
    client._rows[0].verified_by = 'u1';
    const byR1 = await fetchJson(port, '/api/compliance/evidence-links?requirementId=R1');
    assert.equal(byR1.body.meta.total, 2);
    const primary = await fetchJson(port, '/api/compliance/evidence-links?linkType=primary');
    assert.equal(primary.body.meta.total, 2);
    const verified = await fetchJson(port, '/api/compliance/evidence-links?verifiedOnly=true');
    assert.equal(verified.body.meta.total, 1);
    const both = await fetchJson(port, '/api/compliance/evidence-links?requirementId=R1&linkType=primary&verifiedOnly=true');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/verify sets verifiedAt/verifiedBy and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'r', evidenceId: 'e' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/evidence-links/${id}/verify`, 'PATCH',
      { verified: true });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.verifiedBy, 'u1');
    assert.ok(u.body.data.verifiedAt);
    const a = captured.find((e) => e.action === 'evidence_link.verify');
    assert.ok(a);
    assert.equal(a.before.verifiedBy, null);
    assert.equal(a.after.verifiedBy, 'u1');
    // clear verification
    const cl = await fetchJson(port, `/api/compliance/evidence-links/${id}/verify`, 'PATCH',
      { verified: false });
    assert.equal(cl.body.data.verifiedAt, null);
    assert.equal(cl.body.data.verifiedBy, null);
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-links/missing/verify', 'PATCH',
      { verified: true });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without evidence.link.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'evidence.link.read' });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-links', 'POST',
      { requirementId: 'r', evidenceId: 'e' });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'forbidden');
  } finally { server.close(); }
});
