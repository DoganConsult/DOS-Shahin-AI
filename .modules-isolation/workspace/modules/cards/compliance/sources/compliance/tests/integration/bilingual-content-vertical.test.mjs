/**
 * W55 — /api/compliance/bilingual-content vertical wiring tests.
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
    if (s.includes('AND entity_type =')) { out = out.filter((r) => r.entity_type === p[i]); i++; }
    if (s.includes('AND entity_id =')) { out = out.filter((r) => r.entity_id === p[i]); i++; }
    if (s.includes('AND field_key =')) { out = out.filter((r) => r.field_key === p[i]); i++; }
    if (s.includes('AND language =')) { out = out.filter((r) => r.language === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT content_id')) {
        if (s.includes('WHERE content_id = $1')) {
          const m = rows.find((r) => r.content_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('bilingual_content')) {
        const [entity_type, entity_id, field_key, language, content, status, translator_id] = p;
        const now = new Date().toISOString();
        const row = {
          content_id: `bc-${++id}`, entity_type, entity_id, field_key, language, content, status,
          translator_id, approved_by: null, approved_at: null,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('bilingual_content') && s.includes('SET status')) {
        const [contentId, status, stamp, actorId] = p;
        const row = rows.find((x) => x.content_id === contentId);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        if (stamp) {
          row.approved_by = actorId;
          row.approved_at = new Date().toISOString();
        }
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('bilingual_content')) {
        const idx = rows.findIndex((x) => x.content_id === p[0]);
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
    bilingualContentDeps: {
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
    const r = await fetchJson(port, '/api/compliance/bilingual-content');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates with status=draft + translatorId + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp({ ctx: { userId: 'translator-1' } });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-1', fieldKey: 'title', language: 'ar', content: 'الضابط' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'draft');
    assert.equal(r.body.data.translatorId, 'translator-1');
    assert.equal(r.body.data.approvedBy, null);
    const a = captured.find((e) => e.action === 'bilingual_content.create');
    assert.equal(a.after.language, 'ar');
  } finally { server.close(); }
});

test('POST without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-1', fieldKey: 'title', language: 'ar' });
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bad language → bad_language', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'X', entityId: 'X', fieldKey: 'X', language: 'fr', content: 'X' });
    assert.equal(r.body.error.code, 'bad_language');
  } finally { server.close(); }
});

test('POST bad status → bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'X', entityId: 'X', fieldKey: 'X', language: 'en', content: 'X', status: 'wat' });
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('PATCH approved auto-stamps approvedBy+approvedAt', async () => {
  const { app } = buildApp({ ctx: { userId: 'reviewer-2' } });
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-2', fieldKey: 'title', language: 'ar', content: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/bilingual-content/${c.body.data.contentId}/status`,
      'PATCH', { status: 'approved' });
    assert.equal(r.body.data.status, 'approved');
    assert.equal(r.body.data.approvedBy, 'reviewer-2');
    assert.notEqual(r.body.data.approvedAt, null);
  } finally { server.close(); }
});

test('PATCH bad status → 400', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'X', entityId: 'X', fieldKey: 'X', language: 'en', content: 'X' });
    const r = await fetchJson(port,
      `/api/compliance/bilingual-content/${c.body.data.contentId}/status`,
      'PATCH', { status: 'pending' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filter by entityId+language narrows', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-A', fieldKey: 'title', language: 'ar', content: 'X' });
    await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-A', fieldKey: 'title', language: 'en', content: 'Y' });
    await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'control', entityId: 'CTL-B', fieldKey: 'title', language: 'ar', content: 'Z' });
    const r = await fetchJson(port,
      '/api/compliance/bilingual-content?entityId=CTL-A&language=ar');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE then 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'X', entityId: 'X', fieldKey: 'X', language: 'en', content: 'X' });
    const d1 = await fetchJson(port,
      `/api/compliance/bilingual-content/${c.body.data.contentId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/bilingual-content/${c.body.data.contentId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/bilingual-content', 'POST',
      { entityType: 'X', entityId: 'X', fieldKey: 'X', language: 'en', content: 'X' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
