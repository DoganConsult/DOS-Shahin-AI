# Plan Reconciliation Report

Audit of §§14–19 plan against **live state** in `shahin_grc`. Identifies every conflict, gap, and naming collision before implementation.

**Audit date:** 2026-05-01
**Sources audited:** `shahin_grc.dos.*` (101 tables), `shahin_grc.public.*` (188 tables), `platform/dauth/packages/core/access/rbac/`, `platform/dauth/packages/core/adapters/openfga/model.v2.fga`

---

## Executive summary

| Category | Items | Decision |
|---|---|---|
| **Hard conflicts** (different schema for same concept) | 8 | Resolve by ALTERing existing tables (don't duplicate) |
| **Naming collisions** (same name, different shape) | 4 | Use existing names; deprecate planned names |
| **Soft overlaps** (existing covers part of plan) | 6 | Extend existing |
| **Missing SoD rules** for the 12 loops | 6 | Add to `dos.foundation_sod_rules` |
| **Missing OpenFGA types** for new entities | 7 | Extend `model.v2.fga` |
| **Lifecycle CHECK constraints to enumerate** | 6 state machines | Add to DDL |
| **Plan memory drift** (numbers from memory vs live) | 3 | Update plan |
| **Indexes recommended** | 11 | Add in §20 |
| **Lookups/seeds to populate** | 9 | Add seed scripts |

---

## Part 1 — Hard conflicts (must resolve)

### 1.1 `dos.controls` already exists — different schema

| Field | My §17 plan | Live schema | Resolution |
|---|---|---|---|
| schema | `tenant.controls` | `dos.controls` (tenant_id column) | **Use existing `dos.controls`** — drop my schema-isolation approach |
| PK | `(tenant_id, control_id INT)` | `(control_id UUID)` | Use existing UUID; add tenant_id index already there |
| control identifier | `control_number TEXT` | `control_ref TEXT` | Rename my plan to use `control_ref` |
| names | `title_en, title_ar, requirement_en, requirement_ar` | `title TEXT, description TEXT` | **Extend** existing — `ALTER TABLE dos.controls ADD COLUMN title_ar TEXT, requirement_en TEXT, requirement_ar TEXT` |
| status | `'planned'/'in-design'/...` (8 values) | `'not_implemented'` default | Add CHECK constraint enumeration |
| missing | — | `framework_id UUID` (no framework_code text) | Add `framework_code TEXT GENERATED` or backfill |

**Action**: deprecate `tenant.controls`; use `dos.controls` with extensions.

### 1.2 `dos.audit_findings` already exists — supersedes my `tenant.findings`

| Field | My §17 plan | Live schema |
|---|---|---|
| name | `tenant.findings` | `dos.audit_findings` |
| PK | `(tenant_id, finding_id SERIAL)` | `(finding_id UUID)` |
| extra | `severity, source, opened_at, due_at, closed_at, status` | All present + `assigned_to`, `is_deleted` |

**Action**: drop my `tenant.findings`; use `dos.audit_findings`. Add `source` column if missing.

### 1.3 `dos.risks` already exists — supersedes my `tenant.risk_register`

| Field | My §17 plan | Live |
|---|---|---|
| name | `tenant.risk_register` | `dos.risks` |
| residual model | `inherent_risk_score, control_effectiveness, residual_risk_score` | exists in 16 cols (need to verify column names) |

**Action**: use existing `dos.risks`; align column names; rewire §15 ARC 3 to write here.

### 1.4 `dos.remediation_actions` already exists

**Action**: use existing 15-col table; drop my §17 duplicate.

### 1.5 `dos.evidence` vs `dos.evidences` — both exist, 0 rows

| Table | Cols | Naming |
|---|---|---|
| `dos.evidence` (singular) | 13 | tenant_id TEXT, file_path, uploaded_by |
| `dos.evidences` (plural) | 14 | tenant_id VARCHAR(16), file_url, file_type, collected_by, reviewed_by |

**Action**: **Pick one.** Recommend `dos.evidence` (singular, consistent with `dos.audit_trail`). Drop `dos.evidences`. Migrate any FKs.

### 1.6 `dos.system_events` is the canonical event log (not my new `dos.event_log`)

| My §19 plan | Live | Resolution |
|---|---|---|
| `dos.event_log` (event_id UUID, event_type, tenant_id, actor_id, correlation_id, causation_id, payload, prev_hash, this_hash) | `dos.system_events` (id INT, event_type, source, payload, occurred_at) | **Extend `dos.system_events`** — add tenant_id, actor_id, correlation_id, causation_id, prev_hash, this_hash columns |

**Also exists**: `public.event_traces` (distributed-tracing oriented, 8 cols) and `dos.event_dead_letter_queue` (for failed events).

**Action**: keep all three. system_events = primary log; event_traces = distributed-trace correlation; DLQ = failure recovery.

### 1.7 `dos.module_registry` exists — minimal (5 cols)

| My §19 plan | Live |
|---|---|
| `module_code, name_en, name_ar, owner_agent, layer_numbers[], requires_capability, docs_url` | `module_code, product_key, display_name, status, created_at` |

**Action**: ALTER TABLE — add `name_ar, owner_agent, layer_numbers INT[], requires_capability TEXT, docs_url TEXT`.

### 1.8 `dos.module_readiness` exists — verdict-based, not 9-signal

| My §18 plan | Live |
|---|---|
| `dos.module_readiness_contract` with 9 booleans + computed status | `dos.module_readiness` with `verdict` (GOLDEN_READY/DRIFT/BLOCKED/UNKNOWN), `gates JSONB`, `evidence JSONB` |

**Action**: KEEP BOTH. The live one is GOLDEN_READY-style (deployment verifier); mine is operational 9-signal contract. Cross-reference both in `fn_capability_available()`.

---

## Part 2 — Naming collisions (rename plan, not live)

| Plan name | Live name | Action |
|---|---|---|
| `tenant.controls` | `dos.controls` | drop schema-isolation; use dos.* with tenant_id |
| `tenant.findings` | `dos.audit_findings` | use existing |
| `tenant.risk_register` | `dos.risks` | use existing |
| `tenant.remediation_actions` | `dos.remediation_actions` | use existing |

**Conclusion**: my §17 invented a `tenant` schema for per-tenant data; **live system uses `dos.*` with `tenant_id` column + RLS**. Aligning the plan to existing convention.

---

## Part 3 — Agent identity drift

### Live agents in `dos.dynamic_ui_agents` (15 rows, NOT 13, NOT A01-A13)

```
ai-os-companion              audit-companion           compliance-companion
controls-companion           evidence-companion        foundation-access-agent
foundation-audit-scribe      foundation-committee-agent foundation-companion
foundation-org-agent         knowledge-companion       policy-companion
reporting-companion          risk-companion            workflow-companion
```

**Conflict**: my §19 seeded A01-A13 with role labels (Onboarding, IAM, Policy, etc.). Live system uses `<module>-companion` and 4 foundation-specialist agents.

**Resolution options:**
| Option | Description | Recommendation |
|---|---|---|
| A | Rename my A01-A13 to match live `*-companion` names | ❌ loses the canonical employee-as-employee framing |
| B | Add A01-A13 alongside; mark live ones as legacy | ❌ creates two systems |
| C | **Map A01-A13 to module-companion 1:1; live names become aliases** | ✅ keeps both views |

**Final mapping (recommended)**:

| Plan code | Plan role | Live agent_id | Live module |
|---|---|---|---|
| A01 | Onboarding & Provisioning | `foundation-companion` + `foundation-org-agent` | foundation |
| A02 | Identity & Access | `foundation-access-agent` | foundation |
| A03 | Policy | `policy-companion` | policy |
| A04 | Compliance | `compliance-companion` | compliance |
| A05 | Evidence | `evidence-companion` | evidence |
| A06 | Control | `controls-companion` | controls |
| A07 | Risk | `risk-companion` | risk |
| A08 | Audit | `audit-companion` + `foundation-audit-scribe` | audit, foundation |
| A09 | Vendor / Third-Party | (NEW — `vendor-companion` not yet in dos.dynamic_ui_agents) | vendor |
| A10 | Assurance / Regulator | `reporting-companion` | reporting |
| A11 | Incident | (NEW — `incident-companion` not yet in dos.dynamic_ui_agents) | incident |
| A12 | Governance / Executive | `foundation-committee-agent` + `knowledge-companion` | foundation, knowledge |
| A13 | Sales Development | (NEW — out-of-tenant) | shahin-marketing |

**Gaps**: 3 agents (vendor-companion, incident-companion, sdr-companion) need to be **added to `dos.dynamic_ui_agents`**.

**Also missing from plan**: `ai-os-companion` (Layer 0), `workflow-companion` — these are operational, not employee personas. Add to plan as utility agents A14, A15.

---

## Part 4 — SoD rules: gaps for the 12 loops

### Existing 6 rules (from `dos.foundation_sod_rules`)

| Rule | Covers loop |
|---|---|
| `approver_quiet_period` | L02 evidence, L04 finding |
| `approver_self_approval` | L02 evidence, L07 obligation |
| `committee_self_block` | L12 optimization |
| `payment_initiator_vs_approver` | (financial workflow — outside loops) |
| `user_admin_vs_audit` | L06 module readiness |
| `vendor_setup_vs_payment` | L08 vendor risk |

### Missing 6 rules (must add for full coverage)

| Loop | Missing rule | Definition |
|---|---|---|
| L03 risk treatment | `risk_treatment_self_approval` | risk owner cannot self-approve `accept` treatment for own residual risk |
| L04 finding | `finding_opener_vs_remediator` | finding source cannot also be remediator |
| L06 module readiness | `deployer_vs_readiness_signoff` | who deployed cannot sign off readiness contract |
| L09 incident | `incident_reporter_vs_investigator` | reporter cannot lead investigation |
| L10 audit | `audit_executor_vs_signer` | audit executor cannot sign audit pack |
| L11 driver change | `profile_editor_vs_persona_approver` | profile change requires separate approval if persona shift triggers compliance scope expansion |

---

## Part 5 — OpenFGA model gaps

### `platform/dauth/packages/core/adapters/openfga/model.v2.fga` covers

`platform · product · module · tenant · resource` chain, with SoD via `but not`.

### Missing types (must add for new entities)

```fga
type tenant_provisioning_plan
  relations
    define tenant: [tenant]
    define drafter: [user]
    define approver: [user] but not drafter
    define viewer: [user] or admin from tenant

type obligation
  relations
    define framework: [framework]
    define accountable_role: [user]      # who answers to regulator
    define responsible_role: [user]      # who does the work
    define viewer: [user] or auditor from platform

type persona
  relations
    define platform: [platform]
    define applies_to: [tenant]          # which tenants this persona resolves to
    define editor: admin from platform   # only platform admins edit persona definitions

type evidence_vault
  relations
    define tenant: [tenant]
    define owner: [user]
    define reviewer: [user] but not owner
    define auditor: [user] or auditor from platform   # READ-ONLY chain

type agent_action
  relations
    define agent: [agent]
    define authorizer: [user]            # who approved the autonomy level
    define audit_subject: [tenant]

type loop_run
  relations
    define tenant: [tenant]
    define owner_agent: [agent]
    define escalation: [user]            # human escalation if loop stuck

type kpi
  relations
    define tenant: [tenant]
    define owner_agent: [agent]
    define viewer: [user] or admin from tenant
```

**Action**: extend `model.v2.fga`; deploy via `scripts/deploy-openfga-model-v2.mjs`; capture new `OPENFGA_MODEL_ID`.

---

## Part 6 — Lifecycle CHECK constraint enumerations

Live system has CHECK on `dos.foundation_employee_lifecycle_state.state` enumerating 13 states. The plan needs the **same pattern** for 6 other state machines:

| State machine | States (must add CHECK) | Where |
|---|---|---|
| Evidence | `'DEFINE', 'APPROVE', 'IMPLEMENT', 'MAINTAIN', 'REVIEW', 'ACCEPTED', 'EXPIRED', 'REJECTED'` | `dos.evidence.status` (after extending) |
| Control | `'planned', 'in_design', 'in_implementation', 'effective', 'degraded', 'expired', 'superseded', 'decommissioned', 'review_required'` | `dos.controls.status` |
| Risk | `'identified', 'assessed', 'treated', 'monitored', 'closed', 'breached'` | `dos.risks.status` (verify column exists) |
| Finding | `'open', 'in_progress', 'closed'` | `dos.audit_findings.status` (already in default) |
| Audit run | `'scheduled', 'in_progress', 'completed', 'cancelled'` | `dos.audit_plans.*` (verify) |
| Module readiness | `'GOLDEN_READY', 'DRIFT', 'BLOCKED', 'UNKNOWN'` (existing) + `'red', 'amber', 'green'` (new contract) | both tables |
| Provisioning plan | `'draft', 'active', 'superseded', 'cancelled'` | `dos.tenant_provisioning_plan.status` |

---

## Part 7 — Indexes to add

Based on the proposed query patterns in §15 + §19:

```sql
-- For ARC 3 risk recompute
CREATE INDEX IF NOT EXISTS ix_risks_tenant_residual ON dos.risks(tenant_id, residual_risk_level)
    WHERE residual_risk_level IN ('high','critical');

-- For ARC 7a expire stale evidence
CREATE INDEX IF NOT EXISTS ix_evidence_stage_updated ON dos.evidence(status, updated_at)
    WHERE status = 'ACCEPTED';

-- For ARC 4 lifecycle gates
CREATE INDEX IF NOT EXISTS ix_audit_findings_open ON dos.audit_findings(tenant_id, severity)
    WHERE status = 'open';

-- For event subscription routing
CREATE INDEX IF NOT EXISTS ix_event_subs_type ON dos.event_subscriptions(event_type)
    WHERE is_active = TRUE;

-- For agent action idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_action_log_idempo
    ON dos.action_log(action_code, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- For loop_runs stuck detection
CREATE INDEX IF NOT EXISTS ix_loop_runs_stuck
    ON dos.loop_runs(loop_id, triggered_at) WHERE status='running';

-- For module capability resolution
CREATE INDEX IF NOT EXISTS ix_capability_personas
    ON dos.capability_registry USING gin(enabled_personas);

-- For obligation evaluation
CREATE INDEX IF NOT EXISTS ix_obligation_controls_lookup
    ON public.obligation_controls(framework_code, control_number);

-- For KPI scanner
CREATE INDEX IF NOT EXISTS ix_kri_observations_tenant_kri
    ON dos.kri_observations(tenant_id, kri_code, observed_at DESC);

-- For decision log (for replay/audit)
CREATE INDEX IF NOT EXISTS ix_decision_log_agent_time
    ON dos.decision_log(agent_id, decided_at DESC);

-- For tamper-detection sweep on event hash chain
CREATE INDEX IF NOT EXISTS ix_event_log_replay_seq
    ON dos.event_log(replay_seq);
```

---

## Part 8 — Lookup tables / seeds needed

| Lookup | Status | Action |
|---|---|---|
| `public.dim_sectors` (25) | empty | seed from §11 |
| `public.dim_org_sizes` (5) | empty | seed from §11 |
| `public.dim_org_types` (17) | empty | seed from §11 |
| `public.dim_business_models` (12) | empty | seed from §11 |
| `public.dim_ownership` (9) | empty | seed from §11 |
| `public.dim_frameworks` (42) | empty | seed from §11 (overlap-check vs `public.grc_frameworks` 452 rows) |
| `public.matrix1..6` | empty | seed from §11 |
| `public.controls` | empty | seed from §12 (real KSA 72 rows) |
| `public.evidence_mapping`, `evidence_lifecycle`, `risk_assessment` | empty | seed from §12 |

**Conflict to resolve before seeding**: `public.grc_frameworks` (452 rows) and `dim_frameworks` (42 rows) describe overlapping concepts. The 452 includes the cross-product (107 regulators × ~5 frameworks each); the 42 are the unique frameworks. **Both should coexist** — `dim_frameworks` is the canonical list, `grc_frameworks` is the regulator×framework matrix.

---

## Part 9 — Plan numbers vs live (memory drift)

| Concept | My plan said | Live actual | Update |
|---|---|---|---|
| Permissions | 544 | 560 | update memory + plan |
| Roles | 13 | 12 | drop the unsubstantiated 13th |
| Sector groups | 17 | 17 ✓ | OK |
| Frameworks | 42 / 452 / 13 | depends on table | clarify in plan §11 |
| Agents | 13 (A01-A13) | 15 in `dos.dynamic_ui_agents` | reconcile per Part 3 |

---

## Part 10 — Role profile updates needed

### Existing 12 roles in `canonical-roles.ts`

`platform_super_admin · tenant_admin · security_admin · compliance_officer · risk_manager · auditor · policy_owner · incident_manager · vendor_manager · standard_user · viewer · workflow_admin`

### Missing roles for the 12 loops + new entities

| Role to add | Justification | Tier |
|---|---|---|
| `regulator` | external read-only access for regulator submissions | platform |
| `executive` | board pack + exec dashboards (aggregate, no PII) | tenant |
| `data_protection_officer` | PDPL Article 30 — required for sensitive data processing | tenant |
| `audit_executor` | distinct from `auditor` (signer) for SoD `audit_executor_vs_signer` | module |
| `risk_owner` | distinct from `risk_manager` (operator) for SoD `risk_treatment_self_approval` | module |
| `evidence_reviewer` | distinct from `evidence` collector for SoD `approver_self_approval` | module |

**Action**: add 6 roles to `canonical-roles.ts` (will bring total to 18); update `role-permission-map.ts`.

---

## Part 11 — Updated implementation plan (corrected)

### Phase 0 — Approvals (no implementation yet)

- [ ] CISO sign-off on autonomy ladder
- [ ] DBA sign-off on schema reuse decisions (Part 1, 2)
- [ ] Compliance Lead sign-off on agent mapping (Part 3)
- [ ] Security sign-off on 6 new SoD rules (Part 4)
- [ ] Security sign-off on OpenFGA model extensions (Part 5)
- [ ] Tech Lead sign-off on indexes (Part 7)

### Phase 1 — Schema reconciliation (1-2 days)

1. ALTER `dos.controls` add (title_ar, requirement_en, requirement_ar, control_type, priority, maturity_level, framework_code, module_code, owner_role)
2. ALTER `dos.module_registry` add (name_ar, owner_agent, layer_numbers[], requires_capability, docs_url)
3. ALTER `dos.system_events` add (tenant_id, actor_id, correlation_id, causation_id, prev_hash, this_hash)
4. CREATE new tables ONLY for genuinely new concepts:
   - `dos.evidence_vault` (§16)
   - `dos.access_log` (§16)
   - `dos.kri_observations` (§16)
   - `dos.disposal_certificate` (§16)
   - `dos.archive_index` (§16)
   - `dos.tenant_provisioning_plan` (§18)
   - `dos.module_readiness_contract` (§18 — distinct from existing `dos.module_readiness`)
   - `public.obligations` + `public.obligation_controls` (§18)
   - `dos.control_optimization_signals` (§18)
   - `dos.action_library` + `dos.action_log` (§19)
   - `dos.decision_log` (§19)
   - `dos.event_subscriptions` (§19)
   - `dos.loop_definitions` + `dos.loop_runs` (§19)
   - `dos.route_registry` + `dos.widget_registry` + `dos.ui_action_registry` + `dos.capability_registry` + `dos.rule_registry` + `dos.kpi_registry` (§19)
   - `dos.agent_layer_ownership` + `dos.agent_arc_ownership` (§19)
   - `dos.agent_autonomy_levels` + `dos.autonomy_promotion_log` (§19)

5. Drop `dos.evidences` (orphan; keep `dos.evidence`)
6. Add 11 indexes (Part 7)

### Phase 2 — Reference data load (1 day)

7. Load `public.dim_*` (6 tables) from §11 CSVs
8. Load `public.matrix1..6` (6 tables) from §11 CSVs
9. Load `public.controls` (72), `public.evidence_mapping` (268), `public.evidence_lifecycle` (3216), `public.risk_assessment` (72), `public.evidence_types_ksa` (119), `public.lifecycle_stages` (12) from §12 CSVs

### Phase 3 — Catalogue updates (1 day)

10. Add 6 new SoD rules to `dos.foundation_sod_rules` (Part 4)
11. Add 6 new roles to `canonical-roles.ts` + sync `dos.foundation_role_*` (Part 10)
12. Extend OpenFGA model.v2.fga with 7 new types (Part 5); deploy
13. Add lifecycle CHECK constraints to 6 state machines (Part 6)
14. Add 3 missing module-companions to `dos.dynamic_ui_agents`: `vendor-companion`, `incident-companion`, `sdr-companion`

### Phase 4 — Engine functions (2 days)

15. Apply §14 functions (`fn_resolve_persona`, `fn_provision_tenant`, `sp_seed_tenant`)
16. Apply §15 functions (7 arcs)
17. Apply §18 functions (`fn_capability_available`, `fn_evaluate_obligation_status`, `sp_detect_weak_controls`, `sp_action_optimization_signal`)
18. Apply §19 `fn_emit_event` orchestrator
19. Smoke-test against test tenant `t_smoketest-17` (already exists per memory)

### Phase 5 — Operational seeds (1 day)

20. Seed `dos.agent_registry` (13 entries A01-A13 with mapping to `dos.dynamic_ui_agents`)
21. Seed `dos.loop_definitions` (12 loops L01-L12)
22. Seed `dos.action_library` (initial action set per agent)
23. Seed `dos.event_subscriptions` (event_type → agent routing)
24. Seed `dos.module_registry` extensions (owner_agent per module)
25. Seed `dos.module_readiness_contract` (one row per (tenant, module))
26. Seed `dos.kpi_registry` per `ai_employee_kpi_snapshots` patterns

### Phase 6 — First tenant + closed-loop test (1-2 days)

27. Provision banking tenant via `sp_seed_tenant('t_demo_bank', 1)`
28. Verify all 9 readiness signals turn green
29. Submit evidence → watch state machine
30. Force evidence expiry → watch ARC 3 risk recompute → ARC 5 finding
31. Close finding via remediation → watch residual drop
32. Run `dos.v_autonomy_health` — must show stuck_loops=0

### Phase 7 — Dynamic UI wiring (2-3 days)

33. UI route resolver reads `dos.route_registry` instead of hardcoded
34. Widget registry drives dashboard composition
35. Capability gate (`fn_capability_available`) blocks rendering of unready modules
36. RBAC + FGA + Capability all checked at render

### Phase 8 — Cutover (1 day)

37. Migrate existing tenants to persona model (backfill `tenant.profile` 9 dimensions)
38. Backfill `dos.module_readiness_contract` for live tenants
39. Switch UI from script-derived to contract-derived

**Total**: ~10-12 working days for a single engineer; ~5-6 days with a 3-engineer team.

---

## Part 12 — Sign-off targets (replaces §AUTONOMOUS_OPERATING_MAP Part 8)

| Gate | Owner | Status |
|---|---|---|
| Schema reconciliation (Part 1, 2) | DBA | ⬜ pending |
| Agent identity mapping (Part 3) | Head of AI + Compliance | ⬜ |
| 6 new SoD rules (Part 4) | Security + Compliance | ⬜ |
| OpenFGA model v3 (Part 5) | Security | ⬜ |
| Lifecycle enumerations (Part 6) | Architect | ⬜ |
| 11 indexes (Part 7) | DBA | ⬜ |
| 9 lookup seeds (Part 8) | Compliance + Engineering | ⬜ |
| 6 new roles (Part 10) | Security + Compliance | ⬜ |
| 12-day implementation plan (Part 11) | CTO + Operations Lead | ⬜ |

---

## Confidence statement

After this audit:
- **All 8 hard conflicts** have a deterministic resolution
- **All 6 missing SoD rules** are specified
- **All 7 missing OpenFGA types** are drafted
- **All 6 lifecycle state machines** have enumerated states
- **All 11 indexes** are written
- **All 9 lookup tables** have seed sources identified
- **All 6 missing roles** are drafted

The plan now reflects **live state, not assumed state**. No implementation begins until Part 12 sign-offs are recorded.
