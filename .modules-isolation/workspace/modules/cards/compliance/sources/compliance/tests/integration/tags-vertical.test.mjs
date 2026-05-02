/**
 * W29 — /api/compliance/tags vertical wiring tests.
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
    if (s.includes('AND tag_key =')) { out = out.filter((r) => r.tag_key === p[i]); i++; }
    if (s.includes('AND tag_value =')) { out = out.filter((r) => r.tag_value === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_type, entity_id, tag_key, tag_value')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_tags')) {
        const [tenant_id, entity_type, entity_id, tag_key, tag_value, created_by] = p;
        const now = new Date().toISOString();
        const row = {
          id: `tag-${++id}`, tenant_id, entity_type, entity_id,
          tag_key, tag_value, created_by,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('compliance_tags')) {
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
    tagsDeps: {
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

test('GET /api/compliance/tags empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/tags');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates tag; GET reads it back', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'control', entityId: 'ctl-1', tagKey: 'severity', tagValue: 'high' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.tagKey, 'severity');
    assert.equal(c.body.data.tagValue, 'high');
    const one = await fetchJson(port, `/api/compliance/tags/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'x', tagKey: 'k' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filters: tagKey + tagValue narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'A', tagKey: 'env', tagValue: 'prod' });
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'B', tagKey: 'env', tagValue: 'dev' });
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'C', tagKey: 'team', tagValue: 'sec' });
    const env = await fetchJson(port, '/api/compliance/tags?tagKey=env');
    assert.equal(env.body.meta.total, 2);
    const prod = await fetchJson(port, '/api/compliance/tags?tagValue=prod');
    assert.equal(prod.body.meta.total, 1);
    const both = await fetchJson(port, '/api/compliance/tags?tagKey=env&tagValue=prod');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('list filters: entityType + entityId narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'control', entityId: 'A', tagKey: 'k', tagValue: 'v' });
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'control', entityId: 'B', tagKey: 'k', tagValue: 'v' });
    await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'requirement', entityId: 'A', tagKey: 'k', tagValue: 'v' });
    const ct = await fetchJson(port, '/api/compliance/tags?entityType=control');
    assert.equal(ct.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/tags?entityType=control&entityId=A');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE /:id removes row + writes audit before; second delete → 404', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'x', tagKey: 'k', tagValue: 'v' });
    const id = c.body.data.id;
    const d = await fetchJson(port, `/api/compliance/tags/${id}`, 'DELETE');
    assert.equal(d.status, 200);
    const a = captured.find((e) => e.action === 'tag.delete');
    assert.ok(a);
    assert.equal(a.before.id, id);
    const miss = await fetchJson(port, `/api/compliance/tags/${id}`, 'DELETE');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('GET /:id missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/tags/missing');
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without tag.label.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'tag.label.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/tags');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/tags', 'POST',
      { entityType: 'c', entityId: 'x', tagKey: 'k', tagValue: 'v' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /tag\.label\.write/);
  } finally { server.close(); }
});
