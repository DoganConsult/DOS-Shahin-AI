# Gate G1 — Final Verdict

Run: 2026-04-29T21:30Z, tenant `2ba4b532-3361-413c-ac6c-9c992f66bec4`, model `anthropic/claude-haiku-4.5` via OpenRouter, max_tokens=512.

| Acceptance criterion | Target | Actual | Status |
|---|---|---|---|
| 10 consecutive A01 invocations succeed end-to-end | 10/10 | **10/10 completed** | ✅ |
| p95 < 5s | < 5000ms | **3346ms** (p50=1922ms) | ✅ |
| All 10 traces in Langfuse with score ≥ 0.7 | 10/10 ≥ 0.7 | **10/10 ≥ 0.7** in `public.ai_smoke_scores` | ✅ |
| `ai_agent_executions` rows persisted | 10 | **10/10 with status=completed** | ✅ |
| Negative test: cross-tenant tenantId → deny | deny | **deny + POL.TENANT.ISOLATION** | ✅ |
| DSOC `audit_log` has 10 `ai.agent.completed` rows | 10 | **0** (`platform_dsoc.audit_log` empty for 24h+) | ❌ |
| Cost per invocation logged: `cost_usd > 0` | > 0 | **0 everywhere** (cost not yet plumbed into runAgent) | ❌ |

**Gate G1: 5/7 criteria PASS, 2 known gaps.**

## Carry-overs (Wave 5 territory)

### G1.6 — DSOC audit pipeline not writing
- DSOC bridge IS installed: worker logs `[ai-os-temporal-worker] DSOC audit bridge wired (15 subscribers)`.
- Bridge re-emits `ai.*` → `dsoc.audit.*` via Redis backbone.
- BUT `SELECT count(*) FROM platform_dsoc.audit_log WHERE recorded_at > NOW() - INTERVAL '24 hours'` = 0.
- Either the dsoc-service consumer for `dsoc.audit.*` events isn't running, or the subscriber isn't matching the event type, or the INSERT path is failing silently.
- **Owner:** dsoc-service (separate from ai-engine).

### G1.7 — `cost_usd` not plumbed
- OpenRouter returns `usage.prompt_tokens` + `usage.completion_tokens` per call, but no $ figure.
- LangSmith trace stores token usage; `recordLlmRun()` captures it.
- `runAgent` returns `costUsd: 0` because `toolResult.costUsd` is never set.
- **Fix path:** sum LLM tokens × per-million-token rate (model-specific) and bubble through `agent-tool-executor` → `toolResult.costUsd` → `AgentRunResult.costUsd`. Estimated 1-hour change.

## What this means for Wave 1

The Wave 1 closure shipped:
- Status flowing correctly (`status: 'completed'`)
- Real LLM call (Claude Haiku 4.5 via OpenRouter)
- Smoke evaluator scoring agent-contract output (10/10 ≥ 0.7)
- `ai_agent_executions` writing `completed` rows
- Cross-tenant deny working via DB-driven `/policies/decision`
- p95 well under 5s

The two remaining items are independent of Wave 1's "make A01 work" goal — they're observability (DSOC) and FinOps (cost) plumbing that belong in Wave 5.

## Recommendation

- **Promote to Wave 2** (replicate to A02–A13) with the two carry-overs added to a Wave 5 risk register.
- DSOC bridge needs a separate read-only investigation before any further events are wired (otherwise we'll keep depending on a write path that isn't writing).
