/**
 * W52a — /api/compliance/sectors vertical wiring tests.
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
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.name ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT sector_id')) {
        if (s.includes('WHERE sector_id = $1')) {
          const m = rows.find((r) => r.sector_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('sectors')) {
        const [code, name, description, status] = p;
        rows.push({
          sector_id: `s-${++id}`, code, name, description, status,
          created_at: new Date().toISOString(),
        });
        return { rows: [rows[rows.length - 1]], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('sectors')) {
        const idx = rows.findIndex((x) => x.sector_id === p[0]);
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
    sectorsDeps: {
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

test('GET /api/compliance/sectors empty', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sectors');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=active + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sectors', 'POST',
      { code: 'BANKING', name: 'Banking & Financial Services' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'active');
    const a = captured.find((e) => e.action === 'sector.create');
    assert.equal(a.after.code, 'BANKING');
  } finally { server.close(); }
});

test('POST without code/name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sectors', 'POST', { code: 'X' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sectors', 'POST',
      { code: 'X', name: 'Y', status: 'pending' });
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('search ILIKE narrows on name', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/sectors', 'POST', { code: 'B', name: 'Banking' });
    await fetchJson(port, '/api/compliance/sectors', 'POST', { code: 'T', name: 'Telecom' });
    const r = await fetchJson(port, '/api/compliance/sectors?search=bank');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/sectors', 'POST', { code: 'D', name: 'D' });
    const d1 = await fetchJson(port, `/api/compliance/sectors/${c.body.data.sectorId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port, `/api/compliance/sectors/${c.body.data.sectorId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/sectors', 'POST', { code: 'X', name: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
