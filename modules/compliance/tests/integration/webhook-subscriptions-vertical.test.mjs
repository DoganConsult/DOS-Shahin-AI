/**
 * W75 — /api/compliance/webhook-subscriptions* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance } = require('../../dist/index.js');

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
  const subs = [];
  const dels = [];
  let subSeq = 0;
  let delSeq = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // SUBS reads
      if (s.startsWith('SELECT subscription_id') && s.includes('WHERE subscription_id = $1')) {
        const x = subs.find((r) => r.subscription_id === p[0]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT subscription_id') && s.includes("WHERE status = 'active'")) {
        const out = subs.filter((r) => r.status === 'active');
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT subscription_id') && s.includes('WHERE 1=1')) {
        let out = subs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('@>')) {
          const arr = JSON.parse(p[i]); i++;
          out = out.filter((r) => Array.isArray(r.event_types) && arr.every((e) => r.event_types.includes(e)));
        }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('webhook_subscriptions')) {
        let out = subs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('@>')) {
          const arr = JSON.parse(p[i]); i++;
          out = out.filter((r) => Array.isArray(r.event_types) && arr.every((e) => r.event_types.includes(e)));
        }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // SUBS writes
      if (s.startsWith('INSERT INTO') && s.includes('webhook_subscriptions')) {
        subSeq++;
        const x = {
          subscription_id: `s${subSeq}`,
          target_url: p[0],
          event_types: JSON.parse(p[1]),
          secret: p[2],
          status: 'active',
          created_at: new Date().toISOString(),
          created_by: p[3],
        };
        subs.push(x);
        return { rows: [x], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('webhook_subscriptions') && s.includes('SET status')) {
        const x = subs.find((r) => r.subscription_id === p[0]);
        if (x) x.status = p[1];
        return { rows: x ? [x] : [], rowCount: x ? 1 : 0 };
      }
      // DELS reads
      if (s.startsWith('SELECT delivery_id') && s.includes('WHERE 1=1')) {
        let out = dels.slice(); let i = 0;
        if (s.includes('AND subscription_id =')) { out = out.filter((r) => r.subscription_id === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
        out.sort((a, b) => a.attempted_at < b.attempted_at ? 1 : -1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('webhook_deliveries')) {
        let out = dels.slice(); let i = 0;
        if (s.includes('AND subscription_id =')) { out = out.filter((r) => r.subscription_id === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        if (s.includes('AND event_type =')) { out = out.filter((r) => r.event_type === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // DELS writes
      if (s.startsWith('INSERT INTO') && s.includes('webhook_deliveries')) {
        delSeq++;
        const x = {
          delivery_id: `d${delSeq}`,
          subscription_id: p[0],
          event_type: p[1],
          payload: JSON.parse(p[2]),
          status: p[3],
          response_status: p[4],
          duration_ms: p[5],
          error: p[6],
          attempted_at: new Date().toISOString(),
        };
        dels.push(x);
        return { rows: [x], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _subs: subs,
    _dels: dels,
  };
}

function buildApp({ hasPermission, transport } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    webhookSubscriptionsDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1',
        hasPermission, transport,
      }),
    },
  });
  return { app, client };
}

test('GET /webhook-subscriptions requires webhook.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /webhook-subscriptions requires webhook.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'webhook.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x', eventTypes: ['*'],
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST bad targetUrl → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'ftp://x', eventTypes: ['e'],
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST empty eventTypes → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: [],
  });
  server.close();
  assert.equal(r.status, 400);
});

test('POST creates active subscription', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['risk.created'],
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'active');
  assert.equal(client._subs.length, 1);
});

test('PATCH status revoked then attempt active → bad_state', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const c = await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['e'],
  });
  const id = c.body.data.subscriptionId;
  await fetchJson(port, `/api/compliance/webhook-subscriptions/${id}/status`, 'PATCH', { status: 'revoked' });
  const r = await fetchJson(port, `/api/compliance/webhook-subscriptions/${id}/status`, 'PATCH', { status: 'active' });
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'bad_state');
});

test('POST /dispatch fans out to wildcard subs with transport=200', async () => {
  let called = 0;
  const { app, client } = buildApp({
    hasPermission: () => true,
    transport: () => { called++; return 200; },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['*'],
  });
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    eventType: 'risk.created', payload: { id: 'r1' },
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.matched, 1);
  assert.equal(r.body.data.succeeded, 1);
  assert.equal(called, 1);
  assert.equal(client._dels.length, 1);
  assert.equal(client._dels[0].status, 'succeeded');
});

test('POST /dispatch transport throws → status=failed', async () => {
  const { app, client } = buildApp({
    hasPermission: () => true,
    transport: () => { throw new Error('boom'); },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['risk.created'],
  });
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    eventType: 'risk.created', payload: {},
  });
  server.close();
  assert.equal(r.body.data.failed, 1);
  assert.equal(client._dels[0].status, 'failed');
  assert.equal(client._dels[0].error, 'boom');
});

test('POST /dispatch with no matching subs → matched=0', async () => {
  const { app } = buildApp({ hasPermission: () => true, transport: () => 200 });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['other.event'],
  });
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    eventType: 'risk.created', payload: {},
  });
  server.close();
  assert.equal(r.body.data.matched, 0);
});

test('POST /dispatch non-2xx → status=failed', async () => {
  const { app, client } = buildApp({
    hasPermission: () => true,
    transport: () => 500,
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['*'],
  });
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    eventType: 'risk.created', payload: {},
  });
  server.close();
  assert.equal(r.body.data.failed, 1);
  assert.equal(client._dels[0].response_status, 500);
});

test('POST /dispatch missing eventType → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    payload: {},
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('GET /webhook-subscriptions/:id 404 when missing', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-subscriptions/nope');
  server.close();
  assert.equal(r.status, 404);
});

test('GET /webhook-deliveries lists rows', async () => {
  const { app } = buildApp({ hasPermission: () => true, transport: () => 200 });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/webhook-subscriptions', 'POST', {
    targetUrl: 'https://x.example', eventTypes: ['*'],
  });
  await fetchJson(port, '/api/compliance/webhook-subscriptions/dispatch', 'POST', {
    eventType: 'e1', payload: {},
  });
  const r = await fetchJson(port, '/api/compliance/webhook-deliveries');
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 1);
});

test('GET /webhook-deliveries requires webhook.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/webhook-deliveries');
  server.close();
  assert.equal(r.status, 403);
});
