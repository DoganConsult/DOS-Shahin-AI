/**
 * W21 — /api/compliance/roadmap vertical wiring tests.
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
    if (s.includes('AND milestone_type =')) { out = out.filter((r) => r.milestone_type === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND owner_id =')) { out = out.filter((r) => r.owner_id === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, title, description, milestone_type')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_roadmap')) {
        const [tenant_id, title, description, milestone_type,
               target_date, status, depsJson, owner_id] = p;
        const now = new Date().toISOString();
        const row = {
          id: `rm-${++id}`, tenant_id, title, description, milestone_type,
          target_date, actual_date: null, status,
          dependencies: JSON.parse(depsJson),
          owner_id,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_roadmap')) {
        const [tenant_id, id_, status, actualDate] = p;
        const r = rows.find((x) => x.tenant_id === tenant_id && x.id === id_);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = status;
        if (status === 'completed') {
          r.actual_date = actualDate ?? new Date().toISOString().slice(0, 10);
        } else if (actualDate) {
          r.actual_date = actualDate;
        }
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
    roadmapDeps: {
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

test('GET /api/compliance/roadmap empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/roadmap');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates milestone with default status planned; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 'Phase 1', milestoneType: 'rollout', targetDate: '2026-06-30' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'planned');
    assert.equal(c.body.data.title, 'Phase 1');
    assert.deepEqual(c.body.data.dependencies, []);
    const one = await fetchJson(port, `/api/compliance/roadmap/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without title/milestoneType → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/roadmap', 'POST', { description: 'x' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 't', milestoneType: 'm', status: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters: milestoneType + status narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 'A', milestoneType: 'rollout', status: 'planned' });
    await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 'B', milestoneType: 'rollout', status: 'in_progress' });
    await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 'C', milestoneType: 'audit', status: 'planned' });
    const rollouts = await fetchJson(port, '/api/compliance/roadmap?milestoneType=rollout');
    assert.equal(rollouts.body.meta.total, 2);
    const planned = await fetchJson(port, '/api/compliance/roadmap?status=planned');
    assert.equal(planned.body.meta.total, 2);
    const both = await fetchJson(port, '/api/compliance/roadmap?milestoneType=rollout&status=planned');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status completed auto-stamps actual_date and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 't', milestoneType: 'm' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/roadmap/${id}/status`, 'PATCH',
      { status: 'completed' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'completed');
    assert.ok(u.body.data.actualDate);
    const a = captured.find((e) => e.action === 'roadmap.status_change');
    assert.ok(a);
    assert.equal(a.before.status, 'planned');
    assert.equal(a.after.status, 'completed');
    assert.equal(a.before.actualDate, null);
    assert.ok(a.after.actualDate);
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/roadmap/missing/status', 'PATCH',
      { status: 'cancelled' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without roadmap.milestone.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'roadmap.milestone.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/roadmap');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/roadmap', 'POST',
      { title: 't', milestoneType: 'm' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /roadmap\.milestone\.write/);
  } finally { server.close(); }
});
