/**
 * W74 — /api/compliance/scheduled-jobs* vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, SCHEDULED_JOB_RUN_STATUSES, isScheduledJobDue } =
  require('../../dist/index.js');

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
  const jobs = [];
  const runs = [];
  let runSeq = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // SCHEDULED_JOBS reads
      if (s.startsWith('SELECT job_code, interval_seconds') && s.includes('WHERE job_code = $1')) {
        const j = jobs.find((x) => x.job_code === p[0]);
        return j ? { rows: [j], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT job_code, interval_seconds') && s.includes('WHERE 1=1')) {
        let out = jobs.slice(); let i = 0;
        if (s.includes('AND enabled =')) { out = out.filter((r) => !!r.enabled === !!p[i]); i++; }
        out.sort((a, b) => a.job_code.localeCompare(b.job_code));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT job_code, interval_seconds') && s.includes('WHERE enabled = $1')) {
        let out = jobs.filter((r) => !!r.enabled === !!p[0]);
        if (s.includes('AND job_code =')) out = out.filter((r) => r.job_code === p[1]);
        out.sort((a, b) => a.job_code.localeCompare(b.job_code));
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('scheduled_jobs') && !s.includes('scheduled_job_runs')) {
        let out = jobs.slice(); let i = 0;
        if (s.includes('AND enabled =')) { out = out.filter((r) => !!r.enabled === !!p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // SCHEDULED_JOBS writes
      if (s.startsWith('INSERT INTO') && s.includes('scheduled_jobs') && s.includes('ON CONFLICT')) {
        let j = jobs.find((x) => x.job_code === p[0]);
        if (j) {
          j.interval_seconds = p[1];
          j.enabled = p[2];
        } else {
          j = {
            job_code: p[0], interval_seconds: p[1], enabled: p[2],
            last_run_at: null, last_status: null,
            created_at: new Date().toISOString(), created_by: p[3],
          };
          jobs.push(j);
        }
        return { rows: [j], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('scheduled_jobs') && s.includes('SET last_run_at')) {
        const j = jobs.find((x) => x.job_code === p[0]);
        if (j) { j.last_run_at = new Date().toISOString(); j.last_status = p[1]; }
        return { rows: j ? [j] : [], rowCount: j ? 1 : 0 };
      }
      // SCHEDULED_JOB_RUNS reads
      if (s.startsWith('SELECT run_id') && s.includes('WHERE 1=1')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND job_code =')) { out = out.filter((r) => r.job_code === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        out.sort((a, b) => a.started_at < b.started_at ? 1 : -1);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('scheduled_job_runs')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND job_code =')) { out = out.filter((r) => r.job_code === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      // SCHEDULED_JOB_RUNS write
      if (s.startsWith('INSERT INTO') && s.includes('scheduled_job_runs')) {
        runSeq++;
        const r = {
          run_id: `r${runSeq}`, job_code: p[0],
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          status: p[1], duration_ms: p[2], error: p[3], triggered_by: p[4],
        };
        runs.push(r);
        return { rows: [r], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _jobs: jobs,
    _runs: runs,
  };
}

function buildApp({ hasPermission, handlers } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    scheduledJobsRunnerDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1',
        hasPermission, handlers,
      }),
    },
  });
  return { app, client };
}

test('SCHEDULED_JOB_RUN_STATUSES exposed', () => {
  assert.deepEqual(
    SCHEDULED_JOB_RUN_STATUSES.slice().sort(),
    ['failed', 'skipped', 'succeeded'],
  );
});

test('isScheduledJobDue: never run → due', () => {
  assert.equal(
    isScheduledJobDue({
      jobCode: 'x', intervalSeconds: 60, enabled: true,
      lastRunAt: null, lastStatus: null,
      createdAt: new Date().toISOString(), createdBy: 'u',
    }, new Date()),
    true,
  );
});

test('isScheduledJobDue: disabled → not due', () => {
  assert.equal(
    isScheduledJobDue({
      jobCode: 'x', intervalSeconds: 60, enabled: false,
      lastRunAt: null, lastStatus: null,
      createdAt: new Date().toISOString(), createdBy: 'u',
    }, new Date()),
    false,
  );
});

test('isScheduledJobDue: within interval → not due', () => {
  const now = new Date('2026-01-01T01:00:00Z');
  assert.equal(
    isScheduledJobDue({
      jobCode: 'x', intervalSeconds: 3600, enabled: true,
      lastRunAt: '2026-01-01T00:30:00Z', lastStatus: 'succeeded',
      createdAt: '', createdBy: 'u',
    }, now),
    false,
  );
});

test('GET /scheduled-jobs requires scheduled_jobs.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /scheduled-jobs requires scheduled_jobs.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'scheduled_jobs.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST missing jobCode → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    intervalSeconds: 60,
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST intervalSeconds<=0 → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 0,
  });
  server.close();
  assert.equal(r.status, 400);
});

test('POST upserts a job', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.jobCode, 'j1');
  assert.equal(client._jobs.length, 1);
});

test('POST same jobCode updates intervalSeconds (upsert)', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 120,
  });
  server.close();
  assert.equal(client._jobs.length, 1);
  assert.equal(Number(client._jobs[0].interval_seconds), 120);
});

test('POST /run with handler succeeded path', async () => {
  let called = 0;
  const { app, client } = buildApp({
    hasPermission: () => true,
    handlers: { j1: () => { called++; } },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs-runner/run', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.scanned, 1);
  assert.equal(r.body.data.succeeded, 1);
  assert.equal(called, 1);
  assert.equal(client._runs.length, 1);
  assert.equal(client._runs[0].status, 'succeeded');
});

test('POST /run handler throwing → status=failed', async () => {
  const { app, client } = buildApp({
    hasPermission: () => true,
    handlers: { j1: () => { throw new Error('boom'); } },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs-runner/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.failed, 1);
  assert.equal(client._runs[0].status, 'failed');
  assert.equal(client._runs[0].error, 'boom');
});

test('POST /run with no handler → status=skipped', async () => {
  const { app, client } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs-runner/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.skipped, 1);
  assert.equal(client._runs[0].status, 'skipped');
});

test('GET /scheduled-jobs/:code 404 when missing', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/scheduled-jobs/nope');
  server.close();
  assert.equal(r.status, 404);
});

test('GET /scheduled-jobs-runs filters by status', async () => {
  const { app } = buildApp({
    hasPermission: () => true,
    handlers: { j1: () => {}, j2: () => { throw new Error('x'); } },
  });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j1', intervalSeconds: 60,
  });
  await fetchJson(port, '/api/compliance/scheduled-jobs', 'POST', {
    jobCode: 'j2', intervalSeconds: 60,
  });
  await fetchJson(port, '/api/compliance/scheduled-jobs-runner/run', 'POST', {});
  const ok = await fetchJson(port, '/api/compliance/scheduled-jobs-runs?status=succeeded');
  const bad = await fetchJson(port, '/api/compliance/scheduled-jobs-runs?status=failed');
  server.close();
  assert.equal(ok.body.data.length, 1);
  assert.equal(ok.body.data[0].jobCode, 'j1');
  assert.equal(bad.body.data.length, 1);
  assert.equal(bad.body.data[0].jobCode, 'j2');
});
