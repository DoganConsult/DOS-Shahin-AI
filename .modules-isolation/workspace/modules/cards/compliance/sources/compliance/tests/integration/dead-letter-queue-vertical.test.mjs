/**
 * W67 — /api/compliance/dead-letter-queue vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, DLQ_STATUSES } = require('../../dist/index.js');

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

function makeClient({ outboxEvents = [] } = {}) {
  const events = outboxEvents.map((e) => ({
    event_id: e.event_id, event_type: e.event_type ?? 'evt',
    aggregate_type: e.aggregate_type ?? 'agg',
    aggregate_id: e.aggregate_id ?? 'a-1',
    payload: e.payload ?? { foo: 'bar' },
    attempts: String(e.attempts ?? 8),
    error_message: e.error_message ?? 'boom',
    status: e.status ?? 'failed',
  }));
  const dlq = [];
  let dlqId = 0;
  let outId = 100;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // outbox SELECT (used by moveToDlq)
      if (s.startsWith('SELECT event_id, event_type, aggregate_type')
          && s.includes('event_outbox')) {
        const e = events.find((r) => r.event_id === p[0]);
        return e ? { rows: [e], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      // outbox INSERT (used by replayDlq)
      if (s.startsWith('INSERT INTO') && s.includes('event_outbox')) {
        const newId = `ev-${++outId}`;
        const newRow = {
          event_id: newId, event_type: p[0], aggregate_type: p[1],
          aggregate_id: p[2],
          payload: typeof p[3] === 'string' ? JSON.parse(p[3]) : p[3],
          status: 'pending', attempts: '0', error_message: null,
        };
        events.push(newRow);
        return { rows: [{ event_id: newId }], rowCount: 1 };
      }
      // dlq INSERT
      if (s.startsWith('INSERT INTO') && s.includes('event_dead_letter')) {
        const [event_id, event_type, aggregate_type, aggregate_id, payload, attempts, error_message] = p;
        const row = {
          dlq_id: `dlq-${++dlqId}`, event_id, event_type, aggregate_type, aggregate_id,
          payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
          attempts: String(attempts), error_message,
          status: 'open',
          created_at: new Date(Date.now() + dlqId).toISOString(),
          created_by: p[7], replayed_at: null, replayed_by: null, new_event_id: null,
        };
        dlq.push(row);
        return { rows: [row], rowCount: 1 };
      }
      // dlq SELECT (list/get)
      if (s.startsWith('SELECT dlq_id')) {
        if (s.includes('WHERE dlq_id = $1')) {
          const m = dlq.find((r) => r.dlq_id === p[0]);
          return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        let out = dlq.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
        if (s.includes('AND aggregate_id =')) { out = out.filter((r) => r.aggregate_id === p[i]); i++; }
        out = out.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('event_dead_letter')) {
        let out = dlq.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
        if (s.includes('AND aggregate_id =')) { out = out.filter((r) => r.aggregate_id === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // dlq UPDATE
      if (s.startsWith('UPDATE') && s.includes("status = 'replayed'")) {
        const m = dlq.find((r) => r.dlq_id === p[0]);
        if (!m) return { rows: [], rowCount: 0 };
        m.status = 'replayed'; m.replayed_at = new Date().toISOString();
        m.replayed_by = p[1]; m.new_event_id = p[2];
        return { rows: [m], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'archived'")) {
        const m = dlq.find((r) => r.dlq_id === p[0]);
        if (!m) return { rows: [], rowCount: 0 };
        m.status = 'archived';
        return { rows: [m], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _events: events,
    _dlq: dlq,
  };
}

function buildApp({ outboxEvents, hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ outboxEvents });
  registerCompliance({
    app,
    deadLetterQueueDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('DLQ_STATUSES exposes open|replayed|archived', () => {
  assert.deepEqual(DLQ_STATUSES.slice().sort(), ['archived', 'open', 'replayed']);
});

test('GET requires permission event.dlq.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /from-event requires permission event.dlq.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'event.dlq.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'x' });
  server.close();
  assert.equal(r.status, 403);
});

test('POST /from-event with missing eventId → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', {});
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST /from-event with unknown eventId → 404 not_found', async () => {
  const { app } = buildApp({ outboxEvents: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'nope' });
  server.close();
  assert.equal(r.status, 404);
});

test('POST /from-event copies outbox event into DLQ as open', async () => {
  const { app, client } = buildApp({
    outboxEvents: [{ event_id: 'ev-9', event_type: 'risk.created', aggregate_id: 'r-1', payload: { x: 1 } }],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', {
    eventId: 'ev-9', errorMessage: 'manual move',
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'open');
  assert.equal(r.body.data.eventType, 'risk.created');
  assert.equal(r.body.data.errorMessage, 'manual move');
  assert.equal(client._dlq.length, 1);
});

test('POST /:id/replay creates new outbox event and stamps DLQ replayed', async () => {
  const { app, client } = buildApp({
    outboxEvents: [{ event_id: 'ev-9', event_type: 'risk.created', aggregate_id: 'r-1', payload: { x: 1 } }],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const created = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-9' });
  const dlqId = created.body.data.dlqId;
  const r = await fetchJson(port, `/api/compliance/dead-letter-queue/${dlqId}/replay`, 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'replayed');
  assert.ok(r.body.data.newEventId);
  // outbox now has 2 entries (original + replay)
  assert.equal(client._events.length, 2);
  assert.equal(client._events[1].status, 'pending');
  assert.equal(client._events[1].attempts, '0');
});

test('POST /:id/replay on already-replayed → 409 bad_state', async () => {
  const { app } = buildApp({
    outboxEvents: [{ event_id: 'ev-9' }],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const created = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-9' });
  const dlqId = created.body.data.dlqId;
  await fetchJson(port, `/api/compliance/dead-letter-queue/${dlqId}/replay`, 'POST', {});
  const r = await fetchJson(port, `/api/compliance/dead-letter-queue/${dlqId}/replay`, 'POST', {});
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'bad_state');
});

test('POST /:id/archive marks archived (idempotent)', async () => {
  const { app } = buildApp({
    outboxEvents: [{ event_id: 'ev-9' }],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const created = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-9' });
  const dlqId = created.body.data.dlqId;
  const r1 = await fetchJson(port, `/api/compliance/dead-letter-queue/${dlqId}/archive`, 'POST', {});
  const r2 = await fetchJson(port, `/api/compliance/dead-letter-queue/${dlqId}/archive`, 'POST', {});
  server.close();
  assert.equal(r1.body.data.status, 'archived');
  assert.equal(r2.body.data.status, 'archived');
});

test('GET /:id 404 unknown', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/dead-letter-queue/nope');
  server.close();
  assert.equal(r.status, 404);
});

test('GET list filters by status and counts total', async () => {
  const { app } = buildApp({
    outboxEvents: [
      { event_id: 'ev-1' }, { event_id: 'ev-2' }, { event_id: 'ev-3' },
    ],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const c1 = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-1' });
  const c2 = await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-2' });
  await fetchJson(port, '/api/compliance/dead-letter-queue/from-event', 'POST', { eventId: 'ev-3' });
  await fetchJson(port, `/api/compliance/dead-letter-queue/${c1.body.data.dlqId}/replay`, 'POST', {});
  await fetchJson(port, `/api/compliance/dead-letter-queue/${c2.body.data.dlqId}/archive`, 'POST', {});
  const all = await fetchJson(port, '/api/compliance/dead-letter-queue');
  const open = await fetchJson(port, '/api/compliance/dead-letter-queue?status=open');
  const replayed = await fetchJson(port, '/api/compliance/dead-letter-queue?status=replayed');
  server.close();
  assert.equal(all.body.meta.total, 3);
  assert.equal(open.body.meta.total, 1);
  assert.equal(replayed.body.meta.total, 1);
});
