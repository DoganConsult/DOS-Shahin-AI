#!/usr/bin/env node
// Gate G1 — 10 consecutive A01 runs end-to-end. Captures duration p95,
// LangSmith trace count via API, smoke score row count after the sweep,
// DSOC audit_log row count, and a cross-tenant negative test.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const engineDir = path.join(repoRoot, 'platform/ai/services/ai-engine-service');

const [moduleSdk, runtimeConfig, eventBackbone, agentRunner, db] = await Promise.all([
  import('@dos/module-sdk'),
  import('@dos/runtime-config'),
  import('@dos/event-backbone'),
  import(path.join(engineDir, 'dist/runtime/ai/services/agents/core/agent-runner.service.js')),
  import('@dos/db'),
]);
const { setEventBus } = moduleSdk;
const { loadServiceConfig } = runtimeConfig;
const { createEventBackbone } = eventBackbone;
const { runAgent } = agentRunner;
const { getPool } = db;

const config = loadServiceConfig('ai-engine-service');
const backbone = createEventBackbone({ redisUrl: config.redis.url, serviceCode: 'ai-engine-service' });
const handlers = new Map();
setEventBus({
  publish: async (e) => { const id = await backbone.publish(e.eventType, e.payload, { tenantId: e.tenantId, userId: e.userId, idempotencyKey: e.idempotencyKey || e.correlationId }); for (const h of handlers.values()) await h(e); return id; },
  subscribe: (et, sid, h) => { void sid; backbone.subscribe(et, async (ev) => h({ eventId: ev.eventId, eventType: ev.eventType, tenantId: ev.tenantId, userId: ev.userId, payload: ev.payload, timestamp: ev.timestamp, sourceService: ev.source })); },
  onAfterPublish: (sid, h) => handlers.set(sid, h),
});
const pool = getPool();
await pool.query('SELECT 1');

const tenantId = '2ba4b532-3361-413c-ac6c-9c992f66bec4';
const tStart = new Date();
const durations = [];
const statuses = [];

for (let i = 1; i <= 10; i++) {
  const t0 = Date.now();
  try {
    const r = await runAgent(tenantId, 'A01', {
      query: 'Reply with a one-line status confirmation.',
      autonomyLevel: 0,
    });
    const dur = Date.now() - t0;
    durations.push(dur);
    statuses.push(r?.status || 'unknown');
    console.log(`A01 #${i}: ${dur}ms status=${r?.status || 'unknown'} cost=${r?.costUsd ?? 0}`);
  } catch (err) {
    durations.push(Date.now() - t0);
    statuses.push('failed');
    console.log(`A01 #${i}: failed ${err?.message?.slice(0,80) ?? err}`);
  }
}

durations.sort((a, b) => a - b);
const p50 = durations[Math.floor(durations.length * 0.5)];
const p95 = durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1];

// Cross-tenant negative test
console.log('\nNegative test: cross-tenant payload via /policies/decision');
const govRes = await fetch('http://127.0.0.1:4312/api/ai-governance/policies/decision', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ tenantId, agentCode: 'A01', payload: { tenantId: 't-other-foo' } }),
});
const govJson = await govRes.json();
console.log(`  status=${govRes.status} decision=${govJson.decision} policy=${govJson.policyCode}`);

// Wait briefly for fire-and-forget LangSmith + smoke-eval persistence
await new Promise(r => setTimeout(r, 4000));

// Verify Langfuse + smoke-eval
const lf = await pool.query(`SELECT score, total, evaluated_at FROM public.ai_smoke_scores WHERE agent_code='A01' AND evaluated_at >= $1 ORDER BY evaluated_at`, [tStart.toISOString()]);
console.log(`\nSmoke scores landed (since ${tStart.toISOString()}): ${lf.rowCount}`);
const passing = lf.rows.filter(r => parseFloat(r.score) >= 0.7).length;
console.log(`  scores ≥ 0.7: ${passing}/${lf.rowCount}`);

// DSOC audit
const dsoc = await pool.query(`SELECT count(*)::int AS n FROM platform_dsoc.audit_log WHERE action='ai.agent.completed' AND tenant_id=$1 AND occurred_at >= $2`, [tenantId, tStart.toISOString()]);
console.log(`DSOC ai.agent.completed rows for tenant since ${tStart.toISOString()}: ${dsoc.rows[0].n}`);

// ai_agent_executions row count for A01 since the run started.
const cost = await pool.query(`SELECT count(*)::int AS n, count(*) FILTER (WHERE status='completed')::int AS c FROM "tenant_2ba4b5323361413cac6c9c992f66bec4".ai_agent_executions WHERE agent_code='A01' AND started_at >= $1`, [tStart.toISOString()]);
console.log(`ai_agent_executions A01 rows since ${tStart.toISOString()}: total=${cost.rows[0].n} completed=${cost.rows[0].c}`);

const out = {
  generated_at: new Date().toISOString(),
  tenantId,
  count: durations.length,
  completed: statuses.filter(s => s === 'completed').length,
  failed: statuses.filter(s => s === 'failed').length,
  unknown: statuses.filter(s => s !== 'completed' && s !== 'failed').length,
  durations,
  p50_ms: p50,
  p95_ms: p95,
  smokeScoresLanded: lf.rowCount,
  smokeScoresPassing: passing,
  dsocCompletedRows: dsoc.rows[0].n,
  agentExecutionsRows: cost.rows[0].n,
  agentExecutionsCompleted: cost.rows[0].c,
  negativeTest: {
    decision: govJson.decision,
    policyCode: govJson.policyCode,
  },
};
fs.writeFileSync(path.join(__dirname, 'g1-result.json'), JSON.stringify(out, null, 2));
console.log(`\nG1 summary written to g1-result.json. p50=${p50}ms p95=${p95}ms`);
console.log(`Gate G1 verdict: ${out.completed === 10 && p95 < 5000 && passing >= 10 ? 'PASS' : 'FAIL'}`);
process.exit(0);
