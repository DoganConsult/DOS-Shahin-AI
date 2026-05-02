# Module Patch 05 — Risk Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 05 — Risk Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Risk module** end to end.

It tells an agent exactly how to:
- inspect risk registers, scoring, appetite linkage, KRIs, treatment, approvals, reporting, AI assistance, and control integration
- compare current implementation against the canonical risk target
- know what belongs to Risk, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to Reporting/Analytics/AI
- know exactly what artifacts to build and what not to duplicate

### 0.4 Module identity
- Module code: `risk`
- Layer: core business domain module
- Criticality: **P0 core GRC module**
- Runtime role: risk register, scoring, appetite alignment, treatment tracking, KRI monitoring, approval and escalation of risk decisions
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, reporting, analytics, evidence, compliance, governance, AI

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0
- Patch 1
- Patch 3
- Patch 4
- Patch 5
- Patch 6
- Patch 7
- Patch 8 where AI participates
- Patch 9
- Patch 10 where dynamic UI exists
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. Module Purpose and Boundaries

## 2.1 What Risk owns directly
Risk owns:
- risk register entries
- risk taxonomy/category mapping as module truth where approved
- inherent/residual scoring
- risk criteria and appetite linkage
- KRI definitions and breach evaluation where module-owned
- treatment plans and action linkage
- risk review and approval flows
- risk dashboards and executive summaries
- risk diagnostics and admin/runtime controls

## 2.2 What Risk consumes from DOS
Risk consumes:
- org structure and ownership assignments
- workspace/product/module context
- event backbone
- observability
- shell/navigation and dashboard frameworks

## 2.3 What Risk consumes from DAuth
Risk consumes:
- access control
- scoped ownership
- approval authority
- sign-off rules
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

## 2.4 What Risk consumes from other modules
- Governance for risk appetite and oversight
- Evidence for evidence linkage
- Compliance for framework/control cross-mapping
- Workflow for review, escalation, and approval flows
- Reporting/Analytics for summaries
- AI for scoring insight and recommendation where allowed

## 2.5 What Risk must not implement
Risk must not own:
- auth/access truth
- duplicate appetite/authority truth outside approved boundaries
- a hidden workflow engine
- a hidden event bus
- local override of SoD or sign-off policy

---

## 3. Canonical Backend Structure

```text
backend/src/modules/risk/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  policies/
  data/
  index.ts
  risk.module.ts
```

## 3.1 Required service families
- risk register service
- risk scoring service
- risk criteria service
- risk appetite linkage service
- KRI service
- treatment plan service
- risk review/approval service
- risk dashboard/summary service
- risk diagnostics service
- risk AI recommendation adapter where applicable
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/risk/
  pages/
  components/
  services/
  dashboards/
  kri/
  treatment/
  review/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- risk hub
- risk register
- risk detail
- scoring and appetite views
- KRI views
- treatment plans
- approval/review views
- executive dashboard
- diagnostics/admin

---

## 5. Data Model Requirements

Risk may own or consume:
- risk register tables
- risk criteria
- risk categories
- appetite mappings
- KRI definitions and breach logs
- treatment plan tables
- review and approval linkage tables
- dashboard and summary runtime support tables where approved
- audit/history tables for risk changes

DOS owns foundation structure.
DAuth owns control truth.
Risk owns risk-domain truth.

---

## 6. API Surface Requirements

Required route groups:
- risk CRUD
- scoring and criteria
- appetite linkage
- KRI management and breach visibility
- treatment plans
- approval/review actions
- dashboard/summary retrieval
- diagnostics/admin

Required contracts:
- risk entity contract
- score contract
- appetite alignment contract
- KRI contract
- treatment plan contract
- review/approval contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Risk must integrate with workflow for:
- risk review states
- approval states
- escalation on high severity or overdue risks
- treatment plan lifecycle
- KRI breach-triggered flows where applicable

Risk must integrate with DAuth for:
- risk ownership scope
- approval authority/sign-off
- self-approval prevention
- delegation
- SoD
- lifecycle authorization

No protected risk approval may be implemented via raw role checks only.

---

## 8. AI Integration

Allowed AI participation:
- scoring assistance
- treatment recommendation
- risk narrative generation
- KRI anomaly or trend summarization
- prioritization and next-best action
- executive summary generation

Restricted AI behavior:
- no autonomous final approval/sign-off
- no hidden score overrides without audit
- no protected mutations outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Risk UI must provide:
- register and detail views
- scoring surfaces
- appetite alignment views
- KRI visuals
- treatment and action views
- review/approval state visibility
- audit and diagnostics surfaces
- executive dashboards

Must define:
- empty/loading/error
- blocked/authority-required
- delegated
- escalated
- overdue
- archived
- accepted/mitigated/closed states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- risk criteria configuration
- appetite linkage configuration visibility
- KRI thresholds and monitoring visibility
- review/approval configuration visibility
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- risk created/updated/closed
- scoring changes
- appetite alignment changes
- KRI breaches
- review/approval outcomes
- delegated or blocked actions
- AI recommendation usage

Required metrics:
- open risk counts by severity
- review latency
- treatment completion rate
- KRI breach rate
- overdue risk rate
- approval block rate

Required diagnostics:
- scoring inconsistency diagnostics
- KRI pipeline diagnostics
- blocked approval diagnostics
- treatment workflow diagnostics

---

## 12. Required Tests

- risk register tests
- scoring and appetite tests
- KRI tests
- treatment plan tests
- approval/authority tests
- delegation and SoD tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If risk scoring is scattered:
- centralize scoring logic and contracts
- keep AI recommendations separate from final scoring truth unless explicitly governed

If risk approvals bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If KRI visibility exists without runtime diagnostics:
- add KRI diagnostics, breach pipeline diagnostics, and operator surfaces

---

## 14. Acceptance Criteria

Pass only if:
- risk-domain truth is centralized in Risk
- DOS and DAuth boundaries are respected
- workflow and approval paths are explicit
- scoring/KRI/treatment/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected approvals bypass DAuth/workflow
- scoring truth is fragmented or hidden
- KRI/treatment runtime lacks diagnostics and tests
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next likely module patch is:

**Module Patch 06 — Compliance Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current risk implementation against the full canonical risk target, classify every risk-layer gap, build only the missing risk artifacts, validate against risk pass/fail rules, and update the as-built ledger.
