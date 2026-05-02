/**
 * W13 — /api/compliance/requirements vertical wiring tests.
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

function makeReqClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, framework_id, ref_code, title')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
        if (s.includes('AND criticality =')) { out = out.filter((r) => r.criticality === p[i]); i++; }
        if (s.includes('AND is_active =')) { out = out.filter((r) => r.is_active === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) => r.ref_code.toLowerCase().includes(pat) || r.title.toLowerCase().includes(pat));
        }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
        if (s.includes('AND criticality =')) { out = out.filter((r) => r.criticality === p[i]); i++; }
        if (s.includes('AND is_active =')) { out = out.filter((r) => r.is_active === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) => r.ref_code.toLowerCase().includes(pat) || r.title.toLowerCase().includes(pat));
        }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('compliance_requirements')) {
        const [tenant_id, framework_id, ref_code, title, description, category,
               criticality, is_active, metadataJson] = p;
        const row = {
          id: `req-${++id}`, tenant_id, framework_id, ref_code, title, description,
          category, criticality, is_active, metadata: JSON.parse(metadataJson),
          created_at: new Date().toISOString(),
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
  const client = makeReqClient();
  registerCompliance({
    app,
    requirementsDeps: {
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

test('GET /api/compliance/requirements empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/requirements');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates requirement, GET reads it; default criticality medium', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-1', refCode: 'NCA-1.1.1', title: 'Cybersecurity strategy' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.refCode, 'NCA-1.1.1');
    assert.equal(c.body.data.criticality, 'medium');
    assert.equal(c.body.data.isActive, true);
    const one = await fetchJson(port, `/api/compliance/requirements/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without frameworkId/refCode/title → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/requirements', 'POST', { description: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with invalid criticality → 400 bad_criticality', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-1', refCode: 'X', title: 'Y', criticality: 'extreme' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_criticality');
  } finally { server.close(); }
});

test('list filters: criticality + frameworkId + search', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-A', refCode: 'A-1', title: 'High one', criticality: 'high' });
    await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-A', refCode: 'A-2', title: 'Low one', criticality: 'low' });
    await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-B', refCode: 'B-1', title: 'Other', criticality: 'high' });
    const byCrit = await fetchJson(port, '/api/compliance/requirements?criticality=high');
    assert.equal(byCrit.body.meta.total, 2);
    const byFw = await fetchJson(port, '/api/compliance/requirements?frameworkId=fw-A');
    assert.equal(byFw.body.meta.total, 2);
    const search = await fetchJson(port, '/api/compliance/requirements?search=A-1');
    assert.equal(search.body.meta.total, 1);
    assert.equal(search.body.data[0].refCode, 'A-1');
  } finally { server.close(); }
});

test('audit port receives requirement.create entry on successful POST', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-1', refCode: 'X', title: 'Y' });
    assert.equal(c.status, 201);
    const a = captured.find((e) => e.action === 'requirement.create');
    assert.ok(a);
    assert.equal(a.resourceId, c.body.data.id);
    assert.equal(a.module, 'compliance');
  } finally { server.close(); }
});

test('permission gate denies write without requirement.record.write', async () => {
  const app = buildApp({ hasPermission: (k) => k === 'requirement.record.read' }).app;
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/requirements');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/requirements', 'POST',
      { frameworkId: 'fw-1', refCode: 'X', title: 'Y' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /requirement\.record\.write/);
  } finally { server.close(); }
});

test('bad tenantSchema rejected with 400', async () => {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    requirementsDeps: {
      client: makeReqClient(),
      resolveContext: () => ({ tenantId: 't1', userId: 'u1', tenantSchema: 'public; DROP;' }),
    },
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/requirements');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_schema');
  } finally { server.close(); }
});
