/**
 * W79 — /api/compliance/rate-limit-policies* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  RATE_LIMIT_SUBJECT_KINDS,
  rateLimitWindowStartFor,
} = require('../../dist/index.js');

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
  const policies = [];
  const counters = [];
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // Policies
      if (s.startsWith('SELECT policy_code') && s.includes('rate_limit_policies') && s.includes('WHERE policy_code = $1')) {
        const x = policies.find((r) => r.policy_code === p[0]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT policy_code') && s.includes('rate_limit_policies') && s.includes('WHERE 1=1')) {
        let out = policies.slice(); let i = 0;
        if (s.includes('AND subject_kind =')) { out = out.filter((r) => r.subject_kind === p[i]); i++; }
        out.sort((a, b) => a.policy_code < b.policy_code ? -1 : 1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('rate_limit_policies')) {
        let out = policies.slice(); let i = 0;
        if (s.includes('AND subject_kind =')) { out = out.filter((r) => r.subject_kind === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('rate_limit_policies')) {
        const code = p[0];
        const idx = policies.findIndex((r) => r.policy_code === code);
        const x = {
          policy_code: code, subject_kind: p[1], window_seconds: p[2],
          max_requests: p[3], metadata: JSON.parse(p[4]),
          created_at: idx >= 0 ? policies[idx].created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(), updated_by: p[5],
        };
        if (idx >= 0) policies[idx] = x; else policies.push(x);
        return { rows: [x], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('rate_limit_policies') && s.includes('WHERE policy_code = $1')) {
        const idx = policies.findIndex((r) => r.policy_code === p[0]);
        if (idx >= 0) { policies.splice(idx, 1); return { rows: [], rowCount: 1 }; }
        return { rows: [], rowCount: 0 };
      }
      // Counters
      if (s.startsWith('INSERT INTO') && s.includes('rate_limit_counters')) {
        const key = `${p[0]}|${p[1]}|${p[2]}`;
        let x = counters.find((c) => `${c.policy_code}|${c.subject_id}|${c.window_started_at}` === key);
        if (!x) {
          x = { policy_code: p[0], subject_id: p[1], window_started_at: p[2], counter: Number(p[3]) };
          counters.push(x);
        } else {
          x.counter += Number(p[3]);
        }
        return { rows: [x], rowCount: 1 };
      }
      if (s.startsWith('SELECT policy_code, subject_id, window_started_at, counter') && s.includes('rate_limit_counters')) {
        const x = counters.find((c) => c.policy_code === p[0] && c.subject_id === p[1] && c.window_started_at === p[2]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('rate_limit_counters')) {
        const factor = Number(p[0]);
        const cutoff = Date.parse(p[1]);
        let removed = 0;
        for (let i = counters.length - 1; i >= 0; i--) {
          const c = counters[i];
          const pol = policies.find((q) => q.policy_code === c.policy_code);
          if (!pol) continue;
          const expiry = Date.parse(c.window_started_at) + Number(pol.window_seconds) * 1000 * factor;
          if (expiry < cutoff) { counters.splice(i, 1); removed++; }
        }
        return { rows: [], rowCount: removed };
      }
      return { rows: [], rowCount: 0 };
    },
    _policies: policies,
    _counters: counters,
  };
}

function buildApp({ hasPermission } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    rateLimitPoliciesDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('RATE_LIMIT_SUBJECT_KINDS exposed', () => {
  for (const k of ['user', 'api_key', 'ip', 'global']) {
    assert.ok(RATE_LIMIT_SUBJECT_KINDS.includes(k));
  }
});

test('rateLimitWindowStartFor floors to window', () => {
  const now = new Date('2026-01-01T00:01:30Z');
  const start = rateLimitWindowStartFor(now, 60);
  assert.equal(start.toISOString(), '2026-01-01T00:01:00.000Z');
});

test('GET requires rate_limit.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires rate_limit.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'rate_limit.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 10,
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing policyCode → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    subjectKind: 'user', windowSeconds: 60, maxRequests: 10,
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST bad subjectKind → 400 bad_subject_kind', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'bogus', windowSeconds: 60, maxRequests: 10,
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_subject_kind');
});

test('POST windowSeconds<=0 → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 0, maxRequests: 10,
  });
  server.close();
  assert.equal(r.status, 400);
});

test('POST upserts a policy', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 5,
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.policyCode, 'p');
  assert.equal(client._policies.length, 1);
});

test('consume increments counter and returns 200 when allowed', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 3,
  });
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', {
    subjectId: 'u-a',
  });
  server.close();
  assert.equal(r.status, 200);
  assert.equal(r.body.data.allowed, true);
  assert.equal(r.body.data.counter, 1);
  assert.equal(r.body.data.max, 3);
});

test('consume returns 429 when exceeded', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 2,
  });
  await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', { subjectId: 'u' });
  await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', { subjectId: 'u' });
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', { subjectId: 'u' });
  server.close();
  assert.equal(r.status, 429);
  assert.equal(r.body.data.allowed, false);
  assert.equal(r.body.data.counter, 3);
});

test('consume requires rate_limit.consume permission', async () => {
  const { app } = buildApp({ hasPermission: (k) => k !== 'rate_limit.consume' });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 1,
  });
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', { subjectId: 'u' });
  server.close();
  assert.equal(r.status, 403);
});

test('check is read-only and reflects counter state', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 2,
  });
  await fetchJson(port, '/api/compliance/rate-limit-policies/p/consume', 'POST', { subjectId: 'u' });
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/p/check', 'POST', { subjectId: 'u' });
  server.close();
  assert.equal(r.body.data.counter, 1);
  assert.equal(r.body.data.allowed, true);
});

test('check unknown policy → 404', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/nope/check', 'POST', { subjectId: 'u' });
  server.close();
  assert.equal(r.status, 404);
});

test('DELETE removes; GET 404 after delete', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 60, maxRequests: 2,
  });
  const d = await fetchJson(port, '/api/compliance/rate-limit-policies/p', 'DELETE');
  const g = await fetchJson(port, '/api/compliance/rate-limit-policies/p');
  server.close();
  assert.equal(d.status, 204);
  assert.equal(g.status, 404);
});

test('purge removes expired counters', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/rate-limit-policies', 'POST', {
    policyCode: 'p', subjectKind: 'user', windowSeconds: 1, maxRequests: 100,
  });
  // seed an old window
  client._counters.push({
    policy_code: 'p', subject_id: 'u', counter: 1,
    window_started_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  });
  const r = await fetchJson(port, '/api/compliance/rate-limit-policies/purge', 'POST', {});
  server.close();
  assert.equal(r.body.data.deleted, 1);
});
