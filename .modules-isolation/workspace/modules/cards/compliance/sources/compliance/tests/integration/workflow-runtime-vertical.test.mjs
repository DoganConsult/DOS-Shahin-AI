/**
 * W70 — /api/compliance/workflow-runtime vertical wiring tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { registerCompliance, WORKFLOW_STATUSES, findTransition } = require('../../dist/index.js');

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
  const defs = []; const insts = []; const trns = [];
  let dId = 0; let iId = 0; let tId = 0;
  return {
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('INSERT INTO') && s.includes('workflow_definitions')) {
        const row = {
          definition_id: `d-${++dId}`, workflow_code: p[0], version: p[1],
          definition: typeof p[2] === 'string' ? JSON.parse(p[2]) : p[2],
          created_at: new Date().toISOString(), created_by: p[3],
        };
        defs.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT definition_id') && s.includes('WHERE workflow_code =')) {
        const out = defs.filter((d) => d.workflow_code === p[0])
          .sort((a, b) => Number(b.version) - Number(a.version));
        return out.length ? { rows: [out[0]], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT definition_id') && s.includes('WHERE definition_id =')) {
        const m = defs.find((d) => d.definition_id === p[0]);
        return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT definition_id') && s.includes('WHERE 1=1')) {
        let out = defs.slice();
        if (s.includes('AND workflow_code =')) out = out.filter((d) => d.workflow_code === p[0]);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('workflow_definitions')) {
        let out = defs.slice();
        if (s.includes('AND workflow_code =')) out = out.filter((d) => d.workflow_code === p[0]);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('workflow_instances')) {
        const row = {
          instance_id: `i-${++iId}`, workflow_code: p[0], definition_id: p[1],
          entity_type: p[2], entity_id: p[3], current_state: p[4],
          status: 'active', context: typeof p[5] === 'string' ? JSON.parse(p[5]) : p[5],
          created_at: new Date().toISOString(), created_by: p[6],
          updated_at: new Date().toISOString(),
        };
        insts.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT instance_id') && s.includes('WHERE instance_id =')) {
        const m = insts.find((i) => i.instance_id === p[0]);
        return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (s.startsWith('SELECT instance_id') && s.includes('WHERE 1=1')) {
        let out = insts.slice(); let i = 0;
        if (s.includes('AND workflow_code =')) { out = out.filter((x) => x.workflow_code === p[i]); i++; }
        if (s.includes('AND entity_type =')) { out = out.filter((x) => x.entity_type === p[i]); i++; }
        if (s.includes('AND entity_id =')) { out = out.filter((x) => x.entity_id === p[i]); i++; }
        if (s.includes('AND status =')) { out = out.filter((x) => x.status === p[i]); i++; }
        if (s.includes('AND current_state =')) { out = out.filter((x) => x.current_state === p[i]); i++; }
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('workflow_instances')) {
        return { rows: [{ n: String(insts.length) }], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('workflow_instances') && s.includes("SET status = 'terminated'")) {
        const r = insts.find((x) => x.instance_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.status = 'terminated'; r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('UPDATE') && s.includes('workflow_instances') && s.includes('SET current_state')) {
        const r = insts.find((x) => x.instance_id === p[0]);
        if (!r) return { rows: [], rowCount: 0 };
        r.current_state = p[1];
        r.context = { ...(r.context ?? {}), ...(typeof p[2] === 'string' ? JSON.parse(p[2]) : p[2]) };
        r.updated_at = new Date().toISOString();
        return { rows: [r], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO') && s.includes('workflow_transitions')) {
        const row = {
          transition_id: `t-${++tId}`, instance_id: p[0],
          from_state: p[1], to_state: p[2], event: p[3],
          applied_at: new Date().toISOString(), applied_by: p[4],
          context: typeof p[5] === 'string' ? JSON.parse(p[5]) : p[5],
        };
        trns.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('SELECT transition_id')) {
        const out = trns.filter((t) => t.instance_id === p[0]);
        return { rows: out, rowCount: out.length };
      }
      if (s.startsWith('SELECT COUNT(*)::text AS n FROM') && s.includes('workflow_transitions')) {
        const out = trns.filter((t) => t.instance_id === p[0]);
        return { rows: [{ n: String(out.length) }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    _defs: defs, _insts: insts, _trns: trns,
  };
}

function buildApp({ hasPermission, permissions } = {}) {
  const app = express(); app.use(express.json());
  const client = makeClient();
  registerCompliance({
    app,
    workflowRuntimeDeps: {
      client,
      resolveContext: () => ({
        tenantId: 't1', userId: 'u1', tenantSchema: 'tenant_t1',
        hasPermission, permissions: permissions ?? [],
      }),
    },
  });
  return { app, client };
}

const SAMPLE_DEF = {
  initial: 'draft',
  states: ['draft', 'submitted', 'approved', 'rejected'],
  transitions: [
    { from: 'draft', event: 'submit', to: 'submitted' },
    { from: 'submitted', event: 'approve', to: 'approved', requiresPermission: 'compliance.approve' },
    { from: 'submitted', event: 'reject', to: 'rejected' },
  ],
};

test('WORKFLOW_STATUSES + findTransition exposed', () => {
  assert.deepEqual(WORKFLOW_STATUSES.slice().sort(), ['active', 'terminated']);
  const r = findTransition(SAMPLE_DEF, 'draft', 'submit');
  assert.equal(r.to, 'submitted');
  assert.equal(findTransition(SAMPLE_DEF, 'draft', 'nope'), null);
});

test('GET requires permission workflow.read', async () => {
  const { app } = buildApp({ hasPermission: () => false });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/workflow-runtime/definitions');
  server.close();
  assert.equal(r.status, 403);
});

test('POST requires permission workflow.write', async () => {
  const { app } = buildApp({ hasPermission: (k) => k === 'workflow.read' });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  server.close();
  assert.equal(r.status, 403);
});

test('POST definition with bad definition → 400 bad_definition', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf',
    definition: { initial: 'X', states: ['draft'], transitions: [] },
  });
  server.close();
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_definition');
});

test('POST definition + start instance + trigger transition', async () => {
  const { app } = buildApp({ hasPermission: () => true, permissions: ['compliance.approve'] });
  const { server, port } = await listen(app);
  const def = await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  assert.equal(def.status, 201);
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'finding', entityId: 'f-1',
  });
  assert.equal(inst.status, 201);
  assert.equal(inst.body.data.currentState, 'draft');
  const t1 = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', {
    event: 'submit',
  });
  assert.equal(t1.body.data.transition.toState, 'submitted');
  assert.equal(t1.body.data.instance.currentState, 'submitted');
  const t2 = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', {
    event: 'approve',
  });
  server.close();
  assert.equal(t2.body.data.transition.toState, 'approved');
});

test('trigger without requiresPermission → 403 forbidden', async () => {
  const { app } = buildApp({ hasPermission: () => true, permissions: [] });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'submit' });
  const r = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'approve' });
  server.close();
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'forbidden');
});

test('trigger with no matching rule → 409 no_transition', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  const r = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'approve' });
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'no_transition');
});

test('start instance with unknown workflowCode → 404 not_found', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  const r = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'mystery', entityType: 'f', entityId: 'f1',
  });
  server.close();
  assert.equal(r.status, 404);
});

test('terminate sets status=terminated', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  const r = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/terminate`, 'POST', {});
  server.close();
  assert.equal(r.body.data.status, 'terminated');
});

test('trigger on terminated → 409 bad_state', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/terminate`, 'POST', {});
  const r = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'submit' });
  server.close();
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'bad_state');
});

test('GET transitions returns history', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  const inst = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'submit' });
  await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/trigger`, 'POST', { event: 'reject' });
  const r = await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst.body.data.instanceId}/transitions`);
  server.close();
  assert.equal(r.body.meta.total, 2);
  assert.equal(r.body.data[0].event, 'submit');
  assert.equal(r.body.data[1].event, 'reject');
});

test('GET instances with status filter', async () => {
  const { app } = buildApp({ hasPermission: () => true });
  const { server, port } = await listen(app);
  await fetchJson(port, '/api/compliance/workflow-runtime/definitions', 'POST', {
    workflowCode: 'wf', definition: SAMPLE_DEF,
  });
  await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f1',
  });
  const inst2 = await fetchJson(port, '/api/compliance/workflow-runtime/instances', 'POST', {
    workflowCode: 'wf', entityType: 'f', entityId: 'f2',
  });
  await fetchJson(port, `/api/compliance/workflow-runtime/instances/${inst2.body.data.instanceId}/terminate`, 'POST', {});
  const r = await fetchJson(port, '/api/compliance/workflow-runtime/instances?status=active');
  server.close();
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].status, 'active');
});
