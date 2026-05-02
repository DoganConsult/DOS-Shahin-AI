/**
 * W33 — /api/compliance/ai-suggestions vertical wiring tests.
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
    if (s.includes('AND suggestion_type =')) { out = out.filter((r) => r.suggestion_type === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, entity_type, entity_id, suggestion_type')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_ai_suggestions')) {
        const [tenant_id, entity_type, entity_id, suggestion_type, title, description, confidence, model_used] = p;
        const now = new Date().toISOString();
        const row = {
          id: `ai-${++id}`, tenant_id, entity_type, entity_id,
          suggestion_type, title, description, confidence, model_used,
          status: 'pending', reviewed_by: null, reviewed_at: null,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_ai_suggestions')) {
        const [tenant_id, id_, status, reviewed_by] = p;
        const row = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = status;
        row.reviewed_by = reviewed_by;
        row.reviewed_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();
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
    aiSuggestionsDeps: {
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

test('GET /api/compliance/ai-suggestions empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ai-suggestions');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST creates pending suggestion; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'control', suggestionType: 'classify', title: 'tag as PCI',
        confidence: 0.93, modelUsed: 'gpt-4' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'pending');
    assert.equal(c.body.data.confidence, 0.93);
    assert.equal(c.body.data.modelUsed, 'gpt-4');
    const one = await fetchJson(port, `/api/compliance/ai-suggestions/${c.body.data.id}`);
    assert.equal(one.status, 200);
  } finally { server.close(); }
});

test('POST without required fields → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', title: 't' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with confidence outside [0,1] → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 's', title: 't', confidence: 1.5 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filters: suggestionType + status narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 'classify', title: 't1' });
    await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 'classify', title: 't2' });
    await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 'remediate', title: 't3' });
    const cls = await fetchJson(port, '/api/compliance/ai-suggestions?suggestionType=classify');
    assert.equal(cls.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/ai-suggestions?suggestionType=classify&status=pending');
    assert.equal(both.body.meta.total, 2);
  } finally { server.close(); }
});

test('PATCH /review accepts; stamps reviewedBy + reviewedAt + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 's', title: 't' });
    const id = c.body.data.id;
    const r = await fetchJson(port, `/api/compliance/ai-suggestions/${id}/review`, 'PATCH',
      { status: 'accepted' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'accepted');
    assert.ok(r.body.data.reviewedBy);
    assert.ok(r.body.data.reviewedAt);
    const a = captured.find((e) => e.action === 'ai_suggestion.review');
    assert.ok(a);
    assert.equal(a.before.status, 'pending');
    assert.equal(a.after.status, 'accepted');
  } finally { server.close(); }
});

test('PATCH /review with invalid status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 's', title: 't' });
    const r = await fetchJson(port, `/api/compliance/ai-suggestions/${c.body.data.id}/review`, 'PATCH',
      { status: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('permission gate denies write without ai_suggestion.recommendation.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'ai_suggestion.recommendation.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/ai-suggestions');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/ai-suggestions', 'POST',
      { entityType: 'c', suggestionType: 's', title: 't' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /ai_suggestion\.recommendation\.write/);
  } finally { server.close(); }
});
