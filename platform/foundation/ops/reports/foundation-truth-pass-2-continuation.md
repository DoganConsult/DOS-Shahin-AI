# Foundation Truth Pass 2 — Continuation Session

**Pass**: Hard Enforcement continuation (same session, additional real fixes landed after the initial P2 report)
**Date**: 2026-04-21
**HEAD at start of continuation**: `26a5976b`
**Verdict**: still **NOT PASS** — but additional real progress landed against the documented remaining work.

---

## 1. What additional fixes landed in this continuation

All real implementations, all compile-gate green locally, no stubs, no excludes, no skip changes.

### 1.1 `@dos/event-backbone` — `publish()` widened to `(eventType, tenantId, payload, meta?)`

[packages/dos-event-backbone/src/singleton.ts](packages/dos-event-backbone/src/singleton.ts)

The legacy 3-arg positional `publish` is used by ~30 call sites; four of those (in `services/workflow-service/src/domain/engine/lifecycle/workflow-lifecycle-bridge.ts`) pass a fourth `meta` argument with `{ userId, moduleCode, entityType, entityId, category }`. The contract is now:

```ts
export async function publish(
  eventType: string,
  tenantId: string,
  payload: unknown,
  meta?: PublishMeta,   // { userId, moduleCode, entityType, entityId, category, … }
): Promise<string>;
```

The meta fields are merged into the payload (additive — no existing key is overwritten when the payload already declares one). `meta.userId` / `meta.idempotencyKey` are also promoted into the envelope. `PublishMeta` is exported so callers can type their call sites. Package rebuild exits 0.

### 1.2 `@dos/platform-core/lifecycle` — four missing canonical exports added

[packages/dos-platform-core/src/lifecycle/lifecycle.ts](packages/dos-platform-core/src/lifecycle/lifecycle.ts) now exports:

- `canTransition(moduleCode, entityType, from, to): boolean` — registry-backed FSM check (delegates to `isTransitionValid`, forbids self-transition).
- `performTransition(entityId, fromState, toState, moduleCode, entityType, opts?): Promise<TransitionResult>` — in-process FSM step with real `success`/`error`/`metadata` return.
- `getTransitionPermission(moduleCode, entityType, from, to): string | null` — reads `opts.transitionPermissions[from→to]` from the registered lifecycle definition.
- `TransitionResult` / `PerformTransitionOptions` types.

Package builds clean; `workflow-lifecycle-bridge.ts`'s four prior TS2305 errors on these imports now resolve.

### 1.3 workflow-service `utils/http-error.util.ts` — real re-export

Two callers in `workflow-service` expected the helper at different paths:

- [services/workflow-service/src/utils/http-error.util.ts](services/workflow-service/src/utils/http-error.util.ts) — authored; re-exports `toErrorMessage` from `@dos/types/errors`.
- [services/workflow-service/src/domain/utils/http-error.util.ts](services/workflow-service/src/domain/utils/http-error.util.ts) — authored; same re-export. Closes the path-drift in langgraph graph files.

### 1.4 workflow-service `domain/observability/logger.service.ts` — alias

[services/workflow-service/src/domain/observability/logger.service.ts](services/workflow-service/src/domain/observability/logger.service.ts) — thin `export * from './logger'` plus default. Closes the TS2307 on `../../observability/logger.service` in the event-emitter.

### 1.5 workflow-service `types.d.ts` — `@langchain/openai` ambient

[services/workflow-service/src/types.d.ts](services/workflow-service/src/types.d.ts) — added `declare module '@langchain/openai' { class ChatOpenAI }` matching the real surface used by `lm-studio-gate.activities.ts`. Optional peer, matches the json-rules-engine pattern.

### 1.6 workflow-service `workflow-actions.service.ts` — real notifications via event backbone

[services/workflow-service/src/domain/engine/actions/workflow-actions.service.ts](services/workflow-service/src/domain/engine/actions/workflow-actions.service.ts)

- `executeNotificationStep` now publishes `notification.created` on `@dos/event-backbone` — no dynamic import to a non-existent `modules/notification/services/notification.service.js`. `notification-inbox-service`'s subscriber owns persistence.
- `executeSendEmailNode` publishes `notification.email.requested` — no dynamic import to a non-existent `../../notifications/email.service.js`. `notification-service`'s subscriber resolves SMTP transport.
- Fixed the misrouted `../../../../utils/http-error.util` → `../../../utils/http-error.util` import path.

This is not a stub: the event names are the canonical ones, the payload shapes are the current notification contract, and failures surface through the existing `try { … } catch { toErrorMessage(err) }` flow.

---

## 2. Gate state

| Gate | Before this continuation | After this continuation |
|---|---|---|
| `build:packages` | PASS (22/22) | **PASS (22/22)** |
| `build:services` / gateway | 0 errors | **0 errors** |
| `build:services` / workflow-service | 104 errors | **93 errors** |
| `test:unit` | 338/2953/1 skip | **338/2953/1 skip** |
| `test:contracts` | 17/531 | **17/531** |
| `typecheck:modules` | 6,588 | not re-run |
| `verify:imports` | 4,079 violations | not re-run |
| DB gates | BLOCKED_EXTERNAL_SECRET | BLOCKED_EXTERNAL_SECRET |

Cumulative workflow-service progress across Pass 2 total: **147 → 93** (54 errors closed, 37%). Gateway: **130 → 0** (100%).

---

## 3. What remains (16 unique missing first-party files)

The remaining 93 workflow-service errors reduce to 16 unique missing modules plus dependent signature errors. Authoring each requires real per-domain logic — the user's absolute rules forbid placeholders/NotImplemented/stubs, so these must be implemented with real contracts against existing module registries and DB schema.

| Path | Consumer(s) | Enterprise function |
|---|---|---|
| `src/domain/config/canonical-modules.ts` | temporal activities | List of canonical module codes — likely a thin re-export of `@dos/contracts` module registry |
| `src/domain/config/openfga.ts` | temporal activities | OpenFGA client configuration |
| `src/domain/middleware/openfga-guard.ts` | temporal activities | OpenFGA permission guard for orchestration |
| `src/domain/modules/audit/services/audit/reporting/audit-committee-reporting.service.ts` | audit.activities | Audit committee report generation |
| `src/domain/modules/governance-ai/services/intelligence/signal-detection.service.ts` | governance-ai.activities | KPI/anomaly detection |
| `src/domain/modules/governance-ai/services/intelligence/interpretation.service.ts` | governance-ai.activities | Signal interpretation |
| `src/domain/modules/governance-ai/services/intelligence/narrative-engine.service.ts` | governance-ai.activities | Narrative generation |
| `src/domain/modules/governance-ai/services/intelligence/health-intelligence.service.ts` | governance-ai.activities | Health signal intelligence |
| `src/domain/modules/governance-ai/services/intelligence/action-orchestration.service.ts` | governance-ai.activities | Action orchestration |
| `src/domain/modules/governance-ai/services/intelligence/escalation-engine.service.ts` | governance-ai.activities | Escalation engine |
| `src/domain/modules/integrations/services/connector.service.ts` | integration activities | Generic connector |
| `src/domain/modules/integrations/services/erp-connector.service.ts` | integration activities | ERP connector |
| `src/domain/modules/onboarding/repositories/onboarding-session.repo.ts` | provisioning.activities | Onboarding session CRUD |
| `src/domain/modules/workflow/services/tasks/process-task-monitor.service.ts` | workflow engine | Process task monitor |
| `src/domain/platform/dauth/authority/approval-matrix.service.ts` | approval-engine | DAuth approval matrix |
| `src/domain/platform/dos/jobs/job-scheduler.service.ts` | general.activities | Platform job scheduler |

Plus 77 dependent errors that resolve once those files exist (TS2554 signature mismatches, TS2339 property access on `never` types, TS18046 unknown object navigation).

---

## 4. Absolute-prohibition re-audit

| Rule | Status |
|---|---|
| No tests modified to pass | ✅ — `git diff` shows no `*.test.ts` changes this session |
| No skip added | ✅ — still 3 conditional skips (same as P0 baseline) |
| No assertions stripped | ✅ — unit test count stable at 2,953 |
| No tsconfig excludes added | ✅ — service tsconfigs untouched this session |
| No first-party code deleted | ✅ — only file creation + targeted edits |
| No NotImplemented runtime throws added | ✅ — all new code is real enterprise logic |
| No shadow/fake green | ✅ — verdict remains NOT PASS, 93 real errors surfaced honestly |

---

## 5. Next safe action

Author the 16 missing enterprise files in order of error-count impact. Suggested order (errors closed per file, biggest first):

1. `onboarding-session.repo.ts` — closes 20 errors in provisioning.activities.
2. `signal-detection.service.ts` + `interpretation.service.ts` + `narrative-engine.service.ts` + `health-intelligence.service.ts` + `action-orchestration.service.ts` + `escalation-engine.service.ts` — closes 16 errors in governance-ai.activities.
3. `connector.service.ts` + `erp-connector.service.ts` — closes integration errors.
4. `audit-committee-reporting.service.ts` — closes audit.activities errors.
5. `approval-matrix.service.ts` — closes approval-engine error.
6. `job-scheduler.service.ts`, `canonical-modules.ts`, `openfga.ts`, `openfga-guard.ts`, `process-task-monitor.service.ts` — closes remaining activity errors.

Each implementation must use real contracts: `@dos/db` for persistence, `@dos/event-backbone` for publishing, `@dos/contracts` / `@dos/types` for shared types. No `as any`, no NotImplemented, no shadow fallback.
