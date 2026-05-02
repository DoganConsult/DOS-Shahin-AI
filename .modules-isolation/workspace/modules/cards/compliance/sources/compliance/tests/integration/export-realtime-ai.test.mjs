/**
 * W7 — Export, Realtime SSE, AI router tests.
 *
 * Asserts the three router/service surfaces are mounted, behave correctly,
 * are tenant-safe, and respond honestly when dependencies are missing.
 *
 * Run: node --test tests/integration/export-realtime-ai.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const {
  registerCompliance,
  bindAiPort,
  publishRealtimeEvent,
} = require('../../dist/index.js');

function listen(app) {
  return new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r({ server: s, port: s.address().port }));
  });
}
function fetchJson(port, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1', port, path, method,
        headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
          resolve({ status: res.statusCode, body: json, raw, headers: res.headers });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function makeJobsClient() {
  const jobs = new Map();
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('INSERT INTO compliance_export_jobs')) {
        const [id, tenant_id, user_id, scope_type, format] = p;
        jobs.set(id, {
          id, tenant_id, user_id, scope_type, format, status: 'queued', progress: 0,
          query: JSON.parse(p[5]), result_url: null, error_code: null, error_message: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), finished_at: null,
        });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith("UPDATE compliance_export_jobs SET status='running'")) {
        const j = jobs.get(p[0]); if (j) { j.status = 'running'; j.updated_at = new Date().toISOString(); }
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('UPDATE compliance_export_jobs SET progress=')) {
        const j = jobs.get(p[0]); if (j) { j.progress = p[1]; j.updated_at = new Date().toISOString(); }
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith("UPDATE compliance_export_jobs SET status='succeeded'")) {
        const j = jobs.get(p[0]); if (j) {
          j.status = 'succeeded'; j.progress = 100; j.result_url = p[1];
          j.updated_at = new Date().toISOString(); j.finished_at = new Date().toISOString();
        }
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith("UPDATE compliance_export_jobs SET status='failed'")) {
        const j = jobs.get(p[0]); if (j) {
          j.status = 'failed'; j.error_code = p[1]; j.error_message = p[2];
          j.updated_at = new Date().toISOString(); j.finished_at = new Date().toISOString();
        }
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('SELECT id, tenant_id, user_id, scope_type, format, status, progress, query')) {
        const j = jobs.get(p[0]);
        return j ? { rows: [j], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    _jobs: jobs,
  };
}

function buildApp({ ctx = { tenantId: 't1', userId: 'u1' }, withExport = false, withRealtime = false, withAi = false } = {}) {
  const app = express(); app.use(express.json());
  const opts = { app };
  if (withExport) {
    const client = makeJobsClient();
    opts.exportDeps = {
      client,
      resolveContext: () => ctx,
      emitters: {
        obligations: async ({ format, onProgress }) => {
          if (onProgress) { onProgress(50); onProgress(99); }
          return { contentType: format === 'csv' ? 'text/csv' : 'application/json', body: 'id,title\n1,obl-1\n', filename: `obligations.${format}` };
        },
      },
      upload: async (jobId) => `https://artifacts.local/${jobId}`,
      runAsync: (fn) => fn(),
    };
    opts._client = client;
  }
  if (withRealtime) opts.realtimeDeps = { resolveContext: () => ctx };
  if (withAi) opts.aiDeps = { resolveContext: () => ctx };
  registerCompliance(opts);
  return { app, _client: opts._client };
}

// ── Export ─────────────────────────────────────────────────────────────────
test('POST /export/single returns body inline with content-disposition', async () => {
  const { app } = buildApp({ withExport: true });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/export/single', 'POST', {
      scopeType: 'obligations', format: 'csv', query: {},
    });
    assert.equal(r.status, 200);
    assert.match(r.headers['content-disposition'] || '', /obligations\.csv/);
    assert.match(r.raw, /id,title/);
  } finally { server.close(); }
});

test('POST /export/single rejects unknown emitter with 404', async () => {
  const { app } = buildApp({ withExport: true });
  const { server, port } = await listen(app);
  try {
    const r = await fetchJson(port, '/api/compliance/export/single', 'POST', {
      scopeType: 'unknown-scope', format: 'csv',
    });
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'no_emitter');
  } finally { server.close(); }
});

test('POST /export/async creates job, finishes succeeded, supports download redirect', async () => {
  const { app, _client } = buildApp({ withExport: true });
  const { server, port } = await listen(app);
  try {
    const start = await fetchJson(port, '/api/compliance/export/async', 'POST', {
      scopeType: 'obligations', format: 'json',
    });
    assert.equal(start.status, 202);
    const id = start.body.data.id;
    const status = await fetchJson(port, `/api/compliance/export/jobs/${id}`);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.status, 'succeeded');
    assert.equal(status.body.data.progress, 100);
    assert.match(status.body.data.resultUrl, /artifacts\.local/);
    const dl = await fetchJson(port, `/api/compliance/export/jobs/${id}/download`);
    assert.ok(dl.status === 302 || dl.status === 301);
  } finally { server.close(); }
});

test('export jobs are tenant-scoped (other tenant cannot read)', async () => {
  const { app, _client } = buildApp({ withExport: true, ctx: { tenantId: 't1', userId: 'u1' } });
  const { server, port } = await listen(app);
  // Tenant 1 starts a job
  const start = await fetchJson(port, '/api/compliance/export/async', 'POST', { scopeType: 'obligations', format: 'csv' });
  const jobId = start.body.data.id;
  server.close();

  // New app with same client but different tenant resolver
  const app2 = express(); app2.use(express.json());
  registerCompliance({
    app: app2,
    exportDeps: { client: _client, resolveContext: () => ({ tenantId: 't2', userId: 'u9' }), emitters: {} },
  });
  const s2 = await listen(app2);
  try {
    const r = await fetchJson(s2.port, `/api/compliance/export/jobs/${jobId}`);
    assert.equal(r.status, 404, 'cross-tenant read must fail');
  } finally { s2.server.close(); }
});

// ── Realtime ───────────────────────────────────────────────────────────────
test('SSE: subscriber receives published events; cross-tenant isolation holds', async () => {
  const { app: appA } = buildApp({ withRealtime: true, ctx: { tenantId: 'tA', userId: 'u1' } });
  const a = await listen(appA);
  const { app: appB } = buildApp({ withRealtime: true, ctx: { tenantId: 'tB', userId: 'u2' } });
  const b = await listen(appB);

  const collect = (port) => new Promise((resolve, reject) => {
    const chunks = [];
    const req = http.request({ host: '127.0.0.1', port, path: '/api/compliance/events/obligations', method: 'GET' }, (res) => {
      res.on('data', (c) => {
        chunks.push(c);
        if (Buffer.concat(chunks).toString('utf8').split('\n\n').filter(Boolean).length >= 2) {
          req.destroy();
          resolve(Buffer.concat(chunks).toString('utf8'));
        }
      });
      res.on('error', reject);
    });
    req.on('error', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.end();
  });

  try {
    const pA = collect(a.port);
    const pB = collect(b.port);
    // Wait briefly for subscribers to register
    await new Promise((r) => setTimeout(r, 60));
    publishRealtimeEvent({ tenantId: 'tA', scopeType: 'obligations', type: 'created', payload: { id: 'o1' } });
    publishRealtimeEvent({ tenantId: 'tB', scopeType: 'obligations', type: 'updated', payload: { id: 'o2' } });
    const [bodyA, bodyB] = await Promise.all([pA, pB]);
    assert.match(bodyA, /event: created/);
    assert.match(bodyA, /"id":"o1"/);
    assert.ok(!/o2/.test(bodyA), 'tenant A must not receive tenant B events');
    assert.match(bodyB, /event: updated/);
    assert.match(bodyB, /"id":"o2"/);
    assert.ok(!/o1/.test(bodyB), 'tenant B must not receive tenant A events');
  } finally {
    a.server.close(); b.server.close();
  }
});

// ── AI ─────────────────────────────────────────────────────────────────────
test('AI endpoints return 503 when port unbound', async () => {
  bindAiPort({
    suggest: async () => { throw new Error('[compliance] ai port not bound: bindAiPort() before using suggest'); },
    interpretQuery: async () => { throw new Error('[compliance] ai port not bound: bindAiPort() before using interpretQuery'); },
    classify: async () => { throw new Error('[compliance] ai port not bound: bindAiPort() before using classify'); },
  });
  const { app } = buildApp({ withAi: true });
  const { server, port } = await listen(app);
  try {
    const s = await fetchJson(port, '/api/compliance/ai/suggestions/list', 'POST', { scopeType: 'obligations' });
    assert.equal(s.status, 503);
    assert.equal(s.body.error.code, 'ai_unavailable');
  } finally { server.close(); }
});

test('AI endpoints return data when port is bound', async () => {
  bindAiPort({
    suggest: async () => [{ id: 's1', title: 't', rationale: 'r', confidence: 0.9 }],
    interpretQuery: async () => ({ filter: { status: 'open' }, explain: 'x' }),
    classify: async () => ({ label: 'pii', confidence: 0.7 }),
  });
  const { app } = buildApp({ withAi: true });
  const { server, port } = await listen(app);
  try {
    const s = await fetchJson(port, '/api/compliance/ai/suggestions/list', 'POST', { scopeType: 'obligations' });
    assert.equal(s.status, 200);
    assert.equal(s.body.data[0].id, 's1');

    const i = await fetchJson(port, '/api/compliance/ai/query/interpret', 'POST', { scopeType: 'obligations', query: 'open ones' });
    assert.equal(i.status, 200);
    assert.deepEqual(i.body.data.filter, { status: 'open' });

    const c = await fetchJson(port, '/api/compliance/ai/classify', 'POST', { scopeType: 'obligations', text: 'hi', taxonomy: 'sensitivity' });
    assert.equal(c.status, 200);
    assert.equal(c.body.data.label, 'pii');
  } finally { server.close(); }
});
