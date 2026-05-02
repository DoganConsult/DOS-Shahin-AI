# Module Patch 14 — Controls Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 14 — Controls Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Controls module** end to end.

It tells an agent exactly how to:
- inspect the controls module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical controls target
- know what belongs to Controls, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `controls`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: canonical control library and control runtime state, including ownership, mappings, effectiveness, testing, and automation posture
- Primary dependency domains: DOS foundation/events, DAuth control spine, workflow, compliance, evidence, risk, audit, reporting, analytics, AI

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

## 2.1 What Controls owns directly
- control master records
- control taxonomy and classification
- control design and implementation metadata
- control ownership state from the controls perspective
- control mappings where control-owned
- effectiveness and testing state from the controls perspective
- control automation state where supported
- controls dashboards, diagnostics, and admin/runtime controls

## 2.2 What Controls consumes from DOS
- foundation structure for ownership scope
- shell/runtime composition
- event backbone
- observability
- platform context

## 2.3 What Controls consumes from DAuth
- scoped access
- protected approval and sign-off authority
- delegation
- SoD
- self-approval prevention where protected state changes exist
- lifecycle authorization

## 2.4 What Controls consumes from adjacent modules
- compliance for framework obligations
- risk for control-risk relationships
- evidence for evidence linkage
- audit for testing and finding linkage
- workflow for approval and lifecycle transitions
- reporting and analytics for summaries
- AI for mapping and optimization suggestions

## 2.5 What Controls must never implement
- auth truth
- hidden workflow engines
- duplicate evidence or audit truth
- sign-off shortcuts outside workflow + DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/controls/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  mappings/\n  effectiveness/\n  automation/\n
  index.ts
  controls.module.ts
```

## 3.1 Required backend service families
- ControlLibraryService
- ControlDesignService
- ControlOwnershipService
- ControlMappingService
- ControlEffectivenessService
- ControlAutomationStateService
- ControlsDashboardService
- ControlsDiagnosticsService
- ControlsAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/controls/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  library/\n  mappings/\n  effectiveness/\n  automation/\n
  index.ts
```

## 4.1 Required UI surfaces
- controls hub
- control library and detail views
- mapping views
- effectiveness and testing views
- automation and state views
- dashboards and summaries
- diagnostics and admin views

---

## 5. Data Model Requirements

- control master tables
- control taxonomy tables
- control ownership tables
- control mapping tables
- effectiveness and testing tables
- automation state tables
- control audit and history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Controls owns controls-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- control CRUD and library retrieval
- ownership and mapping actions
- effectiveness and testing retrieval or actions
- automation or state actions where approved
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- control contract
- ownership contract
- mapping contract
- effectiveness contract
- automation-state contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- protected control approvals
- control retirement or activation flows
- high-impact mapping change approvals where applicable
- escalation for failed or overdue control tests

### 7.2 DAuth integration
- scoped access
- sign-off and approval authority
- delegation
- SoD
- self-approval prevention where protected
- lifecycle authorization

No protected controls transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- control drafting support
- mapping suggestions
- optimization hints
- effectiveness narratives
- automation opportunity suggestions

### 8.2 Restricted AI behavior
- autonomous protected approval
- hidden ownership reassignment
- protected transitions outside workflow + DAuth

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- draft
- active
- under review
- blocked or authority required
- delegated
- ineffective or failed
- retired
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- taxonomy visibility
- testing and effectiveness policy visibility
- automation policy visibility
- diagnostics and runbook links
- protected transition rule visibility

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- control changes
- ownership and mapping changes
- testing outcomes
- automation changes
- approval decisions
- AI usage where applicable

### 11.2 Required metrics
- active controls
- ineffective controls
- overdue tests
- automation coverage
- ownership gaps
- mapping completeness

### 11.3 Required diagnostics
- mapping consistency diagnostics
- ownership-gap diagnostics
- testing diagnostics
- protected-transition diagnostics
- automation diagnostics

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
- ControlLibraryService
- ControlDesignService
- ControlOwnershipService
- ControlMappingService
- ControlEffectivenessService

---

## 13. Exact Build Instructions

- Centralize controls runtime truth inside the `controls` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- controls-domain runtime truth is centralized in `controls`
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

**Module Patch 15 — Exception Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current controls implementation against the full canonical controls target, classify every controls-layer gap, build only the missing controls artifacts, validate against pass/fail rules, and update the as-built ledger.
