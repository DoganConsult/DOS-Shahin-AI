/**
 * W71 — /api/compliance/outbox-archive vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, ARCHIVE_RUN_STATUSES } = require('../../dist/index.js');

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

function makeClient({ scanCount = 0, copyDelta = 0, deleteDelta = 0, throwOnScan = false } = {}) {
  const runs = [];
  let id = 0;
  const state = { scanned: 0, archived: 0, deleted: 0 };
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('event_outbox') && !s.includes('event_outbox_archive')) {
        if (throwOnScan) throw new Error('scan db down');
        state.scanned++;
        return { rows: [{ n: String(scanCount) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('event_outbox_archive_runs')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('event_outbox_archive_runs')) {
        const row = {
          run_id: `ar-${++id}`, started_at: new Date(Date.now() + id).toISOString(),
          finished_at: null, status: 'partial', cutoff_iso: p[0],
          scanned: '0', archived: '0', deleted: '0', error: null, triggered_by: p[1],
        };
        runs.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('event_outbox_archive') && s.includes('SELECT')) {
        state.archived = scanCount + copyDelta;
        return { rows: [], rowCount: state.archived };
      }
      if (s.startsWith('DELETE FROM') && s.includes('event_outbox')) {
        state.deleted = scanCount + deleteDelta;
        return { rows: [], rowCount: state.deleted };
      }
      if (s.startsWith('UPDATE') && s.includes('event_outbox_archive_runs')) {
        const r = runs.find((x) => x.run_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = p[1]; r.scanned = String(p[2]);
        r.archived = String(p[3]); r.deleted = String(p[4]);
        r.error = p[5]; r.finished_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('SELECT run_id')) {
        let out = runs.slice(); let i = 0;
        if (s.includes('AND status =')) { out = out.filter((r) => r.status === p[i]); i++; }
        out = out.slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
        return { rows: out, rowCount: out.length };
      }
      return { rows: [], rowCount: 0 };
    },
    _runs: runs, _state: state,
  };
}

function buildApp({ hasPermission, scanCount, copyDelta, deleteDelta, throwOnScan } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient({ scanCount, copyDelta, deleteDelta, throwOnScan });
  registerCompliance({
    app,
    outboxArchiveDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1', hasPermission,
      }),
    },
  });
  return { app, client };
}

test('ARCHIVE_RUN_STATUSES exposed', () => {
  assert.deepEqual(ARCHIVE_RUN_STATUSES.slice().sort(), ['completed', 'failed', 'partial']);
});

test('GET requires permission event.archive.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive');
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run requires permission event.archive.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'event.archive.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  server.close();
  assert.equal(r.status, 403);
});

test('POST /run with olderThanDays<=0 → 400 bad_input', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', { olderThanDays: 0 });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_input');
});

test('POST /run with no eligible rows → completed status, zero counts', async () => {
  const { app } = buildApp({ hasPermission: () => true, scanCount: 0 });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  server.close();
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'completed');
  assert.equal(r.body.data.scanned, 0);
  assert.equal(r.body.data.archived, 0);
  assert.equal(r.body.data.deleted, 0);
});

test('POST /run archives + deletes equal count → completed', async () => {
  const { app } = buildApp({ hasPermission: () => true, scanCount: 5 });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', { olderThanDays: 7 });
  server.close();
  assert.equal(r.body.data.status, 'completed');
  assert.equal(r.body.data.scanned, 5);
  assert.equal(r.body.data.archived, 5);
  assert.equal(r.body.data.deleted, 5);
});

test('POST /run dryRun=true scans but does not write', async () => {
  const { app, client } = buildApp({ hasPermission: () => true, scanCount: 4 });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', { dryRun: true });
  server.close();
  assert.equal(r.body.data.scanned, 4);
  assert.equal(r.body.data.archived, 0);
  assert.equal(r.body.data.deleted, 0);
  assert.equal(client._state.archived, 0);
  assert.equal(client._state.deleted, 0);
});

test('POST /run partial when deleted < archived', async () => {
  const { app } = buildApp({ hasPermission: () => true, scanCount: 5, deleteDelta: -2 });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'partial');
  assert.equal(r.body.data.archived, 5);
  assert.equal(r.body.data.deleted, 3);
});

test('POST /run failed when scan throws', async () => {
  const { app } = buildApp({ hasPermission: () => true, throwOnScan: true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'failed');
  assert.match(r.body.data.error, /scan db down/);
});

test('GET list returns runs with status filter', async () => {
  const { app } = buildApp({ hasPermission: () => true, scanCount: 1 });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  await fetchJson(port, '/api/compliance/outbox-archive/run', 'POST', {});
  const all = await fetchJson(port, '/api/compliance/outbox-archive');
  const completed = await fetchJson(port, '/api/compliance/outbox-archive?status=completed');
  server.close();
  assert.equal(all.body.meta.total, 2);
  assert.equal(completed.body.meta.total, 2);
});
