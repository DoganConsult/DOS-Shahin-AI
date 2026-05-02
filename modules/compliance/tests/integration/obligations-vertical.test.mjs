/**
 * W11 — /api/compliance/obligations vertical wiring tests.
 *
 * Run: node --test tests/integration/obligations-vertical.test.mjs
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

function makeOblClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, framework_id, obligation_ref')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) =>
            r.obligation_ref.toLowerCase().includes(pat) || r.title.toLowerCase().includes(pat));
        }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) =>
            r.obligation_ref.toLowerCase().includes(pat) || r.title.toLowerCase().includes(pat));
        }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_obligations')) {
        const [tenant_id, framework_id, obligation_ref, title, description,
               obligation_type, frequency, due_date, owner_id, status] = p;
        const now = new Date().toISOString();
        const row = {
          id: `obl-${++id}`, tenant_id, framework_id, obligation_ref, title, description,
          obligation_type, frequency, due_date, owner_id, status,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_obligations') && s.includes('SET status')) {
        const [tenant_id, id_, status] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = status; r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ ctx, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeOblClient();
  registerCompliance({
    app,
    obligationsDeps: {
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

test('GET /api/compliance/obligations empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/obligations');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates obligation, GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/obligations', 'POST',
      { obligationRef: 'NCA-1.1.1', title: 'Cybersecurity strategy', dueDate: '2026-12-31' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.obligationRef, 'NCA-1.1.1');
    assert.equal(c.body.data.status, 'active');
    const one = await fetchJson(port, `/api/compliance/obligations/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without obligationRef/title → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/obligations', 'POST', { description: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with invalid status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/obligations', 'POST',
      { obligationRef: 'X', title: 'Y', status: 'invalid' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH /:id/status transitions and writes audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/obligations', 'POST',
      { obligationRef: 'X', title: 'Y' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/obligations/${id}/status`, 'PATCH', { status: 'met' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'met');
    const audit = captured.find((e) => e.action === 'obligation.status_change');
    assert.ok(audit);
    assert.equal(audit.before.status, 'active');
    assert.equal(audit.after.status, 'met');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/obligations/missing/status', 'PATCH', { status: 'met' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('search filter narrows the list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/obligations', 'POST', { obligationRef: 'NCA-1', title: 'NCA strategy' });
    await fetchJson(port, '/api/compliance/obligations', 'POST', { obligationRef: 'PDPL-2', title: 'Privacy notice' });
    const r = await fetchJson(port, '/api/compliance/obligations?search=NCA');
    assert.equal(r.body.meta.total, 1);
    assert.equal(r.body.data[0].obligationRef, 'NCA-1');
  } finally { server.close(); }
});

test('permission gate denies write without compliance.admin', async () => {
  const app = buildApp({ hasPermission: (k) => k === 'compliance.read' }).app;
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/obligations');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/obligations', 'POST',
      { obligationRef: 'X', title: 'Y' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /compliance\.admin/);
  } finally { server.close(); }
});
