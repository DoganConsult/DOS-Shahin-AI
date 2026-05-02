/**
 * W66 — /api/compliance/retry-backoff-policy vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, computeBackoffMs, planRetries } = require('../../dist/index.js');

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

function makeClient({ failed = [] } = {}) {
  const events = failed.map((e, i) => ({
    event_id: e.event_id ?? `ev-${i + 1}`,
    attempts: String(e.attempts ?? 1),
    created_at: e.created_at ?? new Date(Date.now() - 86_400_000).toISOString(),
    dispatched_at: e.dispatched_at ?? null,
    status: 'failed',
    error_message: e.error_message ?? 'boom',
  }));
  const decisions = [];
  let did = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT event_id, attempts, created_at, dispatched_at')) {
        const out = events.filter((e) => e.status === 'failed')
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('UPDATE') && s.includes("status = 'pending'")) {
        const e = events.find((r) => r.event_id === p[0] && r.status === 'failed');
        if (!e) return { rows: [], rowCount: 0 };
        e.status = 'pending'; e.error_message = null;
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes("error_message = COALESCE")) {
        const e = events.find((r) => r.event_id === p[0]);
        if (!e) return { rows: [], rowCount: 0 };
        e.error_message = (e.error_message ?? '') + ' [dropped after max attempts]';
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('retry_decisions')) {
        const [event_id, attempts, action, delay_ms, reason, decided_by] = p;
        const row = {
          decision_id: `rd-${++did}`, event_id, attempts: String(attempts),
          action, delay_ms: String(delay_ms), reason, decided_by,
          decided_at: new Date().toISOString(),
        };
        decisions.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT decision_id')) {
        let out = decisions.slice(); let i = 0;
        if (s.includes('AND event_id =')) { out = out.filter((r) => r.event_id === p[i]); i++; }
        if (s.includes('AND action =')) { out = out.filter((r) => r.action === p[i]); i++; }
        out = out.slice().sort((a, b) => b.decided_at.localeCompare(a.decided_at));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('retry_decisions')) {
        let out = decisions.slice(); let i = 0;
        if (s.includes('AND event_id =')) { out = out.filter((r) => r.event_id === p[i]); i++; }
        if (s.includes('AND action =')) { out = out.filter((r) => r.action === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _events: events,
    _decisions: decisions,
  };
}

function buildApp({ failed, hasPermission, defaultPolicy } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ failed });
  registerCompliance({
    app,
    retryBackoffPolicyDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
      defaultPolicy,
    },
  });
  return { app, client };
}

test('computeBackoffMs: attempts=1 → base; grows by factor; capped by max', () => {
  assert.equal(computeBackoffMs(1, { baseMs: 1000, factor: 2, maxDelayMs: 60_000 }), 1000);
  assert.equal(computeBackoffMs(2, { baseMs: 1000, factor: 2, maxDelayMs: 60_000 }), 2000);
  assert.equal(computeBackoffMs(5, { baseMs: 1000, factor: 2, maxDelayMs: 60_000 }), 16_000);
  assert.equal(computeBackoffMs(20, { baseMs: 1000, factor: 2, maxDelayMs: 60_000 }), 60_000);
  assert.equal(computeBackoffMs(0, { baseMs: 1000, factor: 2, maxDelayMs: 60_000 }), 1000);
});

test('GET requires permission event.retry.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run requires permission event.retry.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'event.retry.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run with no failed events returns scanned=0', async () => {
  const { app } = buildApp({ failed: [], hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.scanned, 0);
  assert.equal(r.body.data.requeued, 0);
});

test('POST /run requeues old failed event past delay', async () => {
  const { app, client } = buildApp({
    failed: [{ event_id: 'old1', attempts: 1, created_at: new Date(Date.now() - 86_400_000).toISOString() }],
    hasPermission: () => true,
    defaultPolicy: { baseMs: 1000, factor: 2, maxDelayMs: 60_000, maxAttempts: 8 },
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.requeued, 1);
  assert.equal(client._events[0].status, 'pending');
  assert.equal(r.body.data.decisions[0].action, 'requeued');
});

test('POST /run skips too-soon when delay not yet elapsed', async () => {
  const justNow = new Date(Date.now() - 100).toISOString();
  const { app, client } = buildApp({
    failed: [{ event_id: 'fresh', attempts: 1, created_at: justNow }],
    hasPermission: () => true,
    defaultPolicy: { baseMs: 60_000, factor: 2, maxDelayMs: 600_000, maxAttempts: 8 },
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.skippedTooSoon, 1);
  assert.equal(r.body.data.requeued, 0);
  assert.equal(client._events[0].status, 'failed');
});

test('POST /run skips exhausted when attempts >= maxAttempts (default policy)', async () => {
  const { app, client } = buildApp({
    failed: [{ event_id: 'maxed', attempts: 8, created_at: new Date(Date.now() - 86_400_000).toISOString() }],
    hasPermission: () => true,
    defaultPolicy: { baseMs: 1000, factor: 2, maxAttempts: 8 },
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.skippedExhausted, 1);
  assert.equal(client._events[0].status, 'failed');
});

test('POST /run drops exhausted when dropOnExhausted=true', async () => {
  const { app, client } = buildApp({
    failed: [{ event_id: 'doomed', attempts: 9, created_at: new Date(Date.now() - 86_400_000).toISOString() }],
    hasPermission: () => true,
    defaultPolicy: { baseMs: 1000, factor: 2, maxAttempts: 8, dropOnExhausted: true },
  });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.dropped, 1);
  assert.match(client._events[0].error_message, /dropped after max attempts/);
});

test('GET list returns recorded decisions DESC, filterable by action', async () => {
  const { app } = buildApp({
    failed: [
      { event_id: 'a', attempts: 1, created_at: new Date(Date.now() - 86_400_000).toISOString() },
      { event_id: 'b', attempts: 1, created_at: new Date(Date.now() - 100).toISOString() },
    ],
    hasPermission: () => true,
    defaultPolicy: { baseMs: 60_000, factor: 2, maxDelayMs: 600_000, maxAttempts: 8 },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/retry-backoff-policy/run', 'POST', {});
  const all = await fetchJson(port, '/api/compliance/retry-backoff-policy');
  const reqOnly = await fetchJson(port, '/api/compliance/retry-backoff-policy?action=requeued');
  const skipOnly = await fetchJson(port, '/api/compliance/retry-backoff-policy?action=skipped_too_soon');
  server.close();
  assert.equal(all.body.meta.total, 2);
  assert.equal(reqOnly.body.meta.total, 1);
  assert.equal(skipOnly.body.meta.total, 1);
});

test('planRetries: bad_schema rejected', async () => {
  await assert.rejects(
    () => planRetries({ async query() { return { rows: [], rowCount: 0 }; } },
      { tenantSchema: 'evil; DROP', actorId: 'u' }),
    /bad_schema/,
  );
});

test('planRetries: injectable now() controls delay window', async () => {
  const fixedNow = new Date('2026-01-01T00:00:00Z');
  const tenMinAgo = new Date(fixedNow.getTime() - 600_000).toISOString();
  const client = makeClient({
    failed: [{ event_id: 'x', attempts: 1, created_at: tenMinAgo }],
  });
  const r = await planRetries(client, {
    tenantSchema: 'tenant_t1',
    actorId: 'u',
    policy: { baseMs: 60_000, factor: 2, maxDelayMs: 600_000, maxAttempts: 8 },
    now: () => fixedNow,
  });
  assert.equal(r.requeued, 1);
});
