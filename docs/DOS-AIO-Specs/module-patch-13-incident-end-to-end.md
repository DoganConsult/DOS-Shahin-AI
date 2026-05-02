# Module Patch 13 — Incident Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 13 — Incident Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Incident module** end to end.

It tells an agent exactly how to:
- inspect the incident module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical incident target
- know what belongs to Incident, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `incident`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: incident capture, triage, severity management, investigation, response, closure, and post-incident review
- Primary dependency domains: DOS shell/events/notifications, DAuth control spine, workflow, evidence, risk, compliance, audit, reporting, analytics, AI

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

## 2.1 What Incident owns directly
- incident master records
- severity and classification models
- triage and response state from the incident perspective
- investigation timeline and response actions
- incident evidence linkage from the incident perspective
- post-incident review surfaces
- incident dashboards, diagnostics, and admin/runtime controls

## 2.2 What Incident consumes from DOS
- event backbone
- notification primitives
- shell/runtime composition
- observability
- org and tenant context

## 2.3 What Incident consumes from DAuth
- scoped access
- response or closure authority
- delegation
- SoD
- self-approval prevention where protected closure exists
- lifecycle authorization

## 2.4 What Incident consumes from adjacent modules
- evidence for attachments and linkage
- risk for root-cause context
- compliance and audit for reportability and follow-up
- workflow for transitions and escalations
- reporting and analytics for incident metrics
- AI for classification, summarization, and guidance

## 2.5 What Incident must never implement
- auth truth
- hidden messaging engines outside platform infrastructure
- hidden workflow truth
- duplicate evidence truth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/incident/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  investigations/\n  response/\n  post-incident/\n
  index.ts
  incident.module.ts
```

## 3.1 Required backend service families
- IncidentIntakeService
- SeverityClassificationService
- TriageAssignmentService
- ResponseContainmentService
- InvestigationService
- ClosureAndPostIncidentReviewService
- EvidenceLinkageService
- IncidentDashboardService
- IncidentDiagnosticsService
- IncidentAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/incident/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  triage/\n  investigation/\n  response/\n  post-incident/\n
  index.ts
```

## 4.1 Required UI surfaces
- incident hub
- intake and detail views
- triage and severity surfaces
- response and investigation surfaces
- post-incident review surfaces
- dashboards and summaries
- diagnostics and admin views

---

## 5. Data Model Requirements

- incident master tables
- classification and severity tables
- response action tables
- investigation timeline tables
- post-incident review tables
- evidence linkage tables
- incident audit and history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Incident owns incident-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- incident intake and CRUD
- triage and assignment
- response and investigation actions
- closure and post-incident actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- incident contract
- severity contract
- investigation contract
- response action contract
- closure and review contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- severity-driven escalation
- controlled closure and approval
- post-incident review flows
- regulatory reporting triggers where applicable

### 7.2 DAuth integration
- scoped access
- response and closure authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No protected incident transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- classification support
- timeline synthesis
- investigation summaries
- response guidance
- lesson drafting support

### 8.2 Restricted AI behavior
- autonomous protected closure
- hidden severity override without traceability
- protected transitions outside workflow + DAuth

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- open
- triaged
- investigating
- escalated
- blocked or authority required
- delegated
- resolved pending review
- closed
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- severity policy visibility
- escalation policy visibility
- closure and review controls
- diagnostics and runbook links
- communication policy visibility where applicable

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- incident changes
- triage changes
- response actions
- closure decisions
- escalations
- AI usage where applicable

### 11.2 Required metrics
- incident counts by severity or status
- response and closure latency
- overdue investigations
- repeat incident indicators
- escalation rates

### 11.3 Required diagnostics
- stuck incident diagnostics
- escalation diagnostics
- blocked closure diagnostics
- investigation integrity diagnostics
- delivery diagnostics where applicable

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
- IncidentIntakeService
- SeverityClassificationService
- TriageAssignmentService
- ResponseContainmentService
- InvestigationService

---

## 13. Exact Build Instructions

- Centralize incident runtime truth inside the `incident` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- incident-domain runtime truth is centralized in `incident`
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

**Module Patch 14 — Controls Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current incident implementation against the full canonical incident target, classify every incident-layer gap, build only the missing incident artifacts, validate against pass/fail rules, and update the as-built ledger.
