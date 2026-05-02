# Module Patch 16 — Remediation Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 16 — Remediation Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Remediation module** end to end.

It tells an agent exactly how to:
- inspect the remediation module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical remediation target
- know what belongs to Remediation, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `remediation`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: corrective action planning, assignment, due-date management, escalations, verification, closure, and remediation performance visibility
- Primary dependency domains: DOS shell/events/notifications, DAuth control spine, workflow, incident, audit, risk, compliance, vendor, controls, reporting, analytics, AI

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

## 2.1 What Remediation owns directly
- remediation master records
- remediation plans and action structures
- assignment and due-date management from the remediation perspective
- escalation and overdue handling
- verification and closure state
- remediation dashboards, diagnostics, and admin/runtime controls

## 2.2 What Remediation consumes from DOS
- shell/runtime composition
- notifications and event backbone
- observability
- org and tenant context

## 2.3 What Remediation consumes from DAuth
- scoped access
- assignment, verification, or closure authority where protected
- delegation
- SoD
- self-approval prevention where protected verification exists
- lifecycle authorization

## 2.4 What Remediation consumes from adjacent modules
- incident, audit, compliance, risk, vendor, controls and other modules as remediation sources
- workflow for approvals, escalations, verification, and closure
- reporting and analytics for performance visibility
- AI for plan drafting and progress summarization

## 2.5 What Remediation must never implement
- auth truth
- hidden task engines outside approved workflow contracts
- source-of-truth issue or finding records
- hidden closure approval flows outside workflow + DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/remediation/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  plans/\n  verification/\n  escalations/\n
  index.ts
  remediation.module.ts
```

## 3.1 Required backend service families
- RemediationIntakeService
- RemediationPlanService
- AssignmentDueDateService
- EscalationOverdueService
- VerificationClosureService
- RemediationDashboardService
- RemediationDiagnosticsService
- RemediationAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/remediation/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  plans/\n  assignments/\n  verification/\n  escalations/\n
  index.ts
```

## 4.1 Required UI surfaces
- remediation hub
- remediation detail and plan views
- assignment and progress views
- verification and closure views
- dashboards and summaries
- diagnostics and admin views

---

## 5. Data Model Requirements

- remediation master tables
- plan and action tables
- assignment and due-date tables
- escalation tables
- verification and closure tables
- remediation audit and history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Remediation owns remediation-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- remediation CRUD and intake
- plan and assignment actions
- escalation actions
- verification and closure actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- remediation contract
- plan contract
- assignment contract
- escalation contract
- verification and closure contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- protected verification and closure flows
- escalation and reassignment approvals where applicable
- overdue action escalations
- cross-domain closure handshakes where source modules require them

### 7.2 DAuth integration
- scoped access
- verification and closure authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No protected remediation transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- plan drafting
- prioritization support
- progress summarization
- blockage explanation support
- escalation narratives

### 8.2 Restricted AI behavior
- autonomous protected closure
- hidden assignment override
- protected transitions outside workflow + DAuth

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- planned
- in progress
- blocked
- escalated
- blocked or authority required
- delegated
- pending verification
- closed
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- SLA and due-date policy visibility
- escalation policy visibility
- verification and closure controls
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- remediation changes
- assignment events
- escalation events
- verification or closure decisions
- overdue processing
- AI usage where applicable

### 11.2 Required metrics
- open remediation counts
- overdue counts
- closure latency
- reassignment rates
- blocked counts
- source-to-remediation conversion metrics

### 11.3 Required diagnostics
- overdue pipeline diagnostics
- blocked closure diagnostics
- assignment health diagnostics
- escalation pipeline diagnostics

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
- RemediationIntakeService
- RemediationPlanService
- AssignmentDueDateService
- EscalationOverdueService
- VerificationClosureService

---

## 13. Exact Build Instructions

- Centralize remediation runtime truth inside the `remediation` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- remediation-domain runtime truth is centralized in `remediation`
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

**Module Patch 17 — Action Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current remediation implementation against the full canonical remediation target, classify every remediation-layer gap, build only the missing remediation artifacts, validate against pass/fail rules, and update the as-built ledger.
