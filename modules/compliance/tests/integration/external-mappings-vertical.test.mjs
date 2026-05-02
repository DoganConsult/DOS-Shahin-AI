/**
 * W31 — /api/compliance/external-mappings vertical wiring tests.
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
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND entity_id =')) { out = out.filter((r) => r.entity_id === p[i]); i++; }
    if (s.includes('AND external_system =')) { out = out.filter((r) => r.external_system === p[i]); i++; }
    if (s.includes('AND sync_status =')) { out = out.filter((r) => r.sync_status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_type, entity_id, external_system')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_external_mappings')) {
        const [tenant_id, entity_type, entity_id, external_system, external_id, sync_status, mapping_config] = p;
        const now = new Date().toISOString();
        const row = {
          id: `em-${++id}`, tenant_id, entity_type, entity_id,
          external_system, external_id, sync_status,
          last_synced_at: null,
          mapping_config: typeof mapping_config === 'string' ? JSON.parse(mapping_config) : mapping_config,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_external_mappings')) {
        const [tenant_id, id_, sync_status] = p;
        const row = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!row) return { rows: [], rowCount: 0 };
        row.sync_status = sync_status;
        row.last_synced_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('compliance_external_mappings')) {
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
    externalMappingsDeps: {
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

test('GET /api/compliance/external-mappings empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/external-mappings');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates default synced mapping; GET reads it back', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'control', entityId: 'ctl-1', externalSystem: 'ServiceNow', externalId: 'SN-001' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.syncStatus, 'synced');
    assert.equal(c.body.data.lastSyncedAt, null);
    assert.deepEqual(c.body.data.mappingConfig, {});
    const one = await fetchJson(port, `/api/compliance/external-mappings/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'x', externalSystem: 'sys' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with invalid syncStatus → 400 bad_sync_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'x', externalSystem: 's', externalId: 'e', syncStatus: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_sync_status');
  } finally { server.close(); }
});

test('list filters: externalSystem + syncStatus narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'A', externalSystem: 'SN', externalId: '1', syncStatus: 'synced' });
    await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'B', externalSystem: 'SN', externalId: '2', syncStatus: 'error' });
    await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'C', externalSystem: 'JIRA', externalId: '3', syncStatus: 'synced' });
    const sn = await fetchJson(port, '/api/compliance/external-mappings?externalSystem=SN');
    assert.equal(sn.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/external-mappings?externalSystem=SN&syncStatus=error');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /sync stamps last_synced_at + writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'x', externalSystem: 'sys', externalId: 'eid', syncStatus: 'pending' });
    const id = c.body.data.id;
    const s = await fetchJson(port, `/api/compliance/external-mappings/${id}/sync`, 'PATCH',
      { syncStatus: 'synced' });
    assert.equal(s.status, 200);
    assert.equal(s.body.data.syncStatus, 'synced');
    assert.ok(s.body.data.lastSyncedAt);
    const a = captured.find((e) => e.action === 'external_mapping.sync');
    assert.ok(a);
    assert.equal(a.before.syncStatus, 'pending');
    assert.equal(a.after.syncStatus, 'synced');
  } finally { server.close(); }
});

test('PATCH /sync on missing → 404; DELETE missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const s = await fetchJson(port, '/api/compliance/external-mappings/missing/sync', 'PATCH', { syncStatus: 'synced' });
    assert.equal(s.status, 404);
    const d = await fetchJson(port, '/api/compliance/external-mappings/missing', 'DELETE');
    assert.equal(d.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without external_mapping.link.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'external_mapping.link.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/external-mappings');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/external-mappings', 'POST',
      { entityType: 'c', entityId: 'x', externalSystem: 's', externalId: 'e' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /external_mapping\.link\.write/);
  } finally { server.close(); }
});
