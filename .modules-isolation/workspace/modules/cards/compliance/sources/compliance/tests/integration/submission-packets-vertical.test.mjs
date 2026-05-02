/**
 * W54 — /api/compliance/submission-packets vertical wiring tests.
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
    if (s.includes('AND regulator_code =')) { out = out.filter((r) => r.regulator_code === p[i]); i++; }
    if (s.includes('AND framework_code =')) { out = out.filter((r) => r.framework_code === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.title ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT packet_id')) {
        if (s.includes('WHERE packet_id = $1')) {
          const m = rows.find((r) => r.packet_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('submission_packets')) {
        const [regulator_code, framework_code, title, summary,
          period_start, period_end, status] = p;
        const now = new Date().toISOString();
        const row = {
          packet_id: `p-${++id}`, regulator_code, framework_code, title, summary,
          period_start, period_end, status,
          submitted_at: null, submitted_by: null,
          accepted_at: null, rejection_reason: null,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('submission_packets') && s.includes('SET status')) {
        const [packetId, status, rejectionReason, stampSubmitted, actorId, stampAccepted] = p;
        const row = rows.find((x) => x.packet_id === packetId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (stampSubmitted && row.submitted_at == null) {
          row.submitted_at = new Date().toISOString();
          row.submitted_by = actorId;
        }
        if (stampAccepted && row.accepted_at == null) row.accepted_at = new Date().toISOString();
        if (status === 'rejected') row.rejection_reason = rejectionReason;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('submission_packets')) {
        const idx = rows.findIndex((x) => x.packet_id === p[0]);
        if (idx === -1) return { rows: [], rowCount: 0 };
        const [removed] = rows.splice(idx, 1);
        return { rows: [removed], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    submissionPacketsDeps: {
      client: makeClient(),
      resolveContext: () => ({
        tenantId: ctx?.tenantId ?? 't1',
        userId: ctx?.userId ?? 'u1',
        tenantSchema: ctx?.tenantSchema ?? 'tenant_t1',
        hasPermission,
      }),
    },
  });
  return { app };
}

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/submission-packets');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=draft + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'NCA', frameworkCode: 'ECC-2', title: '2025 Q1 ECC-2 Filing' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'draft');
    assert.equal(r.body.data.submittedAt, null);
    const a = captured.find((e) => e.action === 'submission_packet.create');
    assert.equal(a.after.regulatorCode, 'NCA');
  } finally { server.close(); }
});

test('POST without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'NCA' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bad status → bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'X', frameworkCode: 'X', title: 'X', status: 'pending' });
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH submitted auto-stamps submittedAt+submittedBy', async () => {
  const { app } = buildApp({ ctx: { userId: 'reviewer-1' } });
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'SAMA', frameworkCode: 'CSF', title: 'CSF Q1' });
    const r = await fetchJson(port,
      `/api/compliance/submission-packets/${c.body.data.packetId}/status`,
      'PATCH', { status: 'submitted' });
    assert.equal(r.body.data.status, 'submitted');
    assert.notEqual(r.body.data.submittedAt, null);
    assert.equal(r.body.data.submittedBy, 'reviewer-1');
  } finally { server.close(); }
});

test('PATCH accepted auto-stamps acceptedAt', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'SAMA', frameworkCode: 'CSF', title: 'CSF Q2' });
    await fetchJson(port,
      `/api/compliance/submission-packets/${c.body.data.packetId}/status`,
      'PATCH', { status: 'submitted' });
    const r = await fetchJson(port,
      `/api/compliance/submission-packets/${c.body.data.packetId}/status`,
      'PATCH', { status: 'accepted' });
    assert.equal(r.body.data.status, 'accepted');
    assert.notEqual(r.body.data.acceptedAt, null);
  } finally { server.close(); }
});

test('PATCH rejected captures rejectionReason', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'X', frameworkCode: 'X', title: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/submission-packets/${c.body.data.packetId}/status`,
      'PATCH', { status: 'rejected', rejectionReason: 'incomplete evidence' });
    assert.equal(r.body.data.status, 'rejected');
    assert.equal(r.body.data.rejectionReason, 'incomplete evidence');
  } finally { server.close(); }
});

test('PATCH bad_status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'X', frameworkCode: 'X', title: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/submission-packets/${c.body.data.packetId}/status`,
      'PATCH', { status: 'archived' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filter narrows by regulatorCode + status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'NCA', frameworkCode: 'ECC-2', title: 'A' });
    await fetchJson(port,
      `/api/compliance/submission-packets/${a.body.data.packetId}/status`,
      'PATCH', { status: 'submitted' });
    await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'NCA', frameworkCode: 'ECC-2', title: 'B' });
    await fetchJson(port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'SAMA', frameworkCode: 'CSF', title: 'C' });
    const r = await fetchJson(port,
      '/api/compliance/submission-packets?regulatorCode=NCA&status=submitted');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404 + permission gate denies write', async () => {
  const { app: app1 } = buildApp();
  const l1 = await listen(app1);
  try {
    const c = await fetchJson(l1.port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'X', frameworkCode: 'X', title: 'X' });
    const d1 = await fetchJson(l1.port,
      `/api/compliance/submission-packets/${c.body.data.packetId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(l1.port,
      `/api/compliance/submission-packets/${c.body.data.packetId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { l1.server.close(); }
  const { app: app2 } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const l2 = await listen(app2);
  try {
    const r = await fetchJson(l2.port, '/api/compliance/submission-packets', 'POST',
      { regulatorCode: 'X', frameworkCode: 'X', title: 'X' });
    assert.equal(r.status, 403);
  } finally { l2.server.close(); }
});
