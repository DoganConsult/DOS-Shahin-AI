/**
 * W77 — /api/compliance/feature-flags* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  FEATURE_FLAG_REASONS,
  featureFlagBucket,
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

function makeClient(initial = []) {
  const rows = initial.slice();
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT flag_code') && s.includes('WHERE flag_code = $1')) {
        const x = rows.find((r) => r.flag_code === p[0]);
        return x ? { rows: [x], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT flag_code') && s.includes('WHERE 1=1')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND enabled =')) { out = out.filter((r) => r.enabled === p[i]); i++; }
        out.sort((a, b) => a.flag_code < b.flag_code ? -1 : 1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('feature_flags')) {
        let out = rows.slice(); let i = 0;
        if (s.includes('AND enabled =')) { out = out.filter((r) => r.enabled === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('feature_flags')) {
        const code = p[0];
        const existingIdx = rows.findIndex((r) => r.flag_code === code);
        const x = {
          flag_code: code,
          enabled: p[1],
          rollout_percent: p[2],
          allowed_users: JSON.parse(p[3]),
          denied_users: JSON.parse(p[4]),
          metadata: JSON.parse(p[5]),
          created_at: existingIdx >= 0 ? rows[existingIdx].created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: p[6],
        };
        if (existingIdx >= 0) rows[existingIdx] = x; else rows.push(x);
        return { rows: [x], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM') && s.includes('feature_flags')) {
        const idx = rows.findIndex((r) => r.flag_code === p[0]);
        if (idx >= 0) { rows.splice(idx, 1); return { rows: [], rowCount: 1 }; }
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    _rows: rows,
  };
}

function buildApp({ hasPermission, initial, userId } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient(initial);
  registerCompliance({
    app,
    featureFlagsDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: userId ?? 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('FEATURE_FLAG_REASONS exposes all reason codes', () => {
  assert.ok(Array.isArray(FEATURE_FLAG_REASONS));
  for (const r of ['unknown', 'disabled', 'denied', 'allowed', 'rollout_zero', 'rollout_full', 'rollout_in', 'rollout_out']) {
    assert.ok(FEATURE_FLAG_REASONS.includes(r));
  }
});

test('featureFlagBucket is deterministic', () => {
  const a = featureFlagBucket('user-1', 'flag-x');
  const b = featureFlagBucket('user-1', 'flag-x');
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 100);
});

test('GET requires feature_flag.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires feature_flag.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'feature_flag.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true,
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing flagCode → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    enabled: true,
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST rolloutPercent out of range → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 150,
  });
  server.close();
  assert.equal(r.status, 400);
});

test('POST upserts a flag → 201', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 50,
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.flagCode, 'x');
  assert.equal(client._rows.length, 1);
});

test('evaluate unknown flag → enabled:false reason:unknown', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags/nope/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.enabled, false);
  assert.equal(r.body.data.reason, 'unknown');
});

test('evaluate disabled flag → reason:disabled', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: false,
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.enabled, false);
  assert.equal(r.body.data.reason, 'disabled');
});

test('evaluate denied user → reason:denied', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 100, deniedUsers: ['u1'],
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.enabled, false);
  assert.equal(r.body.data.reason, 'denied');
});

test('evaluate allowed user → reason:allowed', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 0, allowedUsers: ['u1'],
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.enabled, true);
  assert.equal(r.body.data.reason, 'allowed');
});

test('evaluate rollout_zero', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 0,
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.reason, 'rollout_zero');
});

test('evaluate rollout_full', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 100,
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x/evaluate?userId=u1');
  server.close();
  assert.equal(r.body.data.enabled, true);
  assert.equal(r.body.data.reason, 'rollout_full');
});

test('evaluate rollout_in vs rollout_out matches bucket', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true, rolloutPercent: 50,
  });
  const userId = 'user-deterministic';
  const r = await fetchJson(port, `/api/compliance/feature-flags/x/evaluate?userId=${userId}`);
  server.close();
  const expected = featureFlagBucket(userId, 'x') < 50 ? 'rollout_in' : 'rollout_out';
  assert.equal(r.body.data.reason, expected);
});

test('DELETE removes a flag', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/feature-flags', 'POST', {
    flagCode: 'x', enabled: true,
  });
  const r = await fetchJson(port, '/api/compliance/feature-flags/x', 'DELETE');
  server.close();
  assert.equal(r.status, 204);
  assert.equal(client._rows.length, 0);
});

test('DELETE missing → 404', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/feature-flags/nope', 'DELETE');
  server.close();
  assert.equal(r.status, 404);
});
