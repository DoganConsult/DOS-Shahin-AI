/**
 * W38 — /api/compliance/control-test-schedules vertical wiring tests.
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
    if (s.includes('AND frequency =')) { out = out.filter((r) => r.frequency === p[i]); i++; }
    if (s.includes('AND last_result =')) { out = out.filter((r) => r.last_result === p[i]); i++; }
    if (s.includes('AND next_execution_date <=')) { out = out.filter((r) => r.next_execution_date && r.next_execution_date <= p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT schedule_id, control_id')) {
        if (s.includes('WHERE schedule_id = $1')) {
          const m = rows.find((r) => r.schedule_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('control_test_schedules')) {
        const [control_id, test_type, frequency, next_execution_date, assigned_to, auto_execute] = p;
        const now = new Date().toISOString();
        const row = {
          schedule_id: `s-${++id}`, control_id, test_type, frequency,
          next_execution_date, last_executed_at: null, last_result: null,
          assigned_to, auto_execute,
          created_at: now, updated_at: now,
        };
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('control_test_schedules')) {
        if (s.includes('last_executed_at = NOW()')) {
          const [schedule_id, last_result, next_execution_date] = p;
          const row = rows.find((x) => x.schedule_id === schedule_id);
          if (!row) return { rows: [], rowCount: 0 };
          row.last_executed_at = new Date().toISOString();
          row.last_result = last_result;
          if (next_execution_date !== null) row.next_execution_date = next_execution_date;
          row.updated_at = new Date().toISOString();
          return { rows: [row], rowCount: 1 };
        }
        const [schedule_id, test_type, frequency, next_execution_date, assigned_to, auto_execute] = p;
        const row = rows.find((x) => x.schedule_id === schedule_id);
        if (!row) return { rows: [], rowCount: 0 };
        if (test_type !== null) row.test_type = test_type;
        if (frequency !== null) row.frequency = frequency;
        if (next_execution_date !== null) row.next_execution_date = next_execution_date;
        if (assigned_to !== null) row.assigned_to = assigned_to;
        if (auto_execute !== null) row.auto_execute = auto_execute;
        row.updated_at = new Date().toISOString();
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('control_test_schedules')) {
        const idx = rows.findIndex((x) => x.schedule_id === p[0]);
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
    controlTestSchedulesDeps: {
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

test('GET /api/compliance/control-test-schedules empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-test-schedules');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
    assert.equal(r.body.meta.total, 0);
  } finally { server.close(); }
});

test('POST creates with default frequency=annually', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1' });
    assert.equal(c.status, 201);
    assert.equal(c.body.data.frequency, 'annually');
    assert.equal(c.body.data.autoExecute, false);
    assert.equal(c.body.data.lastResult, null);
  } finally { server.close(); }
});

test('POST without controlId → 400 bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST', {});
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST with bad frequency → 400 bad_frequency', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1', frequency: 'hourly' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_frequency');
  } finally { server.close(); }
});

test('list filters narrow on controlId + frequency', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1', frequency: 'monthly' });
    await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1', frequency: 'annually' });
    await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-2', frequency: 'monthly' });
    const r = await fetchJson(port,
      '/api/compliance/control-test-schedules?controlId=AC-1&frequency=monthly');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('PATCH /:id/execution stamps last_result + audit before/after', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1', frequency: 'monthly' });
    const r = await fetchJson(port,
      `/api/compliance/control-test-schedules/${c.body.data.scheduleId}/execution`,
      'PATCH', { result: 'pass', nextExecutionDate: '2026-12-31' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.lastResult, 'pass');
    assert.ok(r.body.data.lastExecutedAt);
    assert.equal(r.body.data.nextExecutionDate, '2026-12-31');
    const a = captured.find((e) => e.action === 'control_test_schedule.execution');
    assert.ok(a);
    assert.equal(a.before.lastResult, null);
    assert.equal(a.after.lastResult, 'pass');
  } finally { server.close(); }
});

test('PATCH /:id/execution with bad result → 400 bad_result', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1' });
    const r = await fetchJson(port,
      `/api/compliance/control-test-schedules/${c.body.data.scheduleId}/execution`,
      'PATCH', { result: 'maybe' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_result');
  } finally { server.close(); }
});

test('DELETE removes; second DELETE → 404; permission gate denies write', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1' });
    const d1 = await fetchJson(port,
      `/api/compliance/control-test-schedules/${c.body.data.scheduleId}`, 'DELETE');
    assert.equal(d1.status, 204);
    const d2 = await fetchJson(port,
      `/api/compliance/control-test-schedules/${c.body.data.scheduleId}`, 'DELETE');
    assert.equal(d2.status, 404);
  } finally { server.close(); }

  const gated = buildApp({ hasPermission: (k) => k === 'control_test_schedule.schedule.read' });
  const { server: s2, port: p2 } = await listen(gated.app);
  try {
    const r = await fetchJson(p2, '/api/compliance/control-test-schedules', 'POST',
      { controlId: 'AC-1' });
    assert.equal(r.status, 403);
  } finally { s2.close(); }
});
