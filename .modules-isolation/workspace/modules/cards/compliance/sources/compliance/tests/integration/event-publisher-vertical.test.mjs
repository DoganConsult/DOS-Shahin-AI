/**
 * W60 — /api/compliance/event-publisher vertical wiring tests.
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
  const events = [];
  let id = 0;
  const matchFilters = (s, p) => {
    let i = 0;
    let out = events.slice();
    if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
    if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
    if (s.includes('AND aggregate_id =')) { out = out.filter((r) => r.aggregate_id === p[i]); i++; }
    return out;
  };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT event_id')) {
        if (s.includes('WHERE event_id = $1')) {
          const m = events.find((r) => r.event_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (s.includes("WHERE status = 'pending'")) {
          const out = events.filter((r) => r.status === 'pending')
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          return { rows: out, rowCount: out.length };
        }
        const out = matchFilters(s, p);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n')) {
        const out = matchFilters(s, p);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('event_outbox')) {
        const [event_type, aggregate_type, aggregate_id, payload, created_by] = p;
        const now = new Date(Date.now() + (++id)).toISOString();
        const row = {
          event_id: `ev-${id}`, event_type, aggregate_type, aggregate_id,
          payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
          status: 'pending', attempts: '0', error_message: null,
          created_at: now, created_by, dispatched_at: null,
        };
        events.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'dispatched'")) {
        const row = events.find((r) => r.event_id === p[0]);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = 'dispatched'; row.dispatched_at = new Date().toISOString();
        row.attempts = String(Number(row.attempts) + 1); row.error_message = null;
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'failed'")) {
        const row = events.find((r) => r.event_id === p[0]);
        if (!row) return { rows: [], rowCount: 0 };
        row.status = 'failed'; row.attempts = String(Number(row.attempts) + 1);
        row.error_message = p[1];
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp({ hasPermission, dispatchHandler } = {}) {
  const app = express(); app.use(express.json());
  registerCompliance({
    app,
    eventPublisherDeps: {
      client: makeClient(),
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
      dispatchHandler,
    },
  });
  return { app };
}

test('GET empty list', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/event-publisher');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data, []);
  } finally { server.close(); }
});

test('POST publish creates pending event + audit', async () => {
  const captured = [];
  bindAuditPort({ write: async (e) => { captured.push(e); } });
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/event-publisher', 'POST', {
      eventType: 'compliance.gap.created', aggregateType: 'gap', aggregateId: 'g-1',
      payload: { severity: 'high' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'pending');
    assert.equal(r.body.data.eventType, 'compliance.gap.created');
    assert.equal(r.body.data.payload.severity, 'high');
    const a = captured.find((e) => e.action === 'event.publish');
    assert.equal(a.after.aggregateId, 'g-1');
  } finally { server.close(); }
});

test('POST publish without required → bad_input', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/event-publisher', 'POST', {
      eventType: 'x',
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'bad_input');
  } finally { server.close(); }
});

test('POST /dispatch drains pending → dispatched', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'a', aggregateType: 'x', aggregateId: '1' });
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'b', aggregateType: 'x', aggregateId: '2' });
    const r = await fetchJson(port, '/api/compliance/event-publisher/dispatch', 'POST', {});
    assert.equal(r.body.data.dispatched, 2);
    assert.equal(r.body.data.failed, 0);
  } finally { server.close(); }
});

test('POST /dispatch handler error → marks failed', async () => {
  const { app } = buildApp({
    dispatchHandler: async () => { throw new Error('downstream broken'); },
  });
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'fail', aggregateType: 'x', aggregateId: '99' });
    const r = await fetchJson(port, '/api/compliance/event-publisher/dispatch', 'POST', {});
    assert.equal(r.body.data.dispatched, 0);
    assert.equal(r.body.data.failed, 1);
    assert.equal(r.body.data.rows[0].status, 'failed');
    assert.match(r.body.data.rows[0].errorMessage, /downstream broken/);
  } finally { server.close(); }
});

test('list filter by status narrows', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'a', aggregateType: 'x', aggregateId: '1' });
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'b', aggregateType: 'x', aggregateId: '2' });
    await fetchJson(port, '/api/compliance/event-publisher/dispatch', 'POST', {});
    const r1 = await fetchJson(port, '/api/compliance/event-publisher?status=dispatched');
    assert.equal(r1.body.meta.total, 2);
    const r2 = await fetchJson(port, '/api/compliance/event-publisher?status=pending');
    assert.equal(r2.body.meta.total, 0);
  } finally { server.close(); }
});

test('list filter by eventType narrows', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'finding.opened', aggregateType: 'finding', aggregateId: 'f1' });
    await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'gap.opened', aggregateType: 'gap', aggregateId: 'g1' });
    const r = await fetchJson(port, '/api/compliance/event-publisher?eventType=finding.opened');
    assert.equal(r.body.meta.total, 1);
  } finally { server.close(); }
});

test('GET /:id returns single, missing → 404', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'x', aggregateType: 'y', aggregateId: 'z' });
    const r = await fetchJson(port, `/api/compliance/event-publisher/${c.body.data.eventId}`);
    assert.equal(r.body.data.eventId, c.body.data.eventId);
    const r404 = await fetchJson(port, '/api/compliance/event-publisher/missing');
    assert.equal(r404.status, 404);
  } finally { server.close(); }
});

test('dispatch increments attempts', async () => {
  const { app } = buildApp();
  const { server, port } = await listen(app);
  try {
    const c = await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'x', aggregateType: 'y', aggregateId: 'z' });
    assert.equal(c.body.data.attempts, 0);
    await fetchJson(port, '/api/compliance/event-publisher/dispatch', 'POST', {});
    const r = await fetchJson(port, `/api/compliance/event-publisher/${c.body.data.eventId}`);
    assert.equal(r.body.data.attempts, 1);
    assert.equal(r.body.data.status, 'dispatched');
  } finally { server.close(); }
});

test('permission gate denies write 403', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'event.outbox.read' });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/event-publisher', 'POST',
      { eventType: 'x', aggregateType: 'y', aggregateId: 'z' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});
