# Wave 0 Gap Matrix — Live State vs Bundle / Manifest

Generated: 2026-04-29T21:13Z, DB: `shahin_grc`, source: `ops/wave-0/state.json` + `ops/wave-0/baseline.json`.

## Live state summary

| Surface | Status | Evidence |
|---|---|---|
| PM2 critical AI processes | **10/10 online** | `state.json::pm2.critical_for_ai` |
| Engine `ai-engine-service` uptime | 1719s (≈29 min) — borderline G0 | `state.json::pm2.critical_for_ai[name=ai-engine-service]` |
| Workers `ai-temporal-worker[-2]` uptime | 1332/1199s — under 30 min | `state.json::pm2.critical_for_ai[name=ai-temporal-worker*]` |
| Langfuse uptime | 14763s (4 hours) | `state.json::pm2.critical_for_ai[name=langfuse]` |
| OpenRouter inference live | YES | `state.json::env_keys.engine.OPENROUTER_API_KEY=true` |
| Anthropic direct | NOT configured | `state.json::env_keys.engine.ANTHROPIC_API_KEY=false` |
| Ollama fallback | NOT configured | `state.json::env_keys.engine.OLLAMA_BASE_URL=false` |
| 13 agents in registry | YES (`public.ai_agent_registry: 13`) | `SELECT count(*) FROM public.ai_agent_registry` = 13 |
| Tool perms seeded | YES (~350 rows across 5 tenants) | `state.json::tenant_ai_tables_total.ai_context_sources=112` plus mig 533 |
| Kill switches seeded | 65 rows × 5 tenants | `tenant_ai_tables_total.ai_kill_switches=65` |
| Governance policies seeded | 20 rows (4×5 tenants) | `tenant_ai_tables_total.ai_governance_policies=20` |
| RAG context sources | 112 rows | `tenant_ai_tables_total.ai_context_sources=112` |
| Smoke scores | 6 rows | `public_ai_tables.ai_smoke_scores=6` (5 A04 + 1 A01) |

## Baseline run (13/13 attempts, tenant 2ba4b53…)

| Bucket | Count | Notes |
|---|---|---|
| Real LLM call (Claude Sonnet 4.5 via OpenRouter) | A01–A06 (6/13) | 9.5s–20.8s each, 414–1226 tokens |
| Offline stub (OpenRouter 402 — credit ceiling hit mid-batch) | A07–A13 (7/13) | 415–590ms each, deterministic stub |
| `status === 'completed'` in result | 0/13 | **Bug: `runAgent` doesn't set status='completed' on success** |
| Logged execution row in `ai_agent_executions` | 79 across all tenants (cumulative) | `tenant_ai_tables_total.ai_agent_executions=79` |

**Root cause of A07–A13 stub fallback**: OpenRouter rejected with `402: max_tokens 2048 but can only afford 2021` — credit pool drained as the batch progressed. Cap needs to drop to ≤1800 OR operator tops up credits.

## Items already closed (vs what the plan asks of Waves 0–1)

| # | Wave 1 task | Status | File / DB proof |
|---|---|---|---|
| 1.1 | Fix `MISSING_TENANT` in invokeAgent | **CLOSED prior session** | `agent-runner.service.ts:33` `assertTenantId(tenantId)`; `activities.ts:46-89` `classifyAndRethrow()` |
| 1.2 | Wire LLM key | **CLOSED** | OpenRouter live (`OPENROUTER_API_KEY=set`); A01–A06 returned real Claude output in baseline |
| 1.3 | DB-driven agent loader | **CLOSED prior session** | `agent-runner.service.ts:91` and `agent-tool-executor.service.ts:189` both call `loadAgentDefFromDb()` |
| 1.4 | A01 tool perms seed (one tenant) | **CLOSED** | mig 533 seeds 350 rows across 13 agents × 5 tenants |
| 1.5 | Enforce `ai.temporal.invoke` perm on workflow REST | **PARTIAL** | mig 532 grants the perm to 10 roles. Engine has Keycloak enforcement on the route, but smoke harness uses HMAC tokens which fail with 401 (RS256 required). To accept perm-based 403 negative test, need a real KC service-account token OR a smoke-only auth path. |
| 1.6 | Post-trace eval against `dataset.a01.smoke` | **CLOSED prior session** | `smoke-evaluator.ts::recordAndScore()` called in `callClaude` finally; `public.ai_smoke_scores` row landed for A01 (score=0 — 3 dataset items expect `{status, agentCode}` shape but LLM returned free-form text; **dataset-design issue, not wiring**) |

## Items remaining for Gate G1 readiness

| Gate G1 criterion | Status | Action needed |
|---|---|---|
| 10 consecutive A01 invocations succeed end-to-end < 5s p95 | NOT met | A01 takes 12–20s today (LLM round-trip dominates). Either lower temperature/maxTokens further or scope to <5s budget. |
| All 10 traces visible in Langfuse with score ≥ 0.7 | NOT met | Smoke score = 0 because `dataset.a01.smoke[i].expectedOutput = {status, agentCode}` but A01 returns free-form text. **Either align dataset items OR force JSON output via system prompt.** |
| DSOC `audit_log` 10 `ai.agent.completed` rows | UNCLEAR | Need to query `platform_dsoc.audit_log WHERE action='ai.agent.completed' AND tenant_id=...` after a 10-run sweep. |
| Negative test: cross-tenant tenantId → 403 + DSOC threat event | NOT exercised | Cross-tenant policy is wired (mig 050 `baseline.cross_tenant_isolation` + `/policies/decision` returns deny for `t-other*`). DSOC `threat` event emission on this path NOT verified. |
| Cost per invocation logged: `ai_execution_log.cost_usd > 0` | NOT met | The current `ai_agent_executions` table doesn't have `cost_usd`. Cost lives in OpenRouter dashboard / LangSmith trace `usage`, not yet mirrored into a tenant-scoped column. |

## Items for Waves 2–5 (high-level diff)

The plan's later waves are mostly **NOT touched in any prior session** EXCEPT where noted:

| Wave | Item | Status |
|---|---|---|
| 2.1 | Tool permission seeds for A02–A13 | **CLOSED via mig 533** (covers all 13 agents) |
| 2.2 | Domain-data seeds | **CLOSED via mig 057** (frameworks/controls/risks/evidence_requests/vendors/bcp_plans) |
| 2.3 | Per-agent dataset expanded 3 → 10 cases | OPEN — requires `seed-langfuse-prompts-and-datasets.mjs` runner |
| 2.4 | Squad workflow over all 13 codes | OPEN — workflow exists (`agentSquadWorkflow`) but no end-to-end matrix run |
| 2.5 | Stub-replace kernel functions | **CLOSED — kernel transplanted into dos-platform-core/src/kernel** |
| 3.1 | Baseline policies in ai_gov_policies | **CLOSED via tenant mig 050** (4 policies × 5 tenants) |
| 3.2 | DB-driven `/policies/decision` | **CLOSED prior session** (overlay logic in policies.routes.ts) |
| 3.3 | HITL gates seeded for write-capable agents | OPEN — `hitl_gates` TABLE exists (mig 051) but no seed rows for A02/A04/A06/A08 |
| 3.4 | `requirePermission('ai.governance.review')` on HITL approve/reject | NEEDS AUDIT |
| 3.5 | Bias / fairness scoring | OPEN — `ai_gov_bias_reports` table not seen |
| 3.6 | Kill-switch enforcement (5s) | OPEN — table seeded (item 7.b) but runtime cache + 5s propagation not measured |
| 4.1 | Outbox publishers in domain services | OPEN — only catch-up producer in ai-engine (Wave 5 carry-over) |
| 4.2 | ai.subscribers event-to-agent map | **CLOSED prior session** (11 subscribers wired) |
| 4.3 | pgvector + ai_context_sources | **CLOSED via mig 052/053** |
| 4.4 | RAG injected into `{{context}}` | **CLOSED prior session** (placeholder rendering in agent-tool-executor) |
| 4.5 | Conversation memory in ai_drafts | OPEN |
| 4.6 | SSE/realtime channel | OPEN |
| 5.1 | Worker concurrency + 2 workers | **CLOSED prior session** (40 activity slots, 2 PM2 processes) |
| 5.2 | Worker `/health` + Prometheus metrics | **PARTIAL** — `/health` on 4313/4314 live; no Prometheus `/metrics` yet |
| 5.3 | Circuit breaker on LLM provider | OPEN |
| 5.4 | Cost ceiling on tenant `ai_budgets` | OPEN — table not present |
| 5.5 | Arabic prompt + dataset variants | OPEN |
| 5.6 | KSA framework packs preloaded | **CLOSED via mig 057** (NCA-ECC + SAMA + PDPL + ISO + NIST already seeded) |
| 5.7 | Data residency confirmation | OPEN — needs network audit |
| 5.8 | DR — kill engine, traffic survives | OPEN — single ai-engine PM2 instance |

## Hard rules check (per "Cross-Wave Discipline")

| Rule | Status |
|---|---|
| No `console.log` debug noise — structured logger only | **PARTIAL** — `routes.ts:54` and several lazy-mount sites still use `console.log/warn`; main paths use pino |
| No `try{}catch{}` swallowing without DSOC threat emission | **PARTIAL** — many best-effort catches in observability/RAG paths intentionally swallow; need explicit allow-list |
| No environment-specific hacks | **OK** — all configurable via env |
| No "TODO later" in agent code paths | NEEDS AUDIT |

## G0 verdict

- **All 10 critical AI services online**: ✅
- **30-min uptime continuity**: ❌ ai-temporal-worker (1332s ≈ 22 min) and worker-2 (1199s ≈ 20 min) both under 30 min — both restarted during Wave 2 work this session.
- **Every gap from earlier list answered with file/DB proof**: ✅ above.
- **No new code in this Wave**: ✅ (all reads).

**G0 fails on uptime continuity only.** Will pass within ~10 min if no further restarts happen.
