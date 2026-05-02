# Workflow Module — Implementation Report

**Date:** 2026-04-21
**Scope:** Comparison, versioning, templates (+ dependencies) in `modules/workflow/source/backend/workflow/services/*`
**Gates evidence:** `/tmp/*.log`, `ops/reports/runlogs/*.log`

---

## 1. Executive Verdict

**Workflow comparison, versioning, and template-instantiation stubs have been replaced with real deterministic implementations.** 39 new unit tests exercise these paths and all pass. `build:packages`, `test:unit` (2,951/2,952 pass + 1 pre-existing skip), and `test:contracts` (527/527) all pass.

The broader commercial-release scope in the follow-up directives (gateway routing subtree full compile, workflow-service Temporal subtree full compile, repo-wide zero-typecheck-error closure) is **not achieved in this single pass**: after removing the tsconfig excludes that previously hid them, the gateway and workflow-service targeted builds each still have ~130 real TS errors spread across dozens of files (route catalogs, auth adapters, temporal workers). Those are backlog, not deletion candidates — honestly reported below.

---

## 2. Files Changed

| File | Change |
|---|---|
| `modules/workflow/source/backend/workflow/services/templates/workflow-comparison.service.ts` | **Full rewrite.** Replaced two `throw new Error('not implemented')` stubs with deterministic diff: `diffDefinitions` (pure), `compareExecutions` (DB-backed, tenant-scoped), `compareVersions` (snapshot-first, workflow_definitions fallback). Exports `DiffItem`, `DiffSummary`, `DiffSeverity`, `DiffCategory`. |
| `modules/workflow/source/backend/workflow/services/core/workflow-template-crud.service.ts` | **Implemented** `createTemplate`, `updateTemplate`, `cloneTemplate` (previously returned `result?.rows` placeholder). Tenant-scoped, validated structure, duplicate/conflict handling via `ConflictError`, NotFound via `NotFoundError`, monotonic version increment on update + recorded snapshot. |
| `modules/workflow/source/backend/workflow/services/templates/workflow-templates.service.ts` | **Implemented** `instantiateTemplate`, `startModuleWorkflow`, added `getWorkflowTemplateByCode`. DB-first template resolution with fallback to the `PREDEFINED_TEMPLATES` catalogue, insertion into `workflow_instances`, enrichment of metadata with module/template context, initial-step computation from graph topology. `WorkflowTemplateNotFoundError` preserved. |
| `modules/workflow/source/config/module-workflow-map.ts` | Added exported `isPlatformOnly(moduleCode)` and `type CanonicalModuleCode` (previously referenced by `config.port` but not defined — a pre-existing compile gap). |
| `modules/workflow/source/config/module-workflow-map.js` | Mirrored the new exports in the co-located compiled artifact so vitest/Node resolution picks them up consistently. |
| `modules/workflow/source/errors/index.ts` | Added local, self-contained `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`, `toErrorMessage` (mirrors `@dos/module-sdk/errors` 1:1). Self-contained to avoid pulling the full SDK barrel into workflow runtime (the SDK transitively depends on `@dos/contracts` which is not always resolvable in every test sandbox). |
| `modules/workflow/source/errors/index.js` | Updated co-located CJS artifact to match the TS source. |
| `services/workflow-service/src/domain/config/tenant-connection-resolver.ts` | Replaced `import type { Pool } from 'pg'` with `import type { Pool } from '@dos/db'` to satisfy the `service-boundary-contracts.test.ts` rule ("services use @dos/db for database access"). This file was restored from the excluded temporal subtree in the prior pass — removing the exclude exposed the pre-existing `pg` import. |
| `tests/workflow-comparison.test.ts` | **New.** 13 tests exercising `diffDefinitions` (added/removed/modified/breaking classification), `compareExecutions` (tenant isolation, only-in-exec, modified status), `compareVersions` (snapshot hit, workflow_definitions fallback, missing tenant). |
| `tests/workflow-templates.test.ts` | **New.** 17 tests: CRUD (create/update/clone/get/list/delete), duplicate rejection, invalid definition rejection, tenant-scope enforcement, `instantiateTemplate` against both DB and predefined catalogue, `startModuleWorkflow` resolves module → template → instance, error paths for unknown modules. |
| `tests/workflow-versioning.test.ts` | **New.** 9 tests: `bumpWorkflowVersion` monotonic increment + fallback, `snapshotGraph` MAX-based allocation, `diffGraphVersions` added/removed/changed, `updateTemplate` publish-safety gate, version history ordering. |

## 3. Stubs Removed

| Stub | Previous | Now |
|---|---|---|
| `compareExecutions()` | `throw new Error('compareExecutions: not implemented — pending workflow vertical pass')` | Real Postgres-backed, tenant-scoped comparator with typed DTO + structured diff items. |
| `compareVersions()` | `throw new Error('compareVersions: not implemented — pending workflow vertical pass')` | Loads two versions (snapshot-first, workflow_definitions fallback), runs `diffDefinitions`, returns summary + nodesAdded/Removed/Modified + edgesAdded/Removed. |
| `instantiateTemplate()` | `throw new Error('instantiateTemplate: not implemented — pending workflow vertical pass')` | Real DB insert into `workflow_instances` with computed `initialStepIds`, typed `WorkflowInstanceRef` return. |
| `startModuleWorkflow()` | `throw new Error('startModuleWorkflow: not implemented — pending workflow vertical pass')` | Real resolution chain: moduleCode → `MODULE_WORKFLOW_MAP.templateCode` → `getWorkflowTemplateByCode` → `instantiateTemplate`. R2 platform-only rule enforced via `WorkflowTemplateNotFoundError`. |
| `createTemplate()` | Returned `result?.rows` (wrong shape) | Real INSERT with duplicate check, structural validation, v1 version snapshot. |
| `updateTemplate()` | Same placeholder | Real UPDATE with monotonic version increment, re-snapshot, `NotFoundError` on miss. |
| `cloneTemplate()` | Same placeholder | Real clone-from-source with collision check, `draft` status, v1 snapshot. |

**No `throw new Error('NotImplemented')` or `throw new Error('... not implemented ...')` remains in `services/templates/workflow-comparison.service.ts`, `services/templates/workflow-templates.service.ts`, `services/templates/workflow-versioning.service.ts`, or `services/core/workflow-template-crud.service.ts`.**

Verified:

```bash
grep -rn "NotImplemented\|not implemented" modules/workflow/source/backend/workflow/services/templates \
                                            modules/workflow/source/backend/workflow/services/core/workflow-template-crud.service.ts
```

→ no matches.

## 4. Features Implemented

### 4.1 Comparison (workflow-comparison.service.ts)

- Pure deterministic `diffDefinitions(before, after)` → `{ summary, items }`.
- Node-level diff: detects added / removed / modified nodes. Classifies severity per field:
  - `breaking` — `type`, `slaHours`, `assignee`, `swimlane`, approval config, SLA, edge add/remove, edge condition change.
  - `major` — `label_en`, `label_ar`, `label`, `subType`, metadata (swimlanes, escalationChain).
  - `minor` — any other field change.
- Edge-level diff via composite key `from→to[@condition]`.
- Top-level metadata diff for `swimlanes`, `escalationChain`, and any additional scalar top-level fields present in either side.
- Summary: `{ total, added, removed, modified, breakingChanges, unchangedNodes, unchangedEdges }`.
- `compareExecutions(tenantId, execId1, execId2)` — reads `workflow_instances` + `workflow_steps` (tenant-scoped), returns exec summaries + only-in diffs + common-step field diffs (status/updated_at) + DiffItem list.
- `compareVersions(tenantId, workflowId, v1, v2)` — snapshot-first (`workflow_template_versions`), fallback to `workflow_definitions`; returns both the legacy shape (`nodesAdded/Removed/Modified`, `edgesAdded/Removed`) and the new DiffItem/DiffSummary shape for FE rendering.

### 4.2 Versioning (workflow-versioning.service.ts + template CRUD)

- `bumpWorkflowVersion` — monotonic `COALESCE(version, 0) + 1`, tenant-scoped.
- `snapshotGraph` — allocates `MAX(version_number) + 1` and inserts into `workflow_graph_versions`.
- `diffGraphVersions` — node-level diff across snapshot rows.
- `updateTemplate` — monotonic version bump + snapshot into `workflow_template_versions` on every successful update.
- Publish-safety gate: updates with an invalid definition (no start/end, dangling edges, empty nodes, duplicate ids) throw `ValidationError` — never reach UPDATE.
- Latest-published selection: `getTemplate` / `getTemplateById` use `WHERE status != 'archived' ORDER BY version DESC LIMIT 1`.
- `cloneTemplate` starts at v1 with `status='draft'`, preventing accidental overwrite of a published row.

### 4.3 Templates (workflow-templates.service.ts + workflow-template-crud.service.ts)

- Tenant-scoped CRUD via `tenantSchema(tenantId)` with `ValidationError` on empty `tenantId`.
- List with filters: `status`, `category`, `moduleCode`, `search` + pagination (`limit` capped at 200, `offset`).
- `instantiateTemplate` — DB-first resolution, fallback to static `PREDEFINED_TEMPLATES`, persists instance with metadata, computes `initialStepIds` from graph topology (explicit `type === 'start'` nodes; otherwise in-degree-0 nodes).
- `startModuleWorkflow` — module → template resolution + enrichment with `{ moduleCode, resolvedTemplateCode, slaHours, autoAssign }`.
- `getWorkflowTemplateByCode` — DB-first, catalogue fallback, returns `{ templateKey, definition } | null`.
- Clone flow: reads source, collision-checks new code, inserts draft v1.

## 5. Business Assumptions (documented)

Per the "safest enterprise deterministic default" directive:

| Decision | Default chosen | Rationale |
|---|---|---|
| Missing `status` on create | `'active'` | Only active templates return from `listTemplates`/`getTemplate` unless filter overridden; conservative. |
| Missing `status` on clone | `'draft'` | Prevents accidental publish-by-copy. |
| Missing `version` on create | `1` | Monotonic rule + initial-version snapshot. |
| Missing `category` | `'general'` | Matches the "Unknown template category: use `general`" directive. |
| Missing optional display metadata (`nameAr`, `descriptionAr`, `description_en`) | `''` | Avoids null leak to FE. |
| Empty `tenantId` | `ValidationError({ path:'tenantId', message:'tenantId is required' })` | 400 through route layer. |
| Invalid definition (no start/end / dangling edge / duplicate id) | `ValidationError` — blocks INSERT/UPDATE | Preserves publish-safety gate. |
| Unknown module code on `startModuleWorkflow` | `WorkflowTemplateNotFoundError` | Hard error; R2 platform-only rule. |
| Unknown comparison field | Included as `metadata` / `minor` diff when present in either side | Matches the "Unknown comparison field: include it as metadata diff" directive. |
| Breaking-vs-major fields | Listed in `BREAKING_NODE_FIELDS` / `MAJOR_NODE_FIELDS` sets | Deterministic and testable. |
| Existing `instantiateTemplate` when template is missing from both DB and catalogue | `WorkflowTemplateNotFoundError` | No silent empty instance. |
| Missing workflow steps on publish | Rejected at `validateTemplateStructure` / `validateDefinition` | Never persist an un-runnable template. |

## 6. Tests Added / Fixed

**Added** (all passing):

| File | Tests |
|---|---|
| `tests/workflow-comparison.test.ts` | 13 — `diffDefinitions` (identical→no-op, added/removed/modified steps, transition condition change, SLA change, node type change, metadata change, unknown top-level fields), `compareExecutions` (tenant-isolation throw, both-missing, only-in-exec + modified), `compareVersions` (snapshot hit, fallback to `workflow_definitions`, tenant-isolation throw). |
| `tests/workflow-templates.test.ts` | 17 — CRUD create/get/list/update/delete/clone, tenant-isolation, duplicate-code, invalid-definition, `instantiateTemplate` (DB hit, catalogue fallback, unknown-key → WorkflowTemplateNotFoundError, empty-tenantId rejection), `startModuleWorkflow` (happy path, unknown module → WorkflowTemplateNotFoundError). |
| `tests/workflow-versioning.test.ts` | 9 — `bumpWorkflowVersion` (tenant-scoped schema + COALESCE increment + fallback), `snapshotGraph` (MAX-based allocation), `diffGraphVersions` (added/removed/changed), `updateTemplate` republish version bump, publish-safety gate (invalid definition rejects), `getTemplateVersions` ordering. |

**Fixed (non-test code) — see §2.**

## 7. Commands Run (this pass)

| Command | Result | Notes |
|---|---|---|
| `npx vitest run tests/workflow-comparison.test.ts tests/workflow-templates.test.ts tests/workflow-versioning.test.ts -c vitest.config.mts` | **PASS** — 3 files / 39 tests / 39 pass / 0 fail | Deterministic, 734 ms |
| `pnpm run build:packages` | **PASS** — exit 0 | 22/22 packages |
| `pnpm run test:contracts` | **PASS** — 17 files / 527 tests / 527 pass | After fixing `tenant-connection-resolver.ts` `pg` → `@dos/db` |
| `pnpm run test:unit` | **PASS** — 338 files / 2,951 tests / 2,951 pass / 1 skipped (pre-existing) | +3 files +39 tests vs prior baseline |
| `pnpm run typecheck:modules` | FAIL — 6,753 errors (was 7,112 at start of this pass) | 906 errors are in `modules/workflow/**` — the vast majority are pre-existing drift in `source/ai/**`, `source/backend/workflow/workflows/**`, `source/backend/workflow/admin/**`, etc. The services under `templates/` and `core/workflow-template-crud` that I rewrote are internally clean. |
| `npx tsc -p services/gateway/tsconfig.json` | FAIL — 130 errors | Gateway routing subtree (formerly excluded). Pre-existing drift: `route-catalogs/access/rbac/seed-rbac-data.ts` imports missing `RoleDef`/`PermDef` types, `route-catalogs/index.ts` re-exports 30+ missing symbols from `./identity/token`, `./access/rbac`, etc. Not introduced by this pass. |
| `npx tsc -p services/workflow-service/tsconfig.json` | FAIL — 129 errors | Workflow-service Temporal subtree (formerly excluded). Pre-existing drift: temporal workers import from paths like `../../../config/tenant-connection-resolver.js` with `.js` extension that don't exist, missing `ports`/`activities` files. Not introduced by this pass. |

## 8. Remaining Blockers (external or large-scope only)

| # | Blocker | Class | Exact action |
|---|---|---|---|
| W1 | `services/gateway/**` — 130 TS errors after removing the `src/domain/routing/**` tsconfig exclude. Root cause cluster: `route-catalogs/index.ts` re-exports ~30 symbols from unimplemented sibling files (`./identity/token`, `./access/rbac/canonical-roles`, `./canonical-permissions`, etc.); `seed-rbac-data.ts` consumes Role/Permission literal unions as structured objects. | FAIL_REQUIRES_DEDICATED_PASS | Multi-file implementation: (a) implement the missing identity/token adapter or re-point catalogs at `@dos/auth`; (b) widen the RBAC `code`/`name` records in `canonical-permissions.ts` to match the `{ code, module, resource, action, name }` consumer shape; (c) add `RoleDef`/`PermDef` type exports. Backlog item, not a single-file fix. |
| W2 | `services/workflow-service/**` — 129 TS errors after removing the `src/domain/engine/**` + `src/domain/temporal/**` excludes. Root cause cluster: Temporal workers/workflows/activities import from `../../../config/*.js` (NodeNext-strict) and from repositories/services with method-name drift. | FAIL_REQUIRES_DEDICATED_PASS | Per-worker fix pass. Not in scope for a workflow-comparison/versioning/templates pass. |
| W3 | `typecheck:modules` — 6,753 residual TS errors across all modules. Of these, 906 are in `modules/workflow/**` and the majority sit in `source/ai/**` (agentic workflow generators) and `source/backend/workflow/workflows/**` (orchestration graph definitions). The files I rewrote (`services/templates/workflow-comparison.service.ts`, `services/templates/workflow-templates.service.ts`, `services/core/workflow-template-crud.service.ts`) no longer contribute new errors. | FAIL_REQUIRES_DEDICATED_PASS | Per-module remediation pass, already captured in the previous reconciliation report as blocker B3. |
| W4 | DB gates (`validate:migrations`, `verify:schema`, `verify:data-safety`) | BLOCKED_EXTERNAL_SECRET | `DATABASE_URL` not provisioned in this sandbox. |
| W5 | Full `test:integration` (185 failures) | BLOCKED_EXTERNAL_INFRA | Needs live Postgres + Redis + PM2 mesh + Playwright chromium. |

**No `BLOCKED_IRREVERSIBLE_PROD_ACTION` items encountered.**

## 9. Confirmations (per the hard rules)

- **No `throw new Error('NotImplemented')` / `not implemented` remains** in workflow comparison, versioning, or templates services. Verified by `grep -rn`.
- **No placeholder return objects** in the rewritten functions — every function either returns a typed DTO, throws a typed error, or persists a row and returns the mapped DTO.
- **No `any` cast weakening** of public contracts. `any` appears only in (a) the legacy `bumpWorkflowVersion(workflowId, definition: any, …)` signature (kept for backward-compat; the callers use freeform JSON), and (b) `snapshotGraph(…, graph: any, …)` which stores arbitrary graph JSON — same rationale.
- **No tsconfig exclusions introduced** by this pass. (Pre-existing excludes for `governance/source/**` and `modules/governance` remain — those were set by the external editor earlier and were not restored by me.) `services/workflow-service/tsconfig.json` and `services/gateway/tsconfig.json` excludes remain at the smaller, non-domain set that the previous directive required.
- **No tests skipped or weakened.** All 39 new tests use real assertions; no `.skip`, no `.todo`.
- **No deletions** of product/platform code in this pass. `services/gateway/src/domain/routing/**` and `services/workflow-service/src/domain/temporal/{activities,workers,workflows}/**` remain intact.
- **No secrets committed.** `security:secrets-scan` still passes at gate level (668 potentials / 0 critical-high).

## 10. Scope Honesty

The follow-up directive in this session expanded scope to "the entire repository" with a 5-phase commercial-release closure. In a single audit turn, the workflow comparison/versioning/templates verticals are **fully implemented and green**, but:

- The gateway routing subtree (§8 W1) and workflow-service Temporal subtree (§8 W2) each have ~130 pre-existing TS errors concentrated in ~15 files. Resolving them correctly — implementing missing type exports, fixing NodeNext `.js` extensions on relative imports, rebuilding route catalogs from a live `@dos/auth` source, and verifying every worker's Temporal runtime contract — is a multi-day per-service pass, not a single turn. I have NOT deleted any of these files. I have NOT restored any tsconfig exclude to hide them. The errors are honestly visible.
- The residual `typecheck:modules` 6,753 errors are repo-wide drift that likewise need per-module remediation.

The workflow stubs that triggered this pass are closed. The broader closure is the next vertical-pass workstream.
