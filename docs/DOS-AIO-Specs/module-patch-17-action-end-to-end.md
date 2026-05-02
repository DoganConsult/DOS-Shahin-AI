# Module Patch 17 — Action Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 17 — Action Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Action module** end to end.

It tells an agent exactly how to:
- inspect the action module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical action target
- know what belongs to Action, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `action`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: action item management, owner assignment, due dates, progress tracking, and action governance across the platform
- Primary dependency domains: DOS shell/events/notifications, DAuth control spine, workflow, remediation, incident, audit, risk, reporting, analytics, AI

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

## 2.1 What Action owns directly
- action item master records
- action planning and assignment state
- due-date and completion tracking
- action dashboards and summaries
- action diagnostics and admin/runtime controls

## 2.2 What Action consumes from DOS
- shell runtime
- notifications
- event backbone
- org and tenant context

## 2.3 What Action consumes from DAuth
- scoped access
- assignment and completion authority where protected
- delegation
- SoD
- lifecycle authorization

## 2.4 What Action consumes from adjacent modules
- remediation, incident, audit, risk and other modules as action sources
- workflow for approvals and escalations
- AI for prioritization and summarization

## 2.5 What Action must never implement
- auth truth
- hidden task engines outside approved runtime contracts
- source-of-truth issue records outside explicit linkage

---

## 3. Canonical Backend Structure

```text
backend/src/modules/action/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  assignments/\n  tracking/\n
  index.ts
  action.module.ts
```

## 3.1 Required backend service families
- ActionItemService
- ActionAssignmentService
- DueDateTrackingService
- CompletionService
- ActionDashboardService
- ActionDiagnosticsService
- ActionAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/action/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  assignments/\n  tracking/\n
  index.ts
```

## 4.1 Required UI surfaces
- action hub
- action detail views
- assignment and progress views
- dashboards and summaries
- diagnostics and admin views

---

## 5. Data Model Requirements

- action master tables
- assignment tables
- tracking and completion tables
- action audit and history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Action owns action-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- action CRUD
- assignment and completion actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- action contract
- assignment contract
- completion contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- approval for protected completion or closure
- escalation for overdue actions

### 7.2 DAuth integration
- scoped access
- protected action authority
- delegation
- SoD
- lifecycle authorization

No protected action transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- priority recommendations
- completion summary drafting
- blocker explanation support

### 8.2 Restricted AI behavior
- autonomous protected closure
- hidden reassignment outside DAuth and workflow

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- open
- assigned
- in progress
- blocked
- overdue
- completed pending review
- closed
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- SLA visibility
- escalation policy visibility
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- action creation and update
- assignment and reassignment
- completion and closure
- escalations
- AI usage

### 11.2 Required metrics
- open actions
- overdue actions
- completion latency
- reassignment counts

### 11.3 Required diagnostics
- overdue diagnostics
- stuck action diagnostics
- blocked closure diagnostics

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
- ActionItemService
- ActionAssignmentService
- DueDateTrackingService
- CompletionService
- ActionDashboardService

---

## 13. Exact Build Instructions

- Centralize action runtime truth inside the `action` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- action-domain runtime truth is centralized in `action`
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

**Module Patch 18 — Admin Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current action implementation against the full canonical action target, classify every action-layer gap, build only the missing action artifacts, validate against pass/fail rules, and update the as-built ledger.
