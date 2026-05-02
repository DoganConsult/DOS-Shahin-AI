/**
 * W51 — /api/compliance/instrument-structure vertical wiring tests.
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
    if (s.includes('AND instrument_code =')) { out = out.filter((r) => r.instrument_code === p[i]); i++; }
    if (s.includes('AND node_type =')) { out = out.filter((r) => r.node_type === p[i]); i++; }
    if (s.includes('AND parent_node_id =')) { out = out.filter((r) => r.parent_node_id === p[i]); i++; }
    if (s.includes('AND language =')) { out = out.filter((r) => r.language === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.label ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT node_id')) {
        if (s.includes('WHERE node_id = $1')) {
          const m = rows.find((r) => r.node_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('instrument_structure')) {
        const [instrument_code, node_type, parent_node_id, label, ordinal, body, language] = p;
        const row = {
          node_id: `n-${++id}`, instrument_code, node_type, parent_node_id,
          label, ordinal, body, language,
          created_at: new Date().toISOString(),
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('instrument_structure')) {
        const idx = rows.findIndex((x) => x.node_id === p[0]);
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
    instrumentStructureDeps: {
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

test('GET /api/compliance/instrument-structure empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST root instrument creates with language=en + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'instrument', label: 'Personal Data Protection Law' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.language, 'en');
    assert.equal(r.body.data.parentNodeId, null);
    const a = captured.find((e) => e.action === 'instrument_node.create');
    assert.ok(a);
    assert.equal(a.after.instrumentCode, 'PDPL');
  } finally { server.close(); }
});

test('POST chapter without parent → 400 bad_parent', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'chapter', label: 'Chapter 1' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_parent');
  } finally { server.close(); }
});

test('POST instrument WITH parent → 400 bad_parent', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const root = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'instrument', label: 'Root' });
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'X', nodeType: 'instrument', label: 'Bad', parentNodeId: root.body.data.nodeId });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_parent');
  } finally { server.close(); }
});

test('POST bad node_type → 400 bad_node_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'X', nodeType: 'preamble', label: 'Bad' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_node_type');
  } finally { server.close(); }
});

test('POST without instrumentCode/label → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { nodeType: 'instrument' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filter by instrumentCode + nodeType narrows clauses', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const root = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'ECC2', nodeType: 'instrument', label: 'NCA ECC-2' });
    const ch = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'ECC2', nodeType: 'chapter', label: 'Cybersecurity Governance', parentNodeId: root.body.data.nodeId });
    const art = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'ECC2', nodeType: 'article', label: 'Article 1-1', parentNodeId: ch.body.data.nodeId });
    await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'ECC2', nodeType: 'clause', label: '1-1-1', parentNodeId: art.body.data.nodeId });
    await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'ECC2', nodeType: 'clause', label: '1-1-2', parentNodeId: art.body.data.nodeId });
    const r = await fetchJson(port,
      '/api/compliance/instrument-structure?instrumentCode=ECC2&nodeType=clause');
    assert.equal(r.body.meta.total, 2);
  } finally { server.close(); }
});

test('list filter by parentNodeId returns immediate children', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const root = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'instrument', label: 'PDPL' });
    await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'chapter', label: 'Ch1', parentNodeId: root.body.data.nodeId });
    await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'PDPL', nodeType: 'chapter', label: 'Ch2', parentNodeId: root.body.data.nodeId });
    const r = await fetchJson(port,
      `/api/compliance/instrument-structure?parentNodeId=${root.body.data.nodeId}`);
    assert.equal(r.body.meta.total, 2);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'X', nodeType: 'instrument', label: 'TBD' });
    const d1 = await fetchJson(port,
      `/api/compliance/instrument-structure/${c.body.data.nodeId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/instrument-structure/${c.body.data.nodeId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/instrument-structure', 'POST',
      { instrumentCode: 'X', nodeType: 'instrument', label: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
