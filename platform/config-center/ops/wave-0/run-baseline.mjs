#!/usr/bin/env node
// Wave 0.2 — Run all 13 agents through runAgent and capture per-agent
// status, duration, summary excerpt, error if any. Writes baseline.json.
//
// Same bootstrap pattern as run-a01-smoke.mjs (mirrors main.ts EventBus +
// DB pool init) so we can call runAgent without auth-gated REST.

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
await getPool().query('SELECT 1');

const tenantId = process.argv[2] || '2ba4b532-3361-413c-ac6c-9c992f66bec4';

const queries = {
  A01: 'List the top 3 cybersecurity frameworks active in this tenant and one priority control under each.',
  A02: 'Identify any users without MFA enrolment in this tenant.',
  A03: 'Compare NCA-ECC and ISO-27001 — show 2 controls that map across both.',
  A04: 'Draft a one-paragraph implementation note for control NCA-ECC-2-3 (Identity & Access Management).',
  A05: 'Summarise the open evidence requests by priority.',
  A06: 'Suggest a remediation order for the top 3 risks by score.',
  A07: 'Generate a 30-day audit prep checklist for ISO-27001.',
  A08: 'Identify any policy that has gone past its review_date.',
  A09: 'Flag tier_1 vendors with risk_score above 25.',
  A10: 'Map vendor "Cloud Hyperscaler — Region East" risks to controls.',
  A11: 'Show BCPs whose next_test_date is within 90 days.',
  A12: 'Suggest a quarterly governance dashboard for the board.',
  A13: 'In one sentence, explain what AI-OS does for visitors.',
};

const results = [];
for (const [code, query] of Object.entries(queries)) {
  const t0 = Date.now();
  let r, err;
  try { r = await runAgent(tenantId, code, { query, autonomyLevel: 0 }); }
  catch (e) { err = e?.message || String(e); }
  const dur = Date.now() - t0;
  results.push({
    agentCode: code,
    durationMs: dur,
    status: r?.status || (err ? 'failed' : 'unknown'),
    actionsProposed: r?.actionsProposed,
    actionsExecuted: r?.actionsExecuted,
    summarySnippet: (r?.summary || '').slice(0, 200),
    error: err,
  });
  console.log(`${code}: ${dur}ms status=${r?.status || (err ? 'failed' : 'unknown')} ${err ? '(error: ' + err.slice(0,80) + ')' : ''}`);
}

const out = {
  generated_at: new Date().toISOString(),
  tenantId,
  count: results.length,
  passed: results.filter(r => r.status === 'completed').length,
  failed: results.filter(r => r.status === 'failed').length,
  unknown: results.filter(r => r.status !== 'completed' && r.status !== 'failed').length,
  totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
  results,
};
fs.writeFileSync(path.join(__dirname, 'baseline.json'), JSON.stringify(out, null, 2));
console.log(`\nbaseline.json written: ${out.passed}/13 completed, ${out.failed} failed, ${out.unknown} unknown`);
process.exit(0);
