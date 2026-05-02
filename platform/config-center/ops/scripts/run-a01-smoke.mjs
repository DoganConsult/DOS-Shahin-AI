#!/usr/bin/env node
// Minimal A01 end-to-end smoke runner.
// Initializes the same EventBus + DB pool that ai-engine-service main.ts
// would set up, then invokes runAgent('A01', ...). Tracks the LangSmith
// trace and the smoke-dataset score posted by the post-trace evaluator.
//
// Usage:
//   ANTHROPIC_API_KEY=... or OPENROUTER_API_KEY=... node ops/scripts/run-a01-smoke.mjs <tenant-uuid> "<query>"

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const engineDir = path.join(repoRoot, 'platform/ai/services/ai-engine-service');

// Resolve modules from the engine's compiled dist tree.
const [moduleSdk, runtimeConfig, eventBackbone, agentRunner] = await Promise.all([
  import('@dos/module-sdk'),
  import('@dos/runtime-config'),
  import('@dos/event-backbone'),
  import(path.join(engineDir, 'dist/runtime/ai/services/agents/core/agent-runner.service.js')),
]);

const { setEventBus } = moduleSdk;
const { loadServiceConfig } = runtimeConfig;
const { createEventBackbone } = eventBackbone;
const { runAgent } = agentRunner;

// Mirror main.ts initSdkEventBus.
const config = loadServiceConfig('ai-engine-service');
const backbone = createEventBackbone({ redisUrl: config.redis.url, serviceCode: 'ai-engine-service' });
const afterPublishHandlers = new Map();
setEventBus({
  publish: async (event) => {
    const id = await backbone.publish(event.eventType, event.payload, {
      tenantId: event.tenantId,
      userId: event.userId,
      idempotencyKey: event.idempotencyKey || event.correlationId,
    });
    for (const h of afterPublishHandlers.values()) await h(event);
    return id;
  },
  subscribe: (eventType, subscriberId, handler) => {
    void subscriberId;
    backbone.subscribe(eventType, async (event) => {
      await handler({
        eventId: event.eventId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        userId: event.userId,
        payload: event.payload,
        timestamp: event.timestamp,
        sourceService: event.source,
      });
    });
  },
  onAfterPublish: (subscriberId, handler) => { afterPublishHandlers.set(subscriberId, handler); },
});

// Warm up @dos/db pool so safeQuery doesn't bork on first call.
const { getPool } = await import('@dos/db');
await getPool().query('SELECT 1');

const tenantId = process.argv[2] || '2ba4b532-3361-413c-ac6c-9c992f66bec4';
const query = process.argv[3] || 'List the top 3 cybersecurity frameworks active in this tenant and one priority control under each.';

console.log(`[a01-smoke] tenant=${tenantId}`);
console.log(`[a01-smoke] query=${query}`);

const t0 = Date.now();
let result;
try {
  result = await runAgent(tenantId, 'A01', { query, autonomyLevel: 0 });
} catch (err) {
  console.error(`[a01-smoke] runAgent threw: ${err?.message || err}`);
  process.exit(1);
}
const durationMs = Date.now() - t0;

console.log(`\n[a01-smoke] duration=${durationMs}ms status=${result?.status || 'unknown'}`);
console.log(`[a01-smoke] summary: ${(result?.summary || '').slice(0, 600)}`);
console.log(`[a01-smoke] actionsProposed=${result?.actionsProposed} actionsExecuted=${result?.actionsExecuted}`);
if (result?.usedTools?.length) console.log(`[a01-smoke] usedTools=${JSON.stringify(result.usedTools)}`);
if (result?.costUsd != null) console.log(`[a01-smoke] costUsd=${result.costUsd}`);

// Wait briefly for fire-and-forget LangSmith ingest + smoke-eval to complete.
await new Promise(r => setTimeout(r, 2500));
process.exit(0);
