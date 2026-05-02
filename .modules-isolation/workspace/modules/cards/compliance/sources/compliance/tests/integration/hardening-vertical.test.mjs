/**
 * W63 — hardening composite-level middlewares (request-id + rate-limit).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance, requestIdMiddleware, rateLimitMiddleware,
} = require('../../dist/index.js');

function listen(app) {
  return new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r({ server: s, port: s.address().port }));
  });
}
function fetchRaw(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('requestId: inbound x-request-id is echoed', async () => {
  const app = express();
  app.use(requestIdMiddleware());
  app.get('/x', (_req, res) => res.json({ id: res.locals.requestId }));
  const { server, port } = await listen(app);
  try {
    const r = await fetchRaw(port, '/x', { 'x-request-id': 'abc-123' });
    assert.equal(r.headers['x-request-id'], 'abc-123');
    assert.match(r.body, /abc-123/);
  } finally { server.close(); }
});

test('requestId: missing header is generated', async () => {
  const app = express();
  app.use(requestIdMiddleware());
  app.get('/x', (_req, res) => res.json({ id: res.locals.requestId }));
  const { server, port } = await listen(app);
  try {
    const r = await fetchRaw(port, '/x');
    assert.match(r.headers['x-request-id'], /^req_/);
  } finally { server.close(); }
});

test('requestId: oversized inbound is replaced by generated', async () => {
  const app = express();
  app.use(requestIdMiddleware());
  app.get('/x', (_req, res) => res.json({ id: res.locals.requestId }));
  const { server, port } = await listen(app);
  try {
    const r = await fetchRaw(port, '/x', { 'x-request-id': 'x'.repeat(500) });
    assert.match(r.headers['x-request-id'], /^req_/);
  } finally { server.close(); }
});

test('rateLimit: under threshold passes with remaining headers', async () => {
  const app = express();
  app.use(rateLimitMiddleware({ max: 3, windowMs: 60_000 }));
  app.get('/x', (_req, res) => res.json({ ok: true }));
  const { server, port } = await listen(app);
  try {
    for (let i = 0; i < 3; i++) {
      const r = await fetchRaw(port, '/x');
      assert.equal(r.status, 200);
      assert.equal(r.headers['x-ratelimit-limit'], '3');
    }
  } finally { server.close(); }
});

test('rateLimit: over threshold returns 429 with retry-after', async () => {
  const app = express();
  app.use(rateLimitMiddleware({ max: 2, windowMs: 60_000 }));
  app.get('/x', (_req, res) => res.json({ ok: true }));
  const { server, port } = await listen(app);
  try {
    await fetchRaw(port, '/x');
    await fetchRaw(port, '/x');
    const r = await fetchRaw(port, '/x');
    assert.equal(r.status, 429);
    assert.ok(r.headers['retry-after']);
    assert.match(r.body, /rate_limited/);
  } finally { server.close(); }
});

test('rateLimit: window reset clears counter', async () => {
  let t = 1_000_000;
  const limiter = rateLimitMiddleware({ max: 1, windowMs: 1000, now: () => t });
  const app = express();
  app.use(limiter);
  app.get('/x', (_req, res) => res.json({ ok: true }));
  const { server, port } = await listen(app);
  try {
    let r = await fetchRaw(port, '/x'); assert.equal(r.status, 200);
    r = await fetchRaw(port, '/x'); assert.equal(r.status, 429);
    t += 2000;
    r = await fetchRaw(port, '/x'); assert.equal(r.status, 200);
  } finally { server.close(); }
});

test('rateLimit: skip predicate bypasses limiter', async () => {
  const app = express();
  app.use(rateLimitMiddleware({ max: 1, windowMs: 60_000, skip: (req) => req.headers['x-bypass'] === '1' }));
  app.get('/x', (_req, res) => res.json({ ok: true }));
  const { server, port } = await listen(app);
  try {
    await fetchRaw(port, '/x');
    await fetchRaw(port, '/x');
    const r = await fetchRaw(port, '/x', { 'x-bypass': '1' });
    assert.equal(r.status, 200);
  } finally { server.close(); }
});

test('rateLimit: prune drops expired buckets', () => {
  let t = 1_000_000;
  const limiter = rateLimitMiddleware({ max: 5, windowMs: 1000, now: () => t });
  const fakeReq = (k) => ({ ip: k, method: 'GET', baseUrl: '', path: '/' + k, headers: {}, socket: {} });
  const noop = () => {};
  const fakeRes = () => ({ setHeader: noop, status: () => ({ json: noop }) });
  for (let i = 0; i < 5; i++) limiter(fakeReq(`k${i}`), fakeRes(), noop);
  assert.equal(limiter.size(), 5);
  t += 5000;
  limiter.prune();
  assert.equal(limiter.size(), 0);
});

test('hardening: bootstrap mounts request-id + rate-limit on /api/compliance', async () => {
  const app = express();
  registerCompliance({
    app,
    hardening: { enabled: true, rateLimit: { max: 2, windowMs: 60_000 } },
  });
  const { server, port } = await listen(app);
  try {
    const r1 = await fetchRaw(port, '/api/compliance/healthz');
    assert.ok(r1.headers['x-request-id']);
    assert.equal(r1.headers['x-ratelimit-limit'], '2');
    await fetchRaw(port, '/api/compliance/healthz');
    const r3 = await fetchRaw(port, '/api/compliance/healthz');
    assert.equal(r3.status, 429);
  } finally { server.close(); }
});

test('hardening: disabled when not provided (no x-request-id header)', async () => {
  const app = express();
  registerCompliance({ app });
  const { server, port } = await listen(app);
  try {
    const r = await fetchRaw(port, '/api/compliance/healthz');
    assert.equal(r.headers['x-request-id'], undefined);
  } finally { server.close(); }
});
