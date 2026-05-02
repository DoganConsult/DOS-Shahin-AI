/**
 * W49 — /api/compliance/evidence-files vertical wiring tests.
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
    if (s.includes('AND control_id =')) { out = out.filter((r) => r.control_id === p[i]); i++; }
    if (s.includes('AND requirement_id =')) { out = out.filter((r) => r.requirement_id === p[i]); i++; }
    if (s.includes('AND finding_id =')) { out = out.filter((r) => r.finding_id === p[i]); i++; }
    if (s.includes('AND content_hash =')) { out = out.filter((r) => r.content_hash === p[i]); i++; }
    if (s.includes('ILIKE')) {
      const pat = String(p[i]).replace(/%/g, '').toLowerCase();
      out = out.filter((r) => (r.filename ?? '').toLowerCase().includes(pat));
      i++;
    }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT file_id')) {
        if (s.includes('WHERE file_id = $1')) {
          const m = rows.find((r) => r.file_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('evidence_files')) {
        const [filename, mime_type, size_bytes, content_hash, storage_uri,
          control_id, requirement_id, finding_id, uploaded_by, retention_until] = p;
        const now = new Date().toISOString();
        const row = {
          file_id: `ef-${++id}`, filename, mime_type, size_bytes,
          content_hash, storage_uri, status: 'active',
          control_id, requirement_id, finding_id,
          uploaded_by, retention_until, created_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('evidence_files') && s.includes('SET status')) {
        const [fileId, status] = p;
        const row = rows.find((x) => x.file_id === fileId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('evidence_files')) {
        const idx = rows.findIndex((x) => x.file_id === p[0]);
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
    evidenceFilesDeps: {
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

const goodPayload = {
  filename: 'audit-log-2026.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  contentHash: 'sha256:abc',
  storageUri: 's3://bucket/audit-log-2026.pdf',
};

test('GET /api/compliance/evidence-files empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-files');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=active + uploaded_by=actor + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-files', 'POST', goodPayload);
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'active');
    assert.equal(r.body.data.uploadedBy, 'u1');
    assert.equal(r.body.data.contentHash, 'sha256:abc');
    const a = captured.find((e) => e.action === 'evidence_file.create');
    assert.ok(a);
    assert.equal(a.after.contentHash, 'sha256:abc');
  } finally { server.close(); }
});

test('POST without required → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { filename: 'x.pdf' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST negative sizeBytes → 400 bad_size', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { ...goodPayload, sizeBytes: -1 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_size');
  } finally { server.close(); }
});

test('PATCH /:id/status quarantined + audit; bad_status 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/evidence-files', 'POST', goodPayload);
    const r = await fetchJson(port,
      `/api/compliance/evidence-files/${c.body.data.fileId}/status`,
      'PATCH', { status: 'quarantined' });
    assert.equal(r.body.data.status, 'quarantined');
    const bad = await fetchJson(port,
      `/api/compliance/evidence-files/${c.body.data.fileId}/status`,
      'PATCH', { status: 'bogus' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters narrow by contentHash + controlId (dedup lookup)', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { ...goodPayload, contentHash: 'sha256:1', controlId: 'c-1' });
    await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { ...goodPayload, contentHash: 'sha256:2', controlId: 'c-2' });
    const r = await fetchJson(port,
      '/api/compliance/evidence-files?contentHash=sha256:2&controlId=c-2');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('search ILIKE narrows on filename', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { ...goodPayload, filename: 'NCA-attestation.pdf', contentHash: 'h1' });
    await fetchJson(port, '/api/compliance/evidence-files', 'POST',
      { ...goodPayload, filename: 'SAMA-report.pdf', contentHash: 'h2' });
    const r = await fetchJson(port, '/api/compliance/evidence-files?search=nca');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/evidence-files', 'POST', goodPayload);
    const d1 = await fetchJson(port,
      `/api/compliance/evidence-files/${c.body.data.fileId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/evidence-files/${c.body.data.fileId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write when only read granted', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/evidence-files', 'POST', goodPayload);
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
