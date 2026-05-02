/**
 * W50 — /api/compliance/workspaces vertical wiring tests.
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
    if (s.includes('AND parent_workspace_id =')) { out = out.filter((r) => r.parent_workspace_id === p[i]); i++; }
    if (s.includes('AND owner_user_id =')) { out = out.filter((r) => r.owner_user_id === p[i]); i++; }
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
      if (s.startsWith('SELECT workspace_id')) {
        if (s.includes('WHERE workspace_id = $1')) {
          const m = rows.find((r) => r.workspace_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('workspaces')) {
        const [code, name, description, status, parent_workspace_id, owner_user_id] = p;
        const now = new Date().toISOString();
        const row = {
          workspace_id: `ws-${++id}`, code, name, description, status,
          parent_workspace_id, owner_user_id,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('workspaces') && s.includes('SET status')) {
        const [workspaceId, status] = p;
        const row = rows.find((x) => x.workspace_id === workspaceId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('workspaces')) {
        const idx = rows.findIndex((x) => x.workspace_id === p[0]);
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
    workspacesDeps: {
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

test('GET /api/compliance/workspaces empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/workspaces');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates with status=active + ownerUserId=actor + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'KSA-HQ', name: 'KSA Headquarters' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'active');
    assert.equal(r.body.data.ownerUserId, 'u1');
    assert.equal(r.body.data.code, 'KSA-HQ');
    const a = captured.find((e) => e.action === 'workspace.create');
    assert.ok(a);
    assert.equal(a.after.code, 'KSA-HQ');
  } finally { server.close(); }
});

test('POST without code/name → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/workspaces', 'POST', { code: 'X' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'C', name: 'N', status: 'parked' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH /:id/status archived; bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'K1', name: 'WS-1' });
    const r = await fetchJson(port,
      `/api/compliance/workspaces/${c.body.data.workspaceId}/status`,
      'PATCH', { status: 'archived' });
    assert.equal(r.body.data.status, 'archived');
    const bad = await fetchJson(port,
      `/api/compliance/workspaces/${c.body.data.workspaceId}/status`,
      'PATCH', { status: 'bogus' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filter narrows by parentWorkspaceId (hierarchy lookup)', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const root = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'GROUP', name: 'Group' });
    await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'KSA', name: 'KSA Region', parentWorkspaceId: root.body.data.workspaceId });
    await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'UAE', name: 'UAE Region', parentWorkspaceId: root.body.data.workspaceId });
    await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'OTHER', name: 'Other' });
    const r = await fetchJson(port,
      `/api/compliance/workspaces?parentWorkspaceId=${root.body.data.workspaceId}`);
    assert.equal(r.body.meta.total, 2);
  } finally { server.close(); }
});

test('search ILIKE narrows on name', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'A', name: 'Riyadh Office' });
    await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'B', name: 'Dubai Office' });
    const r = await fetchJson(port, '/api/compliance/workspaces?search=riyadh');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'D', name: 'ToDelete' });
    const d1 = await fetchJson(port,
      `/api/compliance/workspaces/${c.body.data.workspaceId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/workspaces/${c.body.data.workspaceId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/workspaces', 'POST',
      { code: 'P', name: 'Perm' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
