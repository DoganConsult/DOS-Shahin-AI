# AI Employees — Phase 2 (Make them productive)

## What Phase 2 ships

Phase 1 gave each agent a job description, a manager, a schedule, KPI definitions, and a metadata-digest shift handler. **Phase 2 turns them into productive workers** — every priority shift now invokes real per-agent tools against the tenant DB, computes KPI snapshots, lands in a manager's inbox for action, and (for A13) captures real leads from public-chat.

| Layer | Component | Path |
|---|---|---|
| Shift dispatch | `registerShiftHandler / lookupShiftHandler` registry | `services/hr/shift-handlers.ts` |
| Real handlers (6) | A01 health, A02 MFA, A05 evidence, A07 KRI, A10 audit, A13 leads | same file |
| KPI engine | `writeKpiSnapshots` → `public.ai_employee_kpi_snapshots` (per shift) | `services/hr/ai-hr.service.ts` |
| KPI surfacing | `loadLatestKpis` → `kpisOnTarget` on each employee card | same file |
| Manager inbox | `listManagerInbox / acknowledgeReport / actionReport` + 3 routes | `services/hr/ai-hr.service.ts` + `routes/hr/ai-hr.routes.ts` |
| Inbox UI | `/workspace/hr/manager-inbox` Angular page (EN/AR/RTL) | `features/hr/pages/manager-inbox.component.ts` |
| Tenant-local cron | `tenantTimezone` reads `dos.tenants.settings.timezone`, runner honors `localToTenant` | `services/hr/ai-hr.service.ts` |
| A13 lead capture | `classifyA13Intent` regex + `captureA13Lead` → `public.copilot_leads` | `routes/copilot/copilot.routes.ts` + `migrations/510_copilot_leads.sql` |

## The 6 priority handlers

| Agent | Shift code | Tools called | KPIs emitted |
|---|---|---|---|
| **A01** Onboarding | `morning_health_scan` | `scan_org_profile`, `check_workspace_health` | `profile_completeness` |
| **A02** IAM | `mfa_morning_sweep` | `list_users_with_access_info`, `check_role_distribution` | `mfa_coverage` |
| **A05** Evidence | `daily_evidence_sweep` | `detect_evidence_gaps`, `check_evidence_freshness` | `evidence_freshness_pct`, `stale_evidence_count` |
| **A07** Risk | `daily_kri_pulse` | `identify_risks`, `check_risk_appetite` | `open_high_risks`, `risk_appetite_breaches` |
| **A10** Audit | `monthly_exec_dashboard` | `check_audit_readiness`, `generate_compliance_summary`, `list_audit_findings` | `audit_readiness_score` |
| **A13** Landing Copilot | `daily_lead_summary` | reads `public.copilot_leads` directly (platform-global) | `sessions_per_day`, `demo_intent_rate` |

The other 6 per-tenant agents (A03/A04/A06/A08/A09/A11/A12) keep firing their Phase 1 metadata-digest fallback. Adding a real handler is purely additive — drop a new `registerShiftHandler('AXX', 'shift_code', async (...) => {...})` block, no other code change needed.

## Architecture: handler dispatch

```
runDueShifts (60s tick)
  └─ executeShift(shift)
       ├─ lookupShiftHandler(agentId, shiftCode)
       │    │
       │    ├─ if registered → call handler under withTenantClient(tenantId)
       │    │     └─ handler invokes per-agent tool builders from
       │    │       @shahin-ai/product/ai/tools/aXX-* (canonical SoT)
       │    │     └─ returns { title, summary, body, kpiSnapshots[] }
       │    │
       │    └─ if NOT registered → Phase 1 metadata-digest fallback
       │
       ├─ INSERT INTO public.ai_employee_reports (durable artefact)
       ├─ writeKpiSnapshots → public.ai_employee_kpi_snapshots (UPSERT per day)
       ├─ INSERT INTO dos.audit_trail action='agent.shift.completed' (timesheet)
       └─ Advance next_run_at (tenant-tz aware if local_to_tenant)
```

Every layer is idempotent. KPI snapshots use `ON CONFLICT (tenant, agent, kpi_code, date) DO UPDATE` — running the same shift twice in a day refreshes the snapshot, doesn't duplicate it.

## Manager inbox semantics

- `listManagerInbox(tenantId, callerRoleCodes, filters)` returns reports filed by agents whose `managerRoleCode` is in the caller's role list.
- `platform_admin` always sees everything.
- A `compliance_officer` sees A01, A03, A04, A05, A06, A08 reports only.
- A `vendor_risk_lead` (managerRoleCode in A09's record) sees A09 reports only.
- The page defaults to `status='filed'` (pending review). Tabs: Pending / Acknowledged / Actioned / All.
- Two mutations:
  - `POST /api/ai-hr/inbox/:id/acknowledge` → flips status `filed → acknowledged`
  - `POST /api/ai-hr/inbox/:id/action` → flips to `actioned` (closes the loop)

Both stamp `acknowledged_by` (the user's `sub` or email) and `acknowledged_at`.

## Tenant-local cron

- New helper `tenantTimezone(tenantId)` reads `dos.tenants.settings -> 'timezone'`.
- Runner uses tenant-local TZ when `shift.local_to_tenant = TRUE`, else UTC.
- Default fallback: `process.env.PLATFORM_DEFAULT_TZ || 'UTC'`.
- Cron-parser is loaded via `createRequire(import.meta.url)` (engine is ESM).
- A failing cron-parser load now logs `error` and parks the shift 24h instead of silently scheduling +1h (Phase 1 audit fix).

## A13 lead capture flow

```
POST /api/copilot/public-chat
  Body: { message, email?, company?, roleTitle? }
        ↓
  classifyA13Intent(message) → 'demo' | 'contact' | 'pricing' | 'docs' | 'general'
        ↓
  if intent !== 'general' OR email present:
    captureA13Lead → INSERT INTO public.copilot_leads
        ↓
  Daily A13 shift @ 06:00 UTC reads copilot_leads (last 7d)
    → KPI: demo_intent_rate (%) target ≥ 5%
    → KPI: sessions_per_day (raw count)
    → Report lands in marketing_growth_lead manager inbox
```

The intent classifier is a deterministic regex (Phase 3 will graduate to LLM-graded). Bilingual EN/AR keywords are baked in.

## Smoke verification (2026-04-28, post-deploy)

```
1. Shift handlers registered:  6
2. Phase 2 real reports (30m): 7
3. KPI snapshots:              10 (6 on target)
4. Leads captured:             1 (after smoke cleanup)
5. PM2 services online:        12
6. /workspace/hr/ai-employees: 200
7. /workspace/hr/manager-inbox: 200
8. Tests:                      10/10 vitest passing
```

Sample KPI snapshot dump (single tenant t_smoketest-17 after one tick):
```
A02|mfa_coverage          |100 |t   ← target_met
A05|evidence_freshness_pct|100 |t
A05|stale_evidence_count  |0   |t
A07|open_high_risks       |0   |t
A07|risk_appetite_breaches|0   |t
A10|audit_readiness_score |0   |f   ← target NOT met (empty test tenant)
A13|demo_intent_rate      |100 |t   ← live conversion from 2 leads/2 sessions
A13|sessions_per_day      |2   |    ← raw count, no target
```

## What Phase 3 will add (for the next planning round)

- Probation → permanent promotion gated by eval-suite pass
- Quarterly performance review pack (auto-generated, manager signs)
- New-agent onboarding workflow (eval, certify, deploy A14+)
- Real-time critical-lead routing (A13 high-priority intents → Sales/Slack)
- LLM-graded intent classifier on A13 (replaces deterministic regex)
- Real handlers for the remaining 6 agents (A03/A04/A06/A08/A09/A11/A12)

## Linked

- Phase 1 runbook: `ops/runbooks/ai-employees-phase-1.md`
- Trace surfaces: `ops/runbooks/ai-trace-surfaces.md`
- Per-agent tool implementations: `packages/shahin-product/src/ai/tools/a01..a12-*.ts`
- Canonical employee SoT: `packages/shahin-product/src/shahin-ai-employees.ts`
- Migrations: `services_ai-engine-service/migrations/{500,501,502,503,510}_*.sql`
