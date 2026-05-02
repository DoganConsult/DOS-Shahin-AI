/**
 * W45 — /api/compliance/crosswalk-mappings vertical wiring tests.
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
    if (s.includes('AND source_control_id =')) { out = out.filter((r) => r.source_control_id === p[i]); i++; }
    if (s.includes('AND target_requirement_id =')) { out = out.filter((r) => r.target_requirement_id === p[i]); i++; }
    if (s.includes('AND relationship =')) { out = out.filter((r) => r.relationship === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT mapping_id, source_control_id')) {
        if (s.includes('WHERE mapping_id = $1')) {
          const m = rows.find((r) => r.mapping_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('crosswalk_mappings')) {
        const [source_control_id, target_requirement_id, relationship, confidence] = p;
        const now = new Date().toISOString();
        const row = {
          mapping_id: `m-${++id}`,
          source_control_id, target_requirement_id,
          relationship, confidence, created_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('crosswalk_mappings')) {
        const idx = rows.findIndex((x) => x.mapping_id === p[0]);
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
    crosswalkMappingsDeps: {
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

test('GET /api/compliance/crosswalk-mappings empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates with defaults relationship=related, confidence=1.0', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'ctl-1', targetRequirementId: 'req-1' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.relationship, 'related');
    assert.equal(r.body.data.confidence, 1);
    const a = captured.find((e) => e.action === 'crosswalk_mapping.create');
    assert.ok(a);
    assert.equal(a.after.sourceControlId, 'ctl-1');
  } finally { server.close(); }
});

test('POST without required → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST bogus relationship → 400 bad_relationship', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'c', targetRequirementId: 'r', relationship: 'bogus' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_relationship');
  } finally { server.close(); }
});

test('POST confidence>1 → 400 bad_confidence', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'c', targetRequirementId: 'r', confidence: 1.5 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_confidence');
  } finally { server.close(); }
});

test('GET /:id returns single; 404 unknown', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'ctl-x', targetRequirementId: 'req-x', relationship: 'equivalent' });
    const r = await fetchJson(port,
      `/api/compliance/crosswalk-mappings/${c.body.data.mappingId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.relationship, 'equivalent');
    const nf = await fetchJson(port, '/api/compliance/crosswalk-mappings/nope');
    assert.equal(nf.status, 404);
  } finally { server.close(); }
});

test('list filters narrow by sourceControlId + relationship', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'a', targetRequirementId: 'r1', relationship: 'partial' });
    await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'b', targetRequirementId: 'r2', relationship: 'equivalent' });
    await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'a', targetRequirementId: 'r3', relationship: 'equivalent' });
    const r = await fetchJson(port,
      '/api/compliance/crosswalk-mappings?sourceControlId=a&relationship=equivalent');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('DELETE removes; 2nd → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'd-src', targetRequirementId: 'd-req' });
    const d1 = await fetchJson(port,
      `/api/compliance/crosswalk-mappings/${c.body.data.mappingId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/crosswalk-mappings/${c.body.data.mappingId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k.endsWith('.read') });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/crosswalk-mappings', 'POST',
      { sourceControlId: 'x', targetRequirementId: 'y' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
