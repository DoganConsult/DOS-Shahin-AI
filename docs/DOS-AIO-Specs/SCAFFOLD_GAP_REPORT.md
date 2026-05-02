# Scaffold Gap Report — what's done vs partly scaffolded vs not started

**Audit:** sandbox `dos_compliance_e2e` after Section 20 + operational seeds
**Date:** 2026-05-01

This report maps every component to one of five states:

| Symbol | State | Definition |
|---|---|---|
| ✅ | **Done** | Verified working end-to-end |
| 🟡 | **Partly scaffolded** | DDL + seed in place, but no runtime executor |
| 🟠 | **Schema only** | Table exists, zero data, no producer |
| 🔴 | **Not started** | Requires external code or systems |
| ⚪ | **Approval gate** | Out of implementation scope (governance) |

---

## Tier 1 — Reference catalogue (✅ all done)

| Component | Rows | State |
|---|---|---|
| `public.dim_sectors` | 25 | ✅ |
| `public.dim_org_sizes` | 5 | ✅ |
| `public.dim_org_types` | 17 | ✅ |
| `public.dim_business_models` | 12 | ✅ |
| `public.dim_ownership` | 9 | ✅ |
| `public.dim_frameworks` | 42 | ✅ |
| `public.matrix1..6` | 2,220 | ✅ (294+18+22+10+41+1835) |
| `public.controls` (real KSA) | 72 | ✅ |
| `public.evidence_types_ksa` | 119 | ✅ |
| `public.evidence_mapping` | 268 | ✅ |
| `public.evidence_lifecycle` | 3,216 | ✅ |
| `public.lifecycle_stages` | 12 | ✅ |
| `public.risk_assessment` | 72 | ✅ |
| `public.grc_regulators` | 107 | ✅ (loaded from shahin_grc) |
| `public.grc_frameworks` | 452 | ✅ |
| `public.grc_sector_framework_matrix` | 544 | ✅ |
| `public.grc_sector_groups` | 17 | ✅ |

**Subtotal: 7,408 catalogue rows ready.**

---

## Tier 2 — Foundation primitives (✅ all done)

| Component | Rows | State |
|---|---|---|
| `dos.foundation_sod_rules` | **12** (was 6 + 6 new) | ✅ |
| `dos.foundation_authority_kinds` | 10 | ✅ |
| `dos.foundation_cat_ownership_domains` | 12 | ✅ |
| `dos.dynamic_ui_agents` | **18** (was 15 + 3 new: vendor, incident, sdr) | ✅ |
| `dos.dynamic_ui_kpis` | 24 | ✅ |

---

## Tier 3 — Autonomy spine (✅ all seeded)

| Component | Rows | State |
|---|---|---|
| `dos.agent_registry` | 15 (A01-A15) | ✅ |
| `dos.agent_layer_ownership` | 20 | ✅ |
| `dos.agent_arc_ownership` | 17 | ✅ |
| `dos.loop_definitions` | 12 (L01-L12) | ✅ |
| `dos.action_library` | 18 (atomic ops) | ✅ |
| `dos.event_subscriptions` | 30 (event→agent routes) | ✅ |
| `dos.agent_autonomy_levels` | 25 (per agent × action_class) | ✅ |
| `dos.module_registry` | 12 modules | ✅ |
| `dos.capability_registry` | 12 capabilities | ✅ |
| `dos.kpi_registry` | 11 KPIs (with formula_sql) | ✅ |
| `dos.tenant_provisioning_plan` | 1 (smoke test tenant) | ✅ |
| `dos.module_readiness_contract` | 12 (one per module) | ✅ |
| `dos.regulatory_obligations` | 28 (extracted from §12 controls) | ✅ |
| `dos.regulatory_obligation_controls` | 72 (1:1 mapping) | ✅ |

---

## Tier 4 — Closed-loop verification (✅ smoke-tested)

| Test | Result |
|---|---|
| `fn_resolve_persona('BANKING','ENTERPRISE','JSC_LISTED','B2C','LISTED_TADAWUL')` | returns `1` ✅ |
| `sp_seed_tenant('t_demo_alrajhi', 1)` | provisioned 23 frameworks / 72 controls / 268 evidence reqs / 3,216 lifecycle states / 72 risks / 67 persona pack ✅ |
| `fn_check_lifecycle_gate('t_demo_alrajhi','go_live')` | `BLOCK` with "144 mandatory evidence items not in ACCEPTED state" ✅ |
| `fn_emit_event('event.evidence.uploaded',...)` | event #4 emitted; routed to **A05 + A07**; queued in action_log ✅ |
| Hash chain | progressing (`prev_hash` linked from event #2 onward) ✅ |
| `fn_capability_available('t_demo_alrajhi','compliance-cyber')` | correctly returns FALSE (FGA scope not yet provisioned) ✅ |
| RLS isolation | `app.current_tenant_id` GUC enforced on all tenant.* policies ✅ |

---

## Tier 5 — Per-tenant operational tables (✅ for smoke test tenant)

| Table | Rows for t_demo_alrajhi |
|---|---|
| `tenant.profile` | 1 ✅ |
| `tenant.frameworks_subscribed` | 23 ✅ |
| `tenant.controls` | 72 ✅ |
| `tenant.evidence_required` | 268 ✅ |
| `tenant.evidence_lifecycle_state` | 3,216 ✅ |
| `tenant.risk_register` | 72 ✅ |
| `tenant.persona_evidence_pack` | 67 ✅ |
| `tenant.findings` | 0 (none yet) — table ready ✅ |
| `tenant.remediation_actions` | 0 (none yet) — table ready ✅ |
| `tenant.audit_schedule` | 0 (cron not running) 🟡 |
| `tenant.audit_runs` | 0 (no audits triggered) 🟡 |

---

## Tier 6 — 🟡 Partly scaffolded (DDL + seed exist, runtime missing)

These produce no rows in steady state because there's no executor:

| Component | What's missing | Effort |
|---|---|---|
| `dos.action_log` (currently has 4 'queued' rows) | **Agent runtime worker** that drains queue → executes side effects → updates status to 'succeeded' | M |
| `dos.decision_log` (empty) | Same — written by runtime when agent decides | M |
| `dos.agent_memory` (empty) | Written by runtime as agents learn | S |
| `dos.loop_runs` (empty) | **Loop orchestrator** that ticks each loop_definition and writes runs | M |
| `dos.kri_observations` (empty) | **KPI scanner cron** that runs each `kpi_registry.formula_sql` per refresh_cron | S |
| `dos.module_readiness_contract` for new tenants | **Readiness scanner** that checks all 9 signals + updates row | S |
| `dos.control_optimization_signals` | `sp_detect_weak_controls()` exists but isn't scheduled | S |
| Arc 7a (expire stale evidence) | `sp_cycle_expire_stale_evidence()` exists but not in `pg_cron` | S |
| Arc 7b (schedule audits) | `sp_cycle_schedule_audits()` exists but not in `pg_cron` | S |
| Arc 7c (profile-change trigger) | `trg_tenant_profile_change()` defined but trigger NOT attached to tenant.profile | S |

**The runtime gap is the biggest one.** Everything below the orchestrator is ready; an autonomy worker (Node/Temporal/Python) needs to:
1. Poll `dos.action_log` for `status='queued'` rows
2. Look up `dos.agent_autonomy_levels` for the agent×action_class
3. If autonomy ≥ minimum → execute; else enqueue HITL task
4. Write `dos.decision_log` entry
5. Update `dos.action_log` to succeeded/failed
6. Emit any downstream events via `fn_emit_event()`

---

## Tier 7 — 🟠 Schema only (table exists, zero data, no producer)

These are defined but waiting on infrastructure or external systems:

| Component | What's missing | Owner |
|---|---|---|
| `dos.evidence_vault` | **S3/MinIO bucket + KMS keys provisioned**; upload pipeline wired | DevOps + Security |
| `dos.access_log` | Every Tier 6 read must log here (gateway middleware change) | Backend |
| `dos.disposal_certificate` | Tier 8 retention cron + cryptographic-erase implementation | Backend + Security |
| `dos.archive_index` | Cold-tier (Glacier-equiv) provisioning + nightly archival job | DevOps |
| `dos.route_registry` | Empty — UI doesn't yet render dynamically (Angular still hardcoded) | Frontend |
| `dos.widget_registry` | Empty — dashboard composer not yet driven by registry | Frontend |
| `dos.ui_action_registry` | Empty — UI buttons still hardcoded | Frontend |
| `dos.rule_registry` | Empty — declarative rules not yet authored | Compliance + Backend |
| `dos.autonomy_promotion_log` | Manual ops governance; CISO populates as agents earn trust | Security |

---

## Tier 8 — 🔴 Not started (requires external code or systems)

| Item | Detail | Files to change | Effort |
|---|---|---|---|
| **6 new roles in canonical-roles.ts** | regulator, executive, data_protection_officer, audit_executor, risk_owner, evidence_reviewer | `platform/dauth/packages/core/access/rbac/canonical-roles.ts` + `role-permission-map.ts` | S (1d) |
| **OpenFGA model.v3.fga** | 7 new types: tenant_provisioning_plan, obligation, persona, evidence_vault, agent_action, loop_run, kpi | `platform/dauth/packages/core/adapters/openfga/model.v3.fga` + `scripts/deploy-openfga-model-v3.mjs` | S (1d) |
| **pg_cron schedules** | 7a daily expire / 7b daily schedule_audits / 7c trigger / KPI refresh per `refresh_cron` | DB-side `cron.schedule(...)` | S (½d) |
| **Agent runtime worker** | Node/Temporal/Python service that drains action_log queue, executes per autonomy level, writes decision_log | new service `services/agent-runtime/` | L (5-7d) |
| **Dynamic UI gating** | Angular guards/resolvers reading `route_registry` + `capability_registry`; widget composer reading `widget_registry` | `products/shahin-ai/app/src/app/blueprint/core/services/dynamic-ui.*` | M (3-4d) |
| **KMS rotation policy** | Per-tenant key derivation + 90-day rotation cron | `platform/secrets/` + DevOps | M (2-3d) |
| **S3/MinIO provisioning** | Buckets per tenant; lifecycle rules; access policy | DevOps | S (1d) |
| **Regulator submission dispatchers** | SAMA portal API client; SDAIA submission; CMA disclosure; ZATCA filing | new in `services/regulator-gateway/` | L (5-10d depending on regulator API maturity) |
| **AR Arabic UI for new modules** | Right-to-left + AR strings for vendor/incident/sdr companions | UI | S (1d) |

---

## Tier 9 — ⚪ Approval gates (per RECONCILIATION_REPORT.md Part 12)

| Gate | Owner | Status |
|---|---|---|
| Schema reconciliation (Parts 1-2) | DBA | ⚪ pending |
| Agent identity mapping (Part 3) | Head of AI + Compliance | ⚪ |
| 6 new SoD rules (Part 4) | Security + Compliance | ⚪ |
| OpenFGA model v3 (Part 5) | Security | ⚪ |
| Lifecycle enumerations (Part 6) | Architect | ⚪ |
| 11 indexes (Part 7) | DBA | ⚪ |
| 9 lookup seeds (Part 8) | Compliance + Engineering | ⚪ |
| 6 new roles (Part 10) | Security + Compliance | ⚪ |
| 12-day implementation plan (Part 11) | CTO + Operations Lead | ⚪ |

---

## Final tally

| State | Count | % |
|---|---|---|
| ✅ Done | 47 components | 53% |
| 🟡 Partly scaffolded | 10 components | 11% |
| 🟠 Schema only | 9 components | 10% |
| 🔴 Not started | 9 external items | 10% |
| ⚪ Approval gates | 9 gates | 10% |
| **Other** (UI/AR) | 5 | 6% |

---

## What blocks production cutover

The minimum viable autonomous platform requires **clearing the 🟡 partly-scaffolded tier** plus a few items from 🔴:

### Critical path (estimated 8-10 working days, 1 backend engineer):

1. **Agent runtime worker** (5-7d) — the single biggest gap; everything else feeds it
2. **pg_cron schedules** (½d) — wire 7a/7b/7c + KPI refresh
3. **Tier 8 trigger** (½d) — attach `trg_tenant_profile_change` to `tenant.profile`
4. **Readiness scanner** (1d) — populate the 9 boolean signals from real state
5. **Provision OpenFGA model v3** (1d) — author + deploy
6. **Add 6 roles to canonical-roles.ts** (½d) — sync RBAC

### Parallel track (UI/Frontend, 4-5 days):

7. Dynamic UI gating (route + capability registry consumers) — gates the half of the platform that's user-facing

### Pre-prod hardening (3-5 days):

8. S3/MinIO + KMS provisioning
9. Audit log SHA256 chain external anchoring (optional but recommended)
10. Cold tier + disposal automation

### Post-MVP (regulator-facing):

11. Regulator submission dispatchers (5-10d) — can be incremental per regulator

**Total minimum to ship: ~13-15 working days for a 2-engineer team (1 backend + 1 frontend).**

---

## Verification commands you can run anytime

```sql
-- 1. Health summary
SELECT * FROM dos.v_autonomy_health;

-- 2. Reconciliation status
SELECT * FROM dos.v_reconciliation_status;

-- 3. Tenant smoke test counts
SET app.current_tenant_id='t_demo_alrajhi';
SELECT 'frameworks',COUNT(*) FROM tenant.frameworks_subscribed
UNION ALL SELECT 'controls',COUNT(*) FROM tenant.controls
UNION ALL SELECT 'evidence_required',COUNT(*) FROM tenant.evidence_required
UNION ALL SELECT 'lifecycle_states',COUNT(*) FROM tenant.evidence_lifecycle_state
UNION ALL SELECT 'risks',COUNT(*) FROM tenant.risk_register;

-- 4. Latest events + their routed actions
SELECT e.id, e.event_type, e.tenant_id,
       array_agg(a.agent_id||':'||a.action_code||':'||a.status) AS routed
FROM dos.system_events e
LEFT JOIN dos.action_log a ON a.idempotency_key LIKE e.id||'-%'
GROUP BY e.id, e.event_type, e.tenant_id
ORDER BY e.id DESC LIMIT 5;

-- 5. Lifecycle gate decision
SELECT * FROM fn_check_lifecycle_gate('t_demo_alrajhi','go_live');
SELECT * FROM fn_check_lifecycle_gate('t_demo_alrajhi','audit_submission');
SELECT * FROM fn_check_lifecycle_gate('t_demo_alrajhi','cloud_migration');

-- 6. Module readiness summary
SELECT module_code, overall_status FROM dos.module_readiness_contract
WHERE tenant_id='t_demo_alrajhi' ORDER BY overall_status DESC, module_code;
```
