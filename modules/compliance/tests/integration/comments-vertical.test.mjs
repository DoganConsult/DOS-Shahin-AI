/**
 * W28 — /api/compliance/comments vertical wiring tests.
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
    if (s.includes('AND author_id =')) { out = out.filter((r) => r.author_id === p[i]); i++; }
    if (s.includes('AND is_resolved =')) { out = out.filter((r) => r.is_resolved === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_type, entity_id, parent_id, content')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_comments')) {
        const [tenant_id, entity_type, entity_id, parent_id,
               content, author_id, is_internal] = p;
        const now = new Date().toISOString();
        const row = {
          id: `cmt-${++id}`, tenant_id, entity_type, entity_id, parent_id,
          content, author_id, is_internal, is_resolved: false,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_comments')) {
        const [tenant_id, id_, isResolved] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.is_resolved = isResolved;
        r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
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
    commentsDeps: {
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

test('GET /api/compliance/comments empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/comments');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates comment with defaults; GET reads it back', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'control', entityId: 'ctl-1', content: 'looks good' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.content, 'looks good');
    assert.equal(c.body.data.isInternal, false);
    assert.equal(c.body.data.isResolved, false);
    const one = await fetchJson(port, `/api/compliance/comments/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'control', entityId: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with parentId creates threaded reply', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const root = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'x', content: 'root' });
    const reply = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'x', content: 'reply', parentId: root.body.data.id });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.data.parentId, root.body.data.id);
  } finally { server.close(); }
});

test('list filters: entityId + isResolved narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'A', content: 'a' });
    await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'A', content: 'b' });
    await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'B', content: 'c' });
    await fetchJson(port, `/api/compliance/comments/${a.body.data.id}/resolve`, 'PATCH',
      { isResolved: true });
    const onA = await fetchJson(port, '/api/compliance/comments?entityId=A');
    assert.equal(onA.body.meta.total, 2);
    const resolved = await fetchJson(port, '/api/compliance/comments?isResolved=true');
    assert.equal(resolved.body.meta.total, 1);
    const both = await fetchJson(port, '/api/compliance/comments?entityId=A&isResolved=false');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/resolve toggles is_resolved + writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'x', content: 'q?' });
    const u = await fetchJson(port, `/api/compliance/comments/${c.body.data.id}/resolve`, 'PATCH',
      { isResolved: true });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.isResolved, true);
    const a = captured.find((e) => e.action === 'comment.resolve');
    assert.ok(a);
    assert.equal(a.before.isResolved, false);
    assert.equal(a.after.isResolved, true);
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/comments/missing/resolve', 'PATCH',
      { isResolved: true });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without comment.thread.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'comment.thread.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/comments');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/comments', 'POST',
      { entityType: 'c', entityId: 'x', content: 'hi' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /comment\.thread\.write/);
  } finally { server.close(); }
});
