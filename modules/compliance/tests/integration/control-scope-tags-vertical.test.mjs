/**
 * W37 — /api/compliance/control-scope-tags vertical wiring tests.
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
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND scope =')) { out = out.filter((r) => r.scope === p[i]); i++; }
    if (s.includes('AND in_scope =')) { out = out.filter((r) => r.in_scope === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT tag_id, control_id, scope')) {
        if (s.includes('WHERE tag_id = $1')) {
          const m = rows.find((r) => r.tag_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('control_scope_tags')) {
        const [control_id, scope, in_scope, notes] = p;
        const existing = rows.find((r) => r.control_id === control_id && r.scope === scope);
        const now = new Date().toISOString();
        if (existing) {
          existing.in_scope = in_scope;
          existing.notes = notes;
          existing.updated_at = now;
          return { rows: [existing], rowCount: 1 };
        }
        const row = {
          tag_id: `s-${++id}`, control_id, scope, in_scope, notes,
          signed_off_by: null, signed_off_at: null,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('control_scope_tags')) {
        const [tag_id, signed_off_by] = p;
        const row = rows.find((x) => x.tag_id === tag_id);
        if (!row) return { rows: [], rowCount: 0 };
        row.signed_off_by = signed_off_by;
        row.signed_off_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('control_scope_tags')) {
        const idx = rows.findIndex((x) => x.tag_id === p[0]);
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
    controlScopeTagsDeps: {
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

test('GET /api/compliance/control-scope-tags empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-scope-tags');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with default inScope=true', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.inScope, true);
    assert.equal(c.body.data.signedOffBy, null);
  } finally { server.close(); }
});

test('POST without required → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST same (controlId, scope) updates existing (upsert)', async () => {
  const { app, client } = buildApp();
  const { server, port } = await listen(app);
  try {
    const a = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI', inScope: true });
    const b = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI', inScope: false, notes: 'descoped' });
    assert.equal(a.body.data.tagId, b.body.data.tagId);
    assert.equal(b.body.data.inScope, false);
    assert.equal(client._rows.length, 1);
  } finally { server.close(); }
});

test('list filters: controlId + inScope narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI', inScope: true });
    await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'SOX', inScope: false });
    await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-2', scope: 'PCI', inScope: true });
    const ac1 = await fetchJson(port, '/api/compliance/control-scope-tags?controlId=AC-1');
    assert.equal(ac1.body.meta.total, 2);
    const inScope = await fetchJson(port, '/api/compliance/control-scope-tags?inScope=true');
    assert.equal(inScope.body.meta.total, 2);
  } finally { server.close(); }
});

test('PATCH /sign-off stamps signedOffBy + signedOffAt + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI' });
    const r = await fetchJson(port, `/api/compliance/control-scope-tags/${c.body.data.tagId}/sign-off`,
      'PATCH', {});
    assert.equal(r.status, 200);
    assert.equal(r.body.data.signedOffBy, 'u1');
    assert.ok(r.body.data.signedOffAt);
    const a = captured.find((e) => e.action === 'control_scope_tag.sign-off');
    assert.ok(a);
    assert.equal(a.before.signedOffBy, null);
    assert.equal(a.after.signedOffBy, 'u1');
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI' });
    const d1 = await fetchJson(port, `/api/compliance/control-scope-tags/${c.body.data.tagId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port, `/api/compliance/control-scope-tags/${c.body.data.tagId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without control_scope_tag.scope.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'control_scope_tag.scope.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/control-scope-tags');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/control-scope-tags', 'POST',
      { controlId: 'AC-1', scope: 'PCI' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /control_scope_tag\.scope\.write/);
  } finally { server.close(); }
});
