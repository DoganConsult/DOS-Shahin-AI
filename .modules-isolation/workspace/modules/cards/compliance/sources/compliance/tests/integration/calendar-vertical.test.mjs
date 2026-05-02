/**
 * W22 — /api/compliance/calendar vertical wiring tests.
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
    if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
    if (s.includes('AND framework_id =')) { out = out.filter((r) => r.framework_id === p[i]); i++; }
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND start_date >=')) { out = out.filter((r) => r.start_date >= p[i]); i++; }
    if (s.includes('AND start_date <=')) { out = out.filter((r) => r.start_date <= p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, tenant_id, title, event_type, framework_id')) {
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
      if (s.startsWith('INSERT INTO') && s.includes('compliance_calendar')) {
        const [tenant_id, title, event_type, framework_id,
               start_date, end_date, recurrence, owner_id, status, remJson] = p;
        const now = new Date().toISOString();
        const row = {
          id: `cal-${++id}`, tenant_id, title, event_type, framework_id,
          start_date, end_date, recurrence, owner_id, status,
          reminders: JSON.parse(remJson),
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('compliance_calendar')) {
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
    calendarDeps: {
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

test('GET /api/compliance/calendar empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/calendar');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates event with default status scheduled; GET reads it', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 'Annual audit', eventType: 'audit', startDate: '2026-09-01' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.status, 'scheduled');
    assert.equal(c.body.data.title, 'Annual audit');
    assert.deepEqual(c.body.data.reminders, []);
    const one = await fetchJson(port, `/api/compliance/calendar/${c.body.data.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.id, c.body.data.id);
  } finally { server.close(); }
});

test('POST without title/eventType/startDate → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/calendar', 'POST', { recurrence: 'monthly' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad status → 400 bad_status', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 't', eventType: 'audit', startDate: '2026-09-01', status: 'broken' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_status');
  } finally { server.close(); }
});

test('list filters: eventType + fromDate/toDate window narrow result set', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 'A', eventType: 'audit', startDate: '2026-01-15' });
    await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 'B', eventType: 'audit', startDate: '2026-06-15' });
    await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 'C', eventType: 'review', startDate: '2026-02-15' });
    const audits = await fetchJson(port, '/api/compliance/calendar?eventType=audit');
    assert.equal(audits.body.meta.total, 2);
    const window = await fetchJson(port, '/api/compliance/calendar?fromDate=2026-02-01&toDate=2026-05-01');
    assert.equal(window.body.meta.total, 1);
    const both = await fetchJson(port, '/api/compliance/calendar?eventType=audit&fromDate=2026-05-01');
    assert.equal(both.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/status transitions and writes audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 't', eventType: 'audit', startDate: '2026-09-01' });
    const id = c.body.data.id;
    const u = await fetchJson(port, `/api/compliance/calendar/${id}/status`, 'PATCH',
      { status: 'in_progress' });
    assert.equal(u.status, 200);
    assert.equal(u.body.data.status, 'in_progress');
    const a = captured.find((e) => e.action === 'calendar.status_change');
    assert.ok(a);
    assert.equal(a.before.status, 'scheduled');
    assert.equal(a.after.status, 'in_progress');
  } finally { server.close(); }
});

test('PATCH on missing id → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/calendar/missing/status', 'PATCH',
      { status: 'cancelled' });
    assert.equal(r.status, 404);
  } finally { server.close(); }
});

test('permission gate denies write without calendar.event.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'calendar.event.read' });
  const { server, port } = await listen(app);
  try {
    const ok = await fetchJson(port, '/api/compliance/calendar');
    assert.equal(ok.status, 200);
    const post = await fetchJson(port, '/api/compliance/calendar', 'POST',
      { title: 't', eventType: 'audit', startDate: '2026-09-01' });
    assert.equal(post.status, 403);
    assert.match(post.body.error.message, /calendar\.event\.write/);
  } finally { server.close(); }
});
