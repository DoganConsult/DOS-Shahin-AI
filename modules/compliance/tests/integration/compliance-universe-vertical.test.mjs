/**
 * W56 — /api/compliance/compliance-universe vertical wiring tests.
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
    if (s.includes('AND node_type =')) { out = out.filter((r) => r.node_type === p[i]); i++; }
    if (s.includes('AND parent_node_id =')) { out = out.filter((r) => r.parent_node_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.label ?? '').toLowerCase().includes(pat) || (r.node_code ?? '').toLowerCase().includes(pat));
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_universe_nodes')) {
        const [node_type, node_code, label, parent_node_id, attributes, status] = p;
        const now = new Date().toISOString();
        const row = {
          node_id: `un-${++id}`, node_type, node_code, label,
          parent_node_id, attributes: typeof attributes === 'string' ? JSON.parse(attributes) : attributes,
          status, created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_universe_nodes') && s.includes('SET status')) {
        const [nodeId, status] = p;
        const row = rows.find((x) => x.node_id === nodeId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status; row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('compliance_universe_nodes')) {
        const idx = rows.findIndex((x) => x.node_id === p[0]);
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
    complianceUniverseDeps: {
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
    const r = await fetchJson(port, '/api/compliance/compliance-universe');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=active + attributes default + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework', nodeCode: 'ECC-2', label: 'NCA ECC v2' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'active');
    assert.deepEqual(r.body.data.attributes, {});
    const a = captured.find((e) => e.action === 'compliance_universe.create');
    assert.equal(a.after.nodeType, 'framework');
  } finally { server.close(); }
});

test('POST with attributes JSONB persists them', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'CTL-1', label: 'Control 1', attributes: { domain: 'identity', critical: true } });
    assert.equal(r.body.data.attributes.domain, 'identity');
    assert.equal(r.body.data.attributes.critical, true);
  } finally { server.close(); }
});

test('POST without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bad nodeType → bad_node_type', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'galaxy', nodeCode: 'X', label: 'X' });
    assert.equal(r.body.error.code, 'bad_node_type');
  } finally { server.close(); }
});

test('PATCH status deprecates the node', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'CTL-X', label: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/compliance-universe/${c.body.data.nodeId}/status`,
      'PATCH', { status: 'deprecated' });
    assert.equal(r.body.data.status, 'deprecated');
  } finally { server.close(); }
});

test('PATCH bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework', nodeCode: 'X', label: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/compliance-universe/${c.body.data.nodeId}/status`,
      'PATCH', { status: 'wat' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filter by nodeType narrows', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework', nodeCode: 'A', label: 'A' });
    await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'B', label: 'B' });
    await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'C', label: 'C' });
    const r = await fetchJson(port,
      '/api/compliance/compliance-universe?nodeType=control');
    assert.equal(r.body.meta.total, 2);
  } finally { server.close(); }
});

test('search ILIKE narrows on label or code', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework', nodeCode: 'PDPL', label: 'KSA Privacy Law' });
    await fetchJson(port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'framework', nodeCode: 'NCA-ECC', label: 'KSA ECC v2' });
    const r1 = await fetchJson(port, '/api/compliance/compliance-universe?search=privacy');
    assert.equal(r1.body.meta.total, 1);
    const r2 = await fetchJson(port, '/api/compliance/compliance-universe?search=NCA');
    assert.equal(r2.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404 + permission gate denies write', async () => {
  const { app: app1 } = buildApp();
  const l1 = await listen(app1);
  try {
    const c = await fetchJson(l1.port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'X', label: 'X' });
    const d1 = await fetchJson(l1.port,
      `/api/compliance/compliance-universe/${c.body.data.nodeId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(l1.port,
      `/api/compliance/compliance-universe/${c.body.data.nodeId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { l1.server.close(); }
  const { app: app2 } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const l2 = await listen(app2);
  try {
    const r = await fetchJson(l2.port, '/api/compliance/compliance-universe', 'POST',
      { nodeType: 'control', nodeCode: 'X', label: 'X' });
    assert.equal(r.status, 403);
  } finally { l2.server.close(); }
});
