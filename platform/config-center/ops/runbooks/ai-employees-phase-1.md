# AI Employees — Phase 1 (Hire & give them a desk)

## Vision

The 13 AI agents (A01–A13) are real employees in the customer's organization, not chatbots. Each has a job description, a manager, a schedule, KPIs, deliverables, and an employee record. Phase 1 establishes the org chart and the autonomous shift runner. Phase 2 will plug each shift into a real domain handler. Phase 3 will add the HR lifecycle (probation, promotion, performance reviews).

## What Phase 1 ships

| Layer | Component | Path |
|---|---|---|
| Canonical SoT | `SHAHIN_AI_EMPLOYEES` (job titles, managers, missions, responsibilities, deliverables, KPIs, schedules) | `packages/shahin-product/src/shahin-ai-employees.ts` |
| Schema | `AgentEmployeeRecord`, `AgentDeliverable`, `AgentKpi`, `AgentShift` | `packages/dos-types/src/agent.ts` |
| DB | `public.ai_employee_shifts`, `public.ai_employee_reports`, `public.ai_employee_kpi_snapshots` (RLS-isolated) | `services_ai-engine-service/migrations/500_ai_employees.sql` |
| Service | `seedShiftsForAllTenants`, `listEmployees`, `getEmployee`, `runDueShifts` | `services_ai-engine-service/src/runtime/ai/services/hr/ai-hr.service.ts` |
| Routes | `GET /api/ai-hr/employees`, `GET /api/ai-hr/employees/:id`, `POST /api/ai-hr/_seed`, `POST /api/ai-hr/_run-due` | `services_ai-engine-service/src/runtime/ai/routes/hr/ai-hr.routes.ts` |
| Gateway proxy | `/api/ai-hr/* → ai-engine` | `services/gateway/src/server.ts` |
| Bootstrap | Seed at startup + 60s shift dispatcher | `services_ai-engine-service/src/main.ts` |
| Frontend | Org-chart cards page with drill-down | `products/shahin-ai/app/src/app/blueprint/features/hr/pages/ai-employees.component.ts` |
| Workspace route | `/workspace/hr/ai-employees` | `products/shahin-ai/app/src/app/blueprint/platform-manifests/module-routes-core/workspace.module.routes.ts` |

## Org chart at a glance

| Agent | Job title | Manager | Schedule | Status |
|---|---|---|---|---|
| A01 | GRC Onboarding Specialist | Chief Compliance Officer | daily 06:00 + weekly Mon | permanent |
| A02 | IAM & Access Governance Officer | IT Security Manager | daily 06:30 + weekly Mon + monthly 1st | permanent |
| A03 | Regulatory Frameworks Analyst | Chief Compliance Officer | weekly Tue + monthly 1st | permanent |
| A04 | Controls Author | Compliance Programme Lead | weekly Wed | permanent |
| A05 | Evidence Officer | Compliance Programme Lead | daily 06:00 | permanent |
| A06 | Remediation Roadmap Owner | Compliance Programme Lead | weekly Thu | permanent |
| A07 | Risk Register Analyst | Chief Risk Officer | daily 07:00 + weekly Fri + quarterly | permanent |
| A08 | Policy Lifecycle Manager | Chief Compliance Officer | weekly Thu + monthly 1st | permanent |
| A09 | Third-Party Risk Officer | Vendor Risk Lead | weekly Tue + monthly 5th | permanent |
| A10 | Audit Reporting Specialist | Head of Internal Audit | monthly 1st + quarterly | permanent |
| A11 | Business Continuity Coordinator | BCP Manager | weekly Fri | permanent |
| A12 | Security Awareness & Training Coordinator | HR Learning Manager | weekly Mon + monthly 7th | permanent |
| A13 | Sales Development Representative (Public Copilot) | Marketing & Growth Lead | daily 06:00 | probation |

## Operational evidence (smoke-verified 2026-04-28)

- `seedShiftsForAllTenants` inserted **683 shifts across 31 active tenants × 13 agents** at engine startup.
- `runDueShifts` ticks every **60 seconds** and processed 23 backdated shifts in one tick, writing 23 reports to `public.ai_employee_reports`.
- Each shift writes one durable audit row (`dos.audit_trail.action='agent.shift.completed'`) — the timesheet.
- Each shift advances `next_run_at` via `cron-parser` so subsequent ticks pick up only the work that's actually due.
- Workspace route `/workspace/hr/ai-employees` renders with HTTP 200 and lazy-loads the standalone Angular page; the page calls `/api/ai-hr/employees` via the gateway proxy.

## What Phase 1 does NOT do (deferred)

| Phase | Item |
|---|---|
| 2 | Per-agent shift handlers that actually invoke domain tools (e.g. A05 calls `check_evidence_freshness` on the tenant DB) instead of producing the metadata digest |
| 2 | KPI engine that computes `ai_employee_kpi_snapshots` daily from audit-trail / langfuse / tenant-db sources |
| 3 | Probation → permanent promotion gated by eval-suite pass |
| 3 | Quarterly performance review pack (auto-generated, manager signs) |
| 3 | New-agent onboarding workflow (eval, certify, deploy A14+) |

## Phase 1 audit findings — fixes applied (2026-04-28)

After standing up Phase 1 and stress-testing, I revisited every layer for production-grade gaps. **Five real bugs and four polish items were closed.**

### Critical fixes

1. **RLS leak on `public.ai_employee_*` tables.** Initial migration used `current_setting('app.tenant_id', …)` as the policy guard, but the platform's canonical setting name is `app.current_tenant_id`. Effect: every authenticated request saw all tenants' rows because the wrong-named setting was always NULL → service-role policy passed. Fixed in `migrations/501_ai_employees_rls_fix.sql` (drops the broken policies, re-creates aligned with platform convention).

2. **NULL-tenant duplicate rows.** PostgreSQL `UNIQUE (tenant_id, agent_id, shift_code)` does not deduplicate when `tenant_id IS NULL` because NULL ≠ NULL. A13 (Landing Copilot, platform-global) inserted a fresh row on every engine restart. Fixed in `migrations/502_ai_employees_null_tenant_dedup.sql` (collapses duplicates, replaces constraint with `NULLS NOT DISTINCT`).

3. **`cron-parser` not installed → every shift firing hourly.** The runner's try/catch fallback returned `now + 1h` silently when `require('cron-parser')` failed. In an ESM engine the try also masked the "require is not defined" error from CJS interop. Effect: a Friday-only weekly digest would have fired every hour for a year. Fixed by (a) adding `cron-parser` as a hard dep in `package.json`, (b) loading it via `createRequire(import.meta.url)` to bridge ESM↔CJS, (c) replacing the silent +1h fallback with a 24h park + loud `logger.error` so a future regression cannot hide.

4. **`ON CONFLICT … DO UPDATE` did not refresh `next_run_at`.** Re-seeding existing shifts wiped no fields except metadata, so manually clearing `next_run_at` and re-seeding left it NULL. Fixed: the upsert now refreshes `next_run_at` when it is NULL or when the cron expression changed, otherwise preserves the existing schedule.

5. **`dos.audit_trail` column name was `actor_id`, not `user_id`.** Initial shift writer silently dropped the timesheet entries. Fixed; now every shift produces an audit row stamped `actor_id='agent:A0X', action='agent.shift.completed'`.

### Polish

6. **Permissions mismatch.** SPA route required `admin:read + adminOnly: true`; API route required `ai.copilot.read`. A compliance officer with API permission would 403 on the page. Fixed by aligning the SPA route to `ai.copilot.read`.

7. **Discoverability: no nav link.** Page existed at `/workspace/hr/ai-employees` but was not linked from the sidebar. Fixed by seeding 5 rows in `public.default_navigation_items` (parent "AI Operations" + 4 children: AI Employees, AI Operations Dashboard, AI Security Dashboard, AI Trace Surfaces).

8. **No manager filter UI.** Page rendered all 13 employees as a flat list. Added `/api/ai-hr/managers` endpoint + filter pills on the page so a Compliance Officer can drill to "their staff" (A01/A03/A04/A05/A06/A08).

9. **Shift runs not in Langfuse.** Fixed: each shift execution is now wrapped in `traceSurfaceCall` with `surface:agent-shift` + the agent's own `surface:agent-AXX` tag, so the AI Trace Surfaces dashboard counts shift work alongside on-demand traffic.

10. **EN-only UI on a bilingual platform.** Fixed: page now reads `I18nService.dir()` and `isAr()` for direction (RTL on AR), and every label/title/domain/manager/responsibility renders from the `*Ar` field when `isAr()` is true. Schedule details and KPI tables also localized.

### Tests

`src/runtime/ai/services/hr/ai-hr.service.test.ts` — 8/8 passing. Covers:
- All 13 canonical agent IDs present (A01..A13)
- Every employee has manager, KPIs, deliverables, ≥1 shift
- Every shift produces a deliverable that exists on the same agent
- A13 is platform-global; A01..A12 are per-tenant
- `listAllShifts()` returns each shift exactly once
- Every cron expression is parseable by `cron-parser` (no silent fallbacks)

### Residual issues (deferred, non-blocking)

| Issue | Why deferred |
|---|---|
| `/api/ai-hr/health` returns 401 | Same pre-existing pattern affects DNOC/DSOC sub-router /health too. The engine-root `/health` works for liveness, which is what Prometheus / PM2 use. Platform-wide fix lives in `dos-service-bootstrap`, out of Phase 1 scope. |
| `localToTenant: true` on shifts is metadata-only | Cron currently runs in UTC. Per-tenant local-time evaluation is Phase 2 work; for Phase 1, all shifts are scheduled in UTC and tenants in different timezones get the same fire moment. |
| KPI engine empty | `kpisOnTarget` always 0; `ai_employee_kpi_snapshots` empty. Phase 2 deliverable. |
| Per-agent shift handlers are metadata digests | Each report's body declares `phase: 1, note: "Phase 1 shift — agent metadata digest. Phase 2 will run real domain tools."` — so it's self-documenting. |

## Operating notes

### Re-seed shifts after adding a new agent / tenant

```bash
curl -X POST -H "x-service-token: <signed-jwt>" https://shahin-ai.com/api/ai-hr/_seed
```

Adding a new tenant: the seeder is idempotent. It re-runs at every engine restart, so a new tenant picks up its 12-or-so per-tenant shifts on the next deploy.

### Force-run a stuck shift (operator override)

```sql
-- DO NOT do this against production tenants without ops approval — it
-- bypasses the cron schedule. Used only for smoke testing.
UPDATE public.ai_employee_shifts
   SET next_run_at = NOW() - INTERVAL '1 second'
 WHERE shift_id IN (SELECT shift_id FROM public.ai_employee_shifts WHERE agent_id='A07' AND tenant_id='douhan_consult');
```

The next 60s tick will pick them up. If you need an immediate run, hit `POST /api/ai-hr/_run-due`.

### Disable a shift without deleting it

```sql
UPDATE public.ai_employee_shifts SET enabled = FALSE
 WHERE agent_id = 'A09' AND tenant_id = '<tenant>' AND shift_code = 'monthly_breach_scan';
```

Re-enable by flipping `enabled` back to TRUE. The runner will skip it while disabled.

### Tenant termination

When a tenant is terminated, the cascade should:
1. Set `enabled = FALSE` on all `public.ai_employee_shifts` rows for that tenant.
2. Keep `public.ai_employee_reports` rows in place for audit retention.
3. Keep `public.ai_employee_kpi_snapshots` rows for historical analysis.

(Cleanup-on-tenant-delete is Phase 3; current behaviour is "rows persist, runner stops".)

## Database tables — quick reference

```text
public.ai_employee_shifts          → who is scheduled to work, when, on what
public.ai_employee_reports         → durable artefacts produced by each shift
public.ai_employee_kpi_snapshots   → daily KPI rollups (Phase 2 will populate)
dos.audit_trail action='agent.shift.completed' → timesheet
```

## Linked

- Per-agent tool implementations: `packages/shahin-product/src/ai/tools/a01..a12-*.ts`
- A13 (Landing Copilot) registration: `packages/shahin-product/src/agrc-agents.ts`
- Surface-tagged trace dashboard: `ops/runbooks/ai-trace-surfaces.md`
- Alert dispatch (notification fan-out): `services/notification-service/src/events/notification.consumers.ts`
