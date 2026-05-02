/**
 * W52b — /api/compliance/framework-sector-applicability vertical tests.
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
    if (s.includes('AND framework_code =')) { out = out.filter((r) => r.framework_code === p[i]); i++; }
    if (s.includes('AND sector_id =')) { out = out.filter((r) => r.sector_id === p[i]); i++; }
    if (s.includes('AND applicability =')) { out = out.filter((r) => r.applicability === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, framework_code')) {
        if (s.includes('WHERE id = $1')) {
          const m = rows.find((r) => r.id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('framework_sector_applicability')) {
        const [framework_code, sector_id, applicability, notes] = p;
        rows.push({
          id: `fsa-${++id}`, framework_code, sector_id, applicability, notes,
          created_at: new Date().toISOString(),
        });
        return { rows: [rows[rows.length - 1]], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('framework_sector_applicability')) {
        const idx = rows.findIndex((x) => x.id === p[0]);
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
    frameworkSectorApplicabilityDeps: {
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
    const r = await fetchJson(port, '/api/compliance/framework-sector-applicability');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with applicability=mandatory + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'NCA-ECC2', sectorId: 'sec-banking' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.applicability, 'mandatory');
    const a = captured.find((e) => e.action === 'framework_sector_applicability.create');
    assert.equal(a.after.frameworkCode, 'NCA-ECC2');
  } finally { server.close(); }
});

test('POST without frameworkCode/sectorId → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'X' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bad applicability → bad_applicability', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'F', sectorId: 'S', applicability: 'maybe' });
    assert.equal(r.body.error.code, 'bad_applicability');
  } finally { server.close(); }
});

test('list filter narrows by frameworkCode', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'NCA-ECC2', sectorId: 'sec-1' });
    await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'SAMA-CSF', sectorId: 'sec-1' });
    const r = await fetchJson(port,
      '/api/compliance/framework-sector-applicability?frameworkCode=NCA-ECC2');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('list filter by applicability', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'F1', sectorId: 'S1', applicability: 'mandatory' });
    await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'F2', sectorId: 'S2', applicability: 'recommended' });
    const r = await fetchJson(port,
      '/api/compliance/framework-sector-applicability?applicability=recommended');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'F', sectorId: 'S' });
    const d1 = await fetchJson(port,
      `/api/compliance/framework-sector-applicability/${c.body.data.id}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/framework-sector-applicability/${c.body.data.id}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/framework-sector-applicability', 'POST',
      { frameworkCode: 'F', sectorId: 'S' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
