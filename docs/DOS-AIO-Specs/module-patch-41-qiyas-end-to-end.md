# Module Patch 41 — Qiyas Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 41 — Qiyas Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Qiyas module** end to end.

It tells an agent exactly how to:
- inspect the qiyas module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical qiyas target
- know what belongs to Qiyas, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `qiyas`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: maturity assessment, benchmarking, calibration, certification, and comparative scoring
- Primary dependency domains: DOS shell/events, DAuth control spine, workflow, analytics, reporting, compliance, AI

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 — Common Enforcement Standard
- Patch 1 — Platform Full Stack Core
- Patch 3 — DAuth Security and Control Spine
- Patch 4 — Product Stack
- Patch 5 — Product Server Stack
- Patch 6 — Module Stack
- Patch 7 — Workflow Stack
- Patch 8 — AI Agent Stack where AI participates
- Patch 9 — UI Feature and Component Stack
- Patch 10 — Centralized Dynamic UI Stack where dynamic UI exists
- Patch 11 — Settings / Tenant Admin / Platform Admin where runtime controls exist
- Patch 12 — Operations / Observability / Handover
- Patch 13 — Integration / Connector / External API Ecosystem where applicable
- Patch 14 — Delivery / Quality / Migration / Cutover / Release
- Patch 15 — Master Cross-Patch Traceability and Agent Execution Protocol


## 2. Module Purpose and Boundaries

## 2.1 What Qiyas owns directly
- assessment instruments and scoring from the qiyas perspective
- benchmark and calibration surfaces
- certification and maturity dashboards, diagnostics, and admin/runtime controls

## 2.2 What Qiyas consumes from DOS
- shell runtime
- event backbone
- observability
- tenant context

## 2.3 What Qiyas consumes from DAuth
- scoped access
- assessment or certification sign-off authority
- delegation
- SoD
- lifecycle authorization

## 2.4 What Qiyas consumes from adjacent modules
- analytics and reporting for outputs
- compliance and related modules as sources
- workflow for reviews and approvals
- AI for summarization

## 2.5 What Qiyas must never implement
- own auth truth
- duplicate generic analytics truth
- protected certification bypass outside workflow + DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/qiyas/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  assessments/\n  calibration/\n  certification/\n
  index.ts
  qiyas.module.ts
```

## 3.1 Required backend service families
- QiyasAssessmentService
- QiyasScoringService
- QiyasBenchmarkService
- QiyasCalibrationService
- QiyasCertificationService
- QiyasDashboardService
- QiyasDiagnosticsService
- QiyasAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/qiyas/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  assessments/\n  calibration/\n  certification/\n
  index.ts
```

## 4.1 Required UI surfaces
- qiyas hub
- assessment views
- benchmark and calibration views
- certification views
- dashboards and diagnostics
- admin views

---

## 5. Data Model Requirements

- assessment tables
- scoring tables
- benchmark tables
- calibration tables
- certification tables
- qiyas audit/history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Qiyas owns qiyas-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- assessment actions
- scoring retrieval
- benchmark and calibration actions
- certification actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- assessment contract
- score contract
- benchmark contract
- certification contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- certification sign-off flows
- assessment review flows
- escalation for failed maturity obligations where applicable

### 7.2 DAuth integration
- scoped access
- sign-off authority
- delegation
- SoD
- lifecycle authorization

No protected qiyas transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- assessment summary support
- benchmark narration
- gap explanation

### 8.2 Restricted AI behavior
- autonomous protected certification

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- draft
- in assessment
- under review
- certified
- blocked
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- assessment policy visibility
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- assessment events
- certification decisions
- AI usage

### 11.2 Required metrics
- assessment completion
- certification counts
- score trends

### 11.3 Required diagnostics
- scoring diagnostics
- benchmark diagnostics
- certification blockage diagnostics

### 11.4 Handover expectation
The module must publish an as-built note that records:
- owned backend artifacts
- owned frontend artifacts
- contracts and tables used
- protected actions and DAuth enforcement points
- diagnostics present
- remaining blockers and known operational risks

---

## 12. Required Tests

- unit tests for core runtime services
- integration tests for route groups and contract paths
- workflow enforcement tests for protected actions
- DAuth authority / delegation / SoD / lifecycle authorization tests where applicable
- diagnostics tests
- operational smoke tests

### 12.1 Module-specific tests
- QiyasAssessmentService
- QiyasScoringService
- QiyasBenchmarkService
- QiyasCalibrationService
- QiyasCertificationService

---

## 13. Exact Build Instructions

- Centralize qiyas runtime truth inside the `qiyas` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- qiyas-domain runtime truth is centralized in `qiyas`
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- UI surfaces, diagnostics, settings/admin controls, and tests are explicit
- protected actions cannot bypass DAuth and workflow
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected actions bypass workflow + DAuth
- runtime truth is fragmented or hidden
- diagnostics are missing for critical execution paths
- UI/admin surfaces exist without contract or control discipline
- any required artifact class is skipped

---

## 16. Recommended Next Part

After this patch, the next recommended module patch is:

**Module Patch 42 — Records Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current qiyas implementation against the full canonical qiyas target, classify every qiyas-layer gap, build only the missing qiyas artifacts, validate against pass/fail rules, and update the as-built ledger.
