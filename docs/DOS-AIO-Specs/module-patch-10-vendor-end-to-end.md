# Module Patch 10 — Vendor Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 10 — Vendor Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Vendor module** end to end.

It tells an agent exactly how to:
- inspect vendor inventory, due diligence, tiering, questionnaires, risk scoring, evidence and issue linkage, continuous monitoring, and vendor governance
- compare the current implementation against the canonical vendor target
- know what belongs to Vendor, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `vendor`
- Layer: core business domain module
- Criticality: **P0 third-party risk critical**
- Runtime role: vendor inventory, onboarding, due diligence, tiering, monitoring, assessments, issues, remediation linkage, and vendor oversight
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, risk, compliance, evidence, reporting, analytics, AI, integrations, portals

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

## 2.1 What Vendor owns directly
Vendor owns:
- vendor master records from module perspective
- vendor tiering and segmentation
- due diligence/questionnaire runtime
- vendor assessments and scoring
- continuous monitoring state from module perspective
- vendor issue and remediation linkage from vendor perspective
- vendor oversight dashboards and summaries
- vendor diagnostics and admin/runtime controls

## 2.2 What Vendor consumes from DOS
Vendor consumes:
- org/foundation context
- platform shell, navigation, and admin frameworks
- event backbone
- observability
- product/module enablement context

## 2.3 What Vendor consumes from DAuth
Vendor consumes:
- scoped access
- review/approval/sign-off authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- external scope/invitation controls where applicable

## 2.4 What Vendor consumes from adjacent modules
- Risk for vendor risk linkage and scoring context
- Compliance for due diligence/compliance obligations
- Evidence for vendor evidence collection
- Workflow for onboarding/review/approval/escalation flows
- Portals/Integrations for external vendor interactions
- Reporting/Analytics for oversight metrics
- AI for questionnaire analysis, scoring hints, and monitoring narratives

## 2.5 What Vendor must not implement
Vendor must not own:
- auth/access truth
- duplicate invitation/external-access truth outside DAuth
- hidden workflow engine
- hidden portal or connector truth outside approved contracts

---

## 3. Canonical Backend Structure

```text
backend/src/modules/vendor/
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
  vendor.module.ts
```

## 3.1 Required backend service families
- vendor master service
- vendor onboarding service
- vendor tiering service
- due diligence/questionnaire service
- vendor assessment/scoring service
- vendor monitoring service
- vendor issue/remediation linkage service
- vendor dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/vendor/
  pages/
  components/
  services/
  dashboards/
  onboarding/
  assessments/
  monitoring/
  questionnaires/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- vendor hub
- vendor inventory/detail views
- onboarding and due diligence views
- questionnaire and assessment views
- monitoring and scoring views
- dashboards and summaries
- diagnostics/admin views

---

## 5. Data Model Requirements

Vendor may own or consume:
- vendor master tables
- vendor tier/config tables
- questionnaire/assessment tables
- scoring and monitoring tables
- evidence linkage tables
- issue/remediation linkage tables
- dashboard/support tables
- audit/history tables for vendor actions

DOS owns platform/foundation truth.
DAuth owns control truth.
Vendor owns vendor-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- vendor CRUD and retrieval
- onboarding/due diligence
- questionnaire/assessment actions
- scoring/monitoring retrieval
- dashboards and summaries
- diagnostics/admin

Required contracts:
- vendor contract
- tiering contract
- questionnaire/assessment contract
- scoring/monitoring contract
- issue/evidence linkage contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Vendor must integrate with workflow for:
- vendor onboarding review/approval
- assessment review
- issue/remediation escalation
- re-assessment cadence and approvals
- offboarding or suspension flows where applicable

Vendor must integrate with DAuth for:
- scoped access
- sign-off/review authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization
- external user scope/invitation control where applicable

No protected vendor approval or sign-off may bypass workflow + DAuth.

---

## 8. AI Integration

Allowed AI participation:
- questionnaire summarization
- scoring support
- anomaly and monitoring narrative
- due diligence hinting
- vendor-risk narrative generation
- remediation prioritization support

Restricted AI behavior:
- no autonomous final vendor approval/sign-off
- no hidden risk/tier override
- no protected state transition outside workflow/DAuth rules

---

## 9. UI and Experience Requirements

Vendor UI must provide:
- vendor inventory and detail views
- onboarding and due diligence flows
- questionnaires and assessments
- scoring/monitoring visibility
- issue/evidence linkage visibility
- dashboards and summaries
- diagnostics/admin/runtime surfaces

Must define:
- empty/loading/error
- pending due diligence
- pending review
- blocked/authority required
- delegated
- escalated
- monitored
- suspended
- offboarded/archived states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- tiering policy visibility
- questionnaire/assessment configuration visibility
- monitoring cadence visibility
- portal/external-access visibility where applicable
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- vendor onboarding actions
- questionnaire/assessment events
- scoring changes
- monitoring events
- approval/sign-off events
- issue/remediation linkage events
- AI assistance usage where applicable

Required metrics:
- vendors by tier/status
- assessment completion rate
- overdue reviews
- monitoring alerts
- issue/remediation backlog
- onboarding cycle time

Required diagnostics:
- onboarding pipeline diagnostics
- questionnaire/assessment diagnostics
- monitoring pipeline diagnostics
- blocked approval diagnostics
- portal/external-access diagnostics where applicable

---

## 12. Required Tests

- vendor CRUD tests
- tiering and onboarding tests
- questionnaire/assessment tests
- monitoring/scoring tests
- issue/evidence linkage tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If vendor onboarding and portal/external access are conflated:
- keep vendor-domain runtime truth in Vendor
- keep external access/invitation/security truth in DAuth and portal contracts

If vendor approvals bypass DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If vendor monitoring exists without diagnostics:
- add monitoring, onboarding, and assessment diagnostics before release

---

## 14. Acceptance Criteria

Pass only if:
- vendor-domain truth is centralized in Vendor
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- onboarding/assessment/monitoring/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected vendor approval/sign-off bypasses workflow/DAuth
- vendor truth is fragmented or hidden
- monitoring/onboarding lacks diagnostics or auditability
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next likely module patch is:

**Module Patch 11 — Reporting Module End-to-End** or the next priority module in your sequence.

---

## 17. One-Line Use Instruction

Use this patch to compare the current vendor implementation against the full canonical vendor target, classify every vendor-layer gap, build only the missing vendor artifacts, validate against vendor pass/fail rules, and update the as-built ledger.
