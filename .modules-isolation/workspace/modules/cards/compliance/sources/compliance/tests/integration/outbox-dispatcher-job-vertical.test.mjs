/**
 * W65 — /api/compliance/outbox-dispatcher-job vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, createDispatcherJob } = require('../../dist/index.js');

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

function makeClient({ pendings = [] } = {}) {
  const runs = [];
  const events = pendings.map((e, i) => ({
    event_id: e.event_id ?? `ev-${i + 1}`,
    event_type: e.event_type ?? 'evt',
    aggregate_type: e.aggregate_type ?? 'agg',
    aggregate_id: e.aggregate_id ?? `a-${i + 1}`,
    payload: e.payload ?? {},
    status: 'pending',
    attempts: '0',
    error_message: null,
    created_at: e.created_at ?? new Date(Date.now() + i).toISOString(),
    created_by: e.created_by ?? 'sys',
    dispatched_at: null,
  }));
  let runId = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // Outbox dispatcher run journal
      if (s.startsWith('INSERT INTO') && s.includes('outbox_dispatcher_runs')) {
        const [tenant_schema, lock_token] = p;
        const row = {
          run_id: `run-${++runId}`,
          tenant_schema,
          started_at: new Date().toISOString(),
          finished_at: null,
          scanned: '0', dispatched: '0', failed: '0',
          status: 'running',
          lock_token,
        };
        runs.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('outbox_dispatcher_runs')) {
        const row = runs.find((r) => r.run_id === p[0]);
        if (!row) return { rows: [], rowCount: 0 };
        if (s.includes("status = 'idle'")) {
          row.scanned = String(p[1]); row.dispatched = String(p[2]); row.failed = String(p[3]);
          row.status = 'idle'; row.finished_at = new Date().toISOString();
        } else if (s.includes("status = 'stopped'")) {
          row.status = 'stopped'; row.finished_at = new Date().toISOString();
        }
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT run_id')) {
        let out = runs.slice(); let i = 1;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        out = out.slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('outbox_dispatcher_runs')) {
        let out = runs.slice(); let i = 1;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // Outbox event reads/updates (delegated W60 dispatcher)
      if (s.startsWith('SELECT event_id') && s.includes("WHERE status = 'pending'")) {
        const out = events.filter((e) => e.status === 'pending')
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'dispatched'")) {
        const e = events.find((r) => r.event_id === p[0]);
        if (!e) return { rows: [], rowCount: 0 };
        e.status = 'dispatched'; e.dispatched_at = new Date().toISOString();
        e.attempts = String(Number(e.attempts) + 1); e.error_message = null;
        return { rows: [e], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'failed'")) {
        const e = events.find((r) => r.event_id === p[0]);
        if (!e) return { rows: [], rowCount: 0 };
        e.status = 'failed'; e.attempts = String(Number(e.attempts) + 1);
        e.error_message = p[1];
        return { rows: [e], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _runs: runs,
    _events: events,
  };
}

function buildApp({ pendings, hasPermission, dispatchHandler } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ pendings });
  registerCompliance({
    app,
    outboxDispatcherJobDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
      dispatchHandler,
    },
  });
  return { app, client };
}

test('createDispatcherJob: bad schema rejected at construction', () => {
  assert.throws(() => createDispatcherJob({
    client: { async query() { return { rows: [], rowCount: 0 }; } },
    tenantSchema: 'evil; DROP',
  }), /bad_schema/);
});

test('createDispatcherJob: handle exposes status idle and lastRun null initially', () => {
  const h = createDispatcherJob({
    client: { async query() { return { rows: [], rowCount: 0 }; } },
    tenantSchema: 'tenant_t1',
  });
  assert.equal(h.status(), 'idle');
  assert.equal(h.lastRun(), null);
});

test('GET list runs requires permission event.dispatcher.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job');
  server.close();
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'forbidden');
});

test('POST run-once requires permission event.dispatcher.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'event.dispatcher.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  server.close();
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'forbidden');
});

test('POST run-once with no pending events returns idle run with zero counts', async () => {
  const { app } = buildApp({ pendings: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'idle');
  assert.equal(r.body.data.scanned, 0);
  assert.equal(r.body.data.dispatched, 0);
  assert.equal(r.body.data.failed, 0);
});

test('POST run-once dispatches all pending events', async () => {
  const { app, client } = buildApp({
    pendings: [{ event_id: 'e1' }, { event_id: 'e2' }, { event_id: 'e3' }],
    hasPermission: () => true,
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'idle');
  assert.equal(r.body.data.dispatched, 3);
  assert.equal(r.body.data.failed, 0);
  assert.equal(client._events.filter((e) => e.status === 'dispatched').length, 3);
});

test('POST run-once captures handler failures as failed', async () => {
  let count = 0;
  const { app } = buildApp({
    pendings: [{ event_id: 'e1' }, { event_id: 'e2' }],
    hasPermission: () => true,
    dispatchHandler: () => {
      count++;
      if (count === 1) throw new Error('boom');
    },
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.dispatched, 1);
  assert.equal(r.body.data.failed, 1);
});

test('POST run-once accepts custom lockToken', async () => {
  const { app } = buildApp({ pendings: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {
    lockToken: 'custom-token-123',
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.lockToken, 'custom-token-123');
});

test('GET list returns previously executed runs in DESC order', async () => {
  const { app } = buildApp({ pendings: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  await new Promise((r) => setTimeout(r, 5));
  await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.total, 2);
  assert.equal(r.body.data.length, 2);
});

test('GET list filters by status', async () => {
  const { app } = buildApp({ pendings: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/outbox-dispatcher-job/run-once', 'POST', {});
  const r = await fetchJson(port, '/api/compliance/outbox-dispatcher-job?status=idle');
  const r2 = await fetchJson(port, '/api/compliance/outbox-dispatcher-job?status=stopped');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.total, 1);
  assert.equal(r2.body.meta.total, 0);
});

test('createDispatcherJob: runOnce executes one cycle', async () => {
  const client = makeClient({ pendings: [{ event_id: 'x1' }] });
  const h = createDispatcherJob({ client, tenantSchema: 'tenant_t1' });
  const run = await h.runOnce();
  assert.equal(run.status, 'idle');
  assert.equal(run.dispatched, 1);
  assert.equal(h.lastRun().runId, run.runId);
});
