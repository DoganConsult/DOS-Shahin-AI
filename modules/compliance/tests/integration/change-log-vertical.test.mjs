/**
 * W30 — /api/compliance/change-log vertical wiring tests.
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
    if (s.includes('AND field_name =')) { out = out.filter((r) => r.field_name === p[i]); i++; }
    if (s.includes('AND changed_by =')) { out = out.filter((r) => r.changed_by === p[i]); i++; }
    if (s.includes('AND correlation_id =')) { out = out.filter((r) => r.correlation_id === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_id, entity_type, field_name')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_change_log')) {
        const [tenant_id, entity_id, entity_type, field_name, old_value, new_value, changed_by, correlation_id] = p;
        const now = new Date().toISOString();
        const row = {
          id: `chg-${++id}`, tenant_id, entity_id, entity_type, field_name,
          old_value, new_value, changed_by,
          changed_at: now, correlation_id,
          created_at: now, updated_at: now,
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
  const client = makeClient();
  registerCompliance({
    app,
    changeLogDeps: {
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

test('GET /api/compliance/change-log empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/change-log');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST records a change; GET reads it back; audit fired', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'control', entityId: 'ctl-1', fieldName: 'status', oldValue: 'draft', newValue: 'active' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.fieldName, 'status');
    assert.equal(c.body.data.oldValue, 'draft');
    assert.equal(c.body.data.newValue, 'active');
    const a = captured.find((e) => e.action === 'change_log.record');
    assert.ok(a);
    assert.equal(a.after.id, c.body.data.id);
    const one = await fetchJson(port, `/api/compliance/change-log/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'c', entityId: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with optional null oldValue/newValue accepted', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'control', entityId: 'ctl-1', fieldName: 'name' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.oldValue, null);
    assert.equal(c.body.data.newValue, null);
  } finally { server.close(); }
});

test('list filters: entityType + entityId narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'control', entityId: 'A', fieldName: 'status', newValue: 'a' });
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'control', entityId: 'B', fieldName: 'status', newValue: 'a' });
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'requirement', entityId: 'A', fieldName: 'status', newValue: 'a' });
    const ct = await fetchJson(port, '/api/compliance/change-log?entityType=control');
    assert.equal(ct.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/change-log?entityType=control&entityId=A');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('list filters: fieldName + correlationId narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'c', entityId: 'x', fieldName: 'status', correlationId: 'cor-1' });
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'c', entityId: 'x', fieldName: 'name', correlationId: 'cor-1' });
    await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'c', entityId: 'x', fieldName: 'status', correlationId: 'cor-2' });
    const fn = await fetchJson(port, '/api/compliance/change-log?fieldName=status');
    assert.equal(fn.body.meta.total, 2);
    const cor = await fetchJson(port, '/api/compliance/change-log?correlationId=cor-1');
    assert.equal(cor.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/change-log?fieldName=status&correlationId=cor-1');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('GET /:id missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/change-log/missing');
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without change_log.entry.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'change_log.entry.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/change-log');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/change-log', 'POST',
      { entityType: 'c', entityId: 'x', fieldName: 'f' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /change_log\.entry\.write/);
  } finally { server.close(); }
});
