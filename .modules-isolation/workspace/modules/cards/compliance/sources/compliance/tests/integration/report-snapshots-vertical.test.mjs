/**
 * W32 — /api/compliance/report-snapshots vertical wiring tests.
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
    let i = 1;
    let out = rows.filter((r) => r.tenant_id === p[0]);
    if (s.includes('AND report_type =')) { out = out.filter((r) => r.report_type === p[i]); i++; }
    if (s.includes('AND generated_by =')) { out = out.filter((r) => r.generated_by === p[i]); i++; }
    if (s.includes('AND (expires_at IS NULL OR expires_at > NOW())')) {
      out = out.filter((r) => r.expires_at === null || new Date(r.expires_at).getTime() > Date.now());
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, report_type, title')) {
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === p[0] && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        return { rows: matchFilters(s, p), rowCount: matchFilters(s, p).length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_report_snapshots')) {
        const [tenant_id, report_type, title, parameters, result_data, generated_by, expires_at] = p;
        const now = new Date().toISOString();
        const row = {
          id: `rs-${++id}`, tenant_id, report_type, title,
          parameters: typeof parameters === 'string' ? JSON.parse(parameters) : parameters,
          result_data: typeof result_data === 'string' ? JSON.parse(result_data) : result_data,
          generated_by, generated_at: now, expires_at,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('compliance_report_snapshots')) {
        const [tenant_id, id_] = p;
        const idx = rows.findIndex((x) => x.tenant_id === tenant_id && x.id === id_);
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
    reportSnapshotsDeps: {
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

test('GET /api/compliance/report-snapshots empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/report-snapshots');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates snapshot with parameters/resultData; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'posture', title: 'Q4 Posture',
        parameters: { framework: 'ISO27001' },
        resultData: { score: 87 } });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.reportType, 'posture');
    assert.deepEqual(c.body.data.parameters, { framework: 'ISO27001' });
    assert.deepEqual(c.body.data.resultData, { score: 87 });
    const one = await fetchJson(port, `/api/compliance/report-snapshots/${c.body.data.id}`);
    assert.equal(one.status, 200);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/report-snapshots', 'POST', { reportType: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filters: reportType + generatedBy narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'posture', title: 'a' });
    await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'posture', title: 'b' });
    await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'audit', title: 'c' });
    const p = await fetchJson(port, '/api/compliance/report-snapshots?reportType=posture');
    assert.equal(p.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/report-snapshots?reportType=posture&generatedBy=u1');
    assert.equal(both.body.meta.total, 2);
  } finally { server.close(); }
});

test('expired snapshots hidden by default; includeExpired returns them', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'r', title: 'live' });
    await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'r', title: 'expired', expiresAt: '2000-01-01T00:00:00Z' });
    const def = await fetchJson(port, '/api/compliance/report-snapshots');
    assert.equal(def.body.meta.total, 1);
    const all = await fetchJson(port, '/api/compliance/report-snapshots?includeExpired=true');
    assert.equal(all.body.meta.total, 2);
  } finally { server.close(); }
});

test('DELETE removes row + writes audit before; second delete → 404', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'r', title: 't' });
    const id = c.body.data.id;
    const d = await fetchJson(port, `/api/compliance/report-snapshots/${id}`, 'DELETE');
    assert.equal(d.status, 200);
    const a = captured.find((e) => e.action === 'report_snapshot.delete');
    assert.ok(a);
    assert.equal(a.before.id, id);
    const miss = await fetchJson(port, `/api/compliance/report-snapshots/${id}`, 'DELETE');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('GET /:id missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/report-snapshots/missing');
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without report_snapshot.snapshot.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'report_snapshot.snapshot.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/report-snapshots');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/report-snapshots', 'POST',
      { reportType: 'r', title: 't' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /report_snapshot\.snapshot\.write/);
  } finally { server.close(); }
});
