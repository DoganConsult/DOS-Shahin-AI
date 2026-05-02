/**
 * W27 — /api/compliance/attachments vertical wiring tests.
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
    if (s.includes('AND uploaded_by =')) { out = out.filter((r) => r.uploaded_by === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_type, entity_id, file_name')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_attachments')) {
        const [tenant_id, entity_type, entity_id, file_name, file_type,
               file_size, storage_path, uploaded_by] = p;
        const now = new Date().toISOString();
        const row = {
          id: `att-${++id}`, tenant_id, entity_type, entity_id,
          file_name, file_type, file_size, storage_path,
          uploaded_by, uploaded_at: now,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('compliance_attachments')) {
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
    attachmentsDeps: {
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

test('GET /api/compliance/attachments empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attachments');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates attachment metadata; GET reads it back', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attachments', 'POST', {
      entityType: 'control', entityId: 'ctl-1',
      fileName: 'evidence.pdf', storagePath: 's3://bucket/ev1.pdf',
      fileType: 'application/pdf', fileSize: 12345,
    });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.fileName, 'evidence.pdf');
    assert.equal(c.body.data.fileSize, 12345);
    const one = await fetchJson(port, `/api/compliance/attachments/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'control', entityId: 'x', fileName: 'a.txt' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with negative fileSize → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attachments', 'POST', {
      entityType: 'c', entityId: 'x', fileName: 'a', storagePath: 's3://x',
      fileSize: -1,
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filters: entityType + entityId narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'control', entityId: 'A', fileName: 'a', storagePath: 's3://a' });
    await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'control', entityId: 'B', fileName: 'b', storagePath: 's3://b' });
    await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'requirement', entityId: 'A', fileName: 'c', storagePath: 's3://c' });
    const ct = await fetchJson(port, '/api/compliance/attachments?entityType=control');
    assert.equal(ct.body.meta.total, 2);
    const onA = await fetchJson(port, '/api/compliance/attachments?entityId=A');
    assert.equal(onA.body.meta.total, 2);
    const both = await fetchJson(port,
      '/api/compliance/attachments?entityType=control&entityId=A');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE /:id removes row + writes audit before; second delete → 404', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'c', entityId: 'x', fileName: 'a', storagePath: 's3://a' });
    const id = c.body.data.id;
    const d = await fetchJson(port, `/api/compliance/attachments/${id}`, 'DELETE');
    assert.equal(d.status, 200);
    const a = captured.find((e) => e.action === 'attachment.delete');
    assert.ok(a);
    assert.equal(a.before.id, id);
    const miss = await fetchJson(port, `/api/compliance/attachments/${id}`, 'DELETE');
    assert.equal(miss.status, 404);
  } finally { server.close(); }
});

test('GET /:id missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/attachments/missing');
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without attachment.file.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'attachment.file.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/attachments');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/attachments', 'POST',
      { entityType: 'c', entityId: 'x', fileName: 'a', storagePath: 's3://a' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /attachment\.file\.write/);
  } finally { server.close(); }
});
