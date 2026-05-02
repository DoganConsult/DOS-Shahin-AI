/**
 * W10 — /api/frameworks real vertical wiring tests.
 *
 * Run: node --test tests/integration/frameworks-vertical.test.mjs
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

function makeFwClient() {
  const rows = [];
  let id = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, code, name,')) {
        const tenantId = p[0];
        if (s.includes('WHERE tenant_id = $1 AND id = $2')) {
          const m = rows.find((r) => r.tenant_id === tenantId && r.id === p[1]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        // list path: optional isActive ($2) or search ($2/$3)
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND is_active =')) { out = out.filter((r) => r.is_active === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) => r.code.toLowerCase().includes(pat) || r.name.toLowerCase().includes(pat));
        }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const tenantId = p[0];
        let out = rows.filter((r) => r.tenant_id === tenantId);
        let i = 1;
        if (s.includes('AND is_active =')) { out = out.filter((r) => r.is_active === p[i]); i++; }
        if (s.includes('ILIKE')) {
          const pat = String(p[i]).replace(/%/g, '').toLowerCase();
          out = out.filter((r) => r.code.toLowerCase().includes(pat) || r.name.toLowerCase().includes(pat));
        }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.includes('INSERT INTO') && s.includes('compliance_frameworks')) {
        const [tenant_id, code, name, version, authority, is_active, metadataJson] = p;
        if (rows.find((r) => r.tenant_id === tenant_id && r.code === code)) {
          throw Object.assign(new Error('duplicate key value violates UNIQUE constraint'), { code: '23505' });
        }
        const row = {
          id: `fw-${++id}`, tenant_id, code, name, version, authority,
          is_active, metadata: JSON.parse(metadataJson),
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
  const client = makeFwClient();
  registerCompliance({
    app,
    frameworksDeps: {
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

test('aggregator marks /api/frameworks as wired when frameworksDeps provided', () => {
  const app = express();
  const r = registerCompliance({
    app,
    frameworksDeps: {
      client: makeFwClient(),
      resolveContext: () => ({ tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1' }),
    },
  });
  const m = r.mounts.find((x) => x.routeBase === '/api/frameworks');
  assert.equal(m.wired, true);
});

test('GET /api/frameworks empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/frameworks');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates framework, GET lists/reads it; duplicate code → 409', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/frameworks', 'POST',
      { code: 'NCA', name: 'NCA Essential Cybersecurity Controls', version: '2.0', authority: 'NCA' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.code, 'NCA');
    const list = await fetchJson(port, '/api/frameworks');
    assert.equal(list.body.meta.total, 1);
    const one = await fetchJson(port, `/api/frameworks/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
    const dup = await fetchJson(port, '/api/frameworks', 'POST', { code: 'NCA', name: 'dup' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'duplicate_code');
  } finally { server.close(); }
});

test('POST without code/name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/frameworks', 'POST', { authority: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('search filter narrows the list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/frameworks', 'POST', { code: 'SAMA-CSF', name: 'SAMA Cyber Security Framework' });
    await fetchJson(port, '/api/frameworks', 'POST', { code: 'PDPL', name: 'Personal Data Protection Law' });
    const r = await fetchJson(port, '/api/frameworks?search=SAMA');
    assert.equal(r.status, 200);
    assert.equal(r.body.meta.total, 1);
    assert.equal(r.body.data[0].code, 'SAMA-CSF');
  } finally { server.close(); }
});

test('permission gate: read denied → 403; write requires framework.record.write', async () => {
  let app = buildApp({ hasPermission: () => false }).app;
  let s = await listen(app);
  try {
    const r = await fetchJson(s.port, '/api/frameworks');
    assert.equal(r.status, 403);
    assert.match(r.body.error.message, /framework\.record\.read/);
  } finally { s.server.close(); }

  app = buildApp({ hasPermission: (k) => k === 'framework.record.read' }).app;
  s = await listen(app);
  try {
    const ok = await fetchJson(s.port, '/api/frameworks');
    assert.equal(ok.status, 200);
    const post = await fetchJson(s.port, '/api/frameworks', 'POST', { code: 'X', name: 'Y' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /framework\.record\.write/);
  } finally { s.server.close(); }
});

test('audit port receives framework.create entry on successful POST', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/frameworks', 'POST', { code: 'ISO27001', name: 'ISO 27001' });
    assert.equal(c.status, 201);
    const found = captured.find((e) => e.action === 'framework.create');
    assert.ok(found, 'audit not captured');
    assert.equal(found.resourceId, c.body.data.id);
    assert.equal(found.module, 'compliance');
  } finally { server.close(); }
});

test('bad tenantSchema rejected with 400', async () => {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    frameworksDeps: {
      client: makeFwClient(),
      resolveContext: () => ({ tenantId: 't1', userId: 'u1', tenantSchema: 'public; DROP TABLE x;' }),
    },
  });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/frameworks');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_schema');
  } finally { server.close(); }
});
