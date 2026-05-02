# Module Patch 11 — Reporting Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 11 — Reporting Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Reporting module** end to end.

It tells an agent exactly how to:
- inspect the reporting module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical reporting target
- know what belongs to Reporting, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `reporting`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: operational, executive, board, and regulator reporting with controlled generation, release, export, and delivery traceability
- Primary dependency domains: DOS shell/events/storage, DAuth control spine, workflow, analytics, audit, compliance, risk, evidence, policy, notifications, AI, integrations

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

## 2.1 What Reporting owns directly
- report definitions and templates
- report generation orchestration and run state
- scheduled report execution and retention metadata
- export packaging and distribution records
- board pack and executive pack composition from the reporting perspective
- reporting dashboards, summaries, diagnostics, and admin/runtime controls

## 2.2 What Reporting consumes from DOS
- storage and file delivery infrastructure
- event backbone
- shell/runtime composition
- notification primitives
- platform scheduling/runtime context

## 2.3 What Reporting consumes from DAuth
- scoped access and data visibility
- release/sign-off authority for protected outputs
- delegation
- SoD
- lifecycle authorization
- security/audit decision contracts

## 2.4 What Reporting consumes from adjacent modules
- analytics as a metric source
- risk, compliance, audit, evidence, policy, vendor, incident and other modules as source providers
- workflow for review, release, distribution, and escalation gates
- AI for narrative drafting and summary support

## 2.5 What Reporting must never implement
- its own auth or permission truth
- its own event bus
- hidden extraction paths that bypass source contracts
- protected release shortcuts outside workflow + DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/reporting/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  exporters/\n  templates/\n  distribution/\n  board-packs/\n
  index.ts
  reporting.module.ts
```

## 3.1 Required backend service families
- ReportDefinitionService
- ReportTemplateService
- ReportGenerationService
- ReportRunService
- ReportScheduleService
- ExportPackagingService
- ReportDistributionService
- BoardPackCompositionService
- ReportingDashboardService
- ReportingDiagnosticsService
- ReportingAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/reporting/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  templates/\n  schedules/\n  exports/\n  distributions/\n  board-packs/\n
  index.ts
```

## 4.1 Required UI surfaces
- reporting hub
- report catalog and detail surfaces
- template or builder surfaces
- generation history and run monitoring
- schedule management
- delivery and distribution views
- board pack and executive pack views
- diagnostics and admin views

---

## 5. Data Model Requirements

- report definition tables
- report template tables
- report run and history tables
- schedule tables
- export artifact records
- distribution and delivery records
- board pack bundle tables
- reporting audit and history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Reporting owns reporting-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- definition and template CRUD
- generation and run retrieval
- schedule actions
- export and distribution actions
- board pack actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- report definition contract
- report generation contract
- report run contract
- schedule contract
- distribution contract
- board-pack contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- protected release review and sign-off
- distribution approvals where required
- board or regulator release gates
- escalation for failed or overdue reporting obligations

### 7.2 DAuth integration
- scoped data visibility
- release and sign-off authority
- delegation
- SoD
- self-approval prevention where protected release exists
- lifecycle authorization

No protected reporting transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- narrative drafting
- executive summary generation
- regulator summary support
- anomaly explanation support

### 8.2 Restricted AI behavior
- autonomous protected release
- hidden data selection outside authorized scope
- protected transitions outside workflow + DAuth

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- generating
- scheduled
- failed
- awaiting review or sign-off
- blocked or authority required
- delegated
- distributed
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- export format visibility
- retention and schedule settings visibility
- distribution channel visibility
- release policy visibility
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- report changes
- run start, finish, and failure
- export events
- delivery outcomes
- protected release decisions
- AI usage where applicable

### 11.2 Required metrics
- run success rate
- run latency
- delivery success rate
- release latency
- top report usage
- stale schedule counts

### 11.3 Required diagnostics
- generation pipeline diagnostics
- export diagnostics
- delivery diagnostics
- permission and scope block diagnostics
- source-readiness diagnostics

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
- ReportDefinitionService
- ReportTemplateService
- ReportGenerationService
- ReportRunService
- ReportScheduleService

---

## 13. Exact Build Instructions

- Centralize reporting runtime truth inside the `reporting` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- reporting-domain runtime truth is centralized in `reporting`
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

**Module Patch 12 — Analytics Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current reporting implementation against the full canonical reporting target, classify every reporting-layer gap, build only the missing reporting artifacts, validate against pass/fail rules, and update the as-built ledger.
