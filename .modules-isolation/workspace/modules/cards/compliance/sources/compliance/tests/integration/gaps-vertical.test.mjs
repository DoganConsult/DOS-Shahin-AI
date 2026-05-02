/**
 * W14 — /api/compliance/gaps vertical wiring tests.
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

function makeGapsClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, assessment_id, requirement_id')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND assessment_id =')) { out = out.filter((r) => r.assessment_id === p[i]); i++; }
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND gap_status =')) { out = out.filter((r) => r.gap_status === p[i]); i++; }
        if (s.includes('AND compliance_level =')) { out = out.filter((r) => r.compliance_level === p[i]); i++; }
        if (s.includes('AND owner_id =')) { out = out.filter((r) => r.owner_id === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND assessment_id =')) { out = out.filter((r) => r.assessment_id === p[i]); i++; }
        if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
        if (s.includes('AND gap_status =')) { out = out.filter((r) => r.gap_status === p[i]); i++; }
        if (s.includes('AND compliance_level =')) { out = out.filter((r) => r.compliance_level === p[i]); i++; }
        if (s.includes('AND owner_id =')) { out = out.filter((r) => r.owner_id === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_gaps')) {
        const [tenant_id, assessment_id, requirement_id, gap_status, compliance_level,
               finding_text, remediation_plan, due_date, owner_id, evidenceJson] = p;
        const now = new Date().toISOString();
        const row = {
          id: `gap-${++id}`, tenant_id, assessment_id, requirement_id,
          gap_status, compliance_level, finding_text, remediation_plan,
          due_date, owner_id, evidence_refs: JSON.parse(evidenceJson),
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_gaps') && s.includes('SET gap_status')) {
        const [tenant_id, id_, gap_status, compliance_level] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.gap_status = gap_status;
        if (compliance_level) r.compliance_level = compliance_level;
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
  const client = makeGapsClient();
  registerCompliance({
    app,
    gapsDeps: {
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

test('GET /api/compliance/gaps empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/gaps');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates gap with defaults open/non_compliant; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'asmt-1', requirementId: 'req-1', findingText: 'No control evidence' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.gapStatus, 'open');
    assert.equal(c.body.data.complianceLevel, 'non_compliant');
    assert.deepEqual(c.body.data.evidenceRefs, []);
    const one = await fetchJson(port, `/api/compliance/gaps/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without assessmentId/requirementId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/gaps', 'POST', { findingText: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad gapStatus → 400 bad_status; bad complianceLevel → 400 bad_level', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'a', requirementId: 'r', gapStatus: 'broken' });
    assert.equal(a.status, 400);
    assert.equal(a.body.error.code, 'bad_status');
    const b = await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'a', requirementId: 'r', complianceLevel: 'sorta' });
    assert.equal(b.status, 400);
    assert.equal(b.body.error.code, 'bad_level');
  } finally { server.close(); }
});

test('list filters: assessmentId + gapStatus', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'A', requirementId: 'r1', gapStatus: 'open' });
    await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'A', requirementId: 'r2', gapStatus: 'closed' });
    await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'B', requirementId: 'r3', gapStatus: 'open' });
    const byA = await fetchJson(port, '/api/compliance/gaps?assessmentId=A');
    assert.equal(byA.body.meta.total, 2);
    const open = await fetchJson(port, '/api/compliance/gaps?gapStatus=open');
    assert.equal(open.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/gaps?assessmentId=A&gapStatus=open');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status transitions and writes audit before/after for both fields', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'a', requirementId: 'r' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/gaps/${id}/status`, 'PATCH',
      { gapStatus: 'in_remediation', complianceLevel: 'partially_compliant' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.gapStatus, 'in_remediation');
    assert.equal(u.body.data.complianceLevel, 'partially_compliant');
    const a = captured.find((e) => e.action === 'gap.status_change');
    assert.ok(a);
    assert.equal(a.before.gapStatus, 'open');
    assert.equal(a.after.gapStatus, 'in_remediation');
    assert.equal(a.before.complianceLevel, 'non_compliant');
    assert.equal(a.after.complianceLevel, 'partially_compliant');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/gaps/missing/status', 'PATCH',
      { gapStatus: 'closed' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without gap.record.write', async () => {
  const app = buildApp({ hasPermission: (k) => k === 'gap.record.read' }).app;
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/gaps');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/gaps', 'POST',
      { assessmentId: 'a', requirementId: 'r' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /gap\.record\.write/);
  } finally { server.close(); }
});
