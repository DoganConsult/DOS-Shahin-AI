/**
 * W23 — /api/compliance/programs vertical wiring tests.
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
    if (s.includes('AND program_type =')) { out = out.filter((r) => r.program_type === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND owner_id =')) { out = out.filter((r) => r.owner_id === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, name, description, program_type')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_programs')) {
        const [tenant_id, name, description, program_type, status,
               owner_id, start_date, end_date, budget] = p;
        const now = new Date().toISOString();
        const row = {
          id: `pg-${++id}`, tenant_id, name, description, program_type, status,
          owner_id, start_date, end_date, budget,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_programs')) {
        const [tenant_id, id_, status] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = status;
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
    programsDeps: {
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

test('GET /api/compliance/programs empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/programs');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates program with default status active; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'PDPL Program', programType: 'regulatory', budget: 250000 });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'active');
    assert.equal(c.body.data.name, 'PDPL Program');
    assert.equal(c.body.data.budget, 250000);
    const one = await fetchJson(port, `/api/compliance/programs/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without name/programType → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/programs', 'POST', { description: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with negative budget → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'p', programType: 'regulatory', budget: -100 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('list filters: programType + status narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'A', programType: 'regulatory', status: 'active' });
    await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'B', programType: 'regulatory', status: 'paused' });
    await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'C', programType: 'internal', status: 'active' });
    const reg = await fetchJson(port, '/api/compliance/programs?programType=regulatory');
    assert.equal(reg.body.meta.total, 2);
    const act = await fetchJson(port, '/api/compliance/programs?status=active');
    assert.equal(act.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/programs?programType=regulatory&status=active');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status transitions and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'p', programType: 'regulatory' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/programs/${id}/status`, 'PATCH',
      { status: 'completed' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'completed');
    const a = captured.find((e) => e.action === 'program.status_change');
    assert.ok(a);
    assert.equal(a.before.status, 'active');
    assert.equal(a.after.status, 'completed');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/programs/missing/status', 'PATCH',
      { status: 'paused' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without program.record.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'program.record.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/programs');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/programs', 'POST',
      { name: 'p', programType: 'regulatory' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /program\.record\.write/);
  } finally { server.close(); }
});
