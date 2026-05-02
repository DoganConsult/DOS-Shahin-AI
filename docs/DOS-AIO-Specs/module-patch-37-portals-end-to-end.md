# Module Patch 37 — Portals Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 37 — Portals Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Portals module** end to end.

It tells an agent exactly how to:
- inspect the portals module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical portals target
- know what belongs to Portals, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `portals`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: external portals for controlled external-party interaction, submissions, visibility, and portal runtime governance
- Primary dependency domains: DOS shell/events/notifications, DAuth control spine, workflow, vendor, audit, evidence, policy, AI, integrations

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

## 2.1 What Portals owns directly
- portal definitions and runtime state from the portals perspective
- portal submissions and interaction surfaces
- portal dashboards, diagnostics, and admin/runtime controls

## 2.2 What Portals consumes from DOS
- shell/runtime composition
- notifications
- event backbone
- observability

## 2.3 What Portals consumes from DAuth
- external actor access
- scoped portal visibility
- protected portal admin authority
- delegation
- SoD
- lifecycle authorization

## 2.4 What Portals consumes from adjacent modules
- vendor, audit, evidence, policy, workflow, integrations, AI through explicit contracts

## 2.5 What Portals must never implement
- own generic external identity truth beyond DAuth contracts
- bypass DAuth for portal access
- duplicate source module truth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/portals/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  external-access/\n  submissions/\n
  index.ts
  portals.module.ts
```

## 3.1 Required backend service families
- PortalDefinitionService
- PortalAccessService
- PortalSubmissionService
- PortalDashboardService
- PortalDiagnosticsService
- PortalAdminService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/portals/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  external-access/\n  submissions/\n
  index.ts
```

## 4.1 Required UI surfaces
- portals hub
- portal config views
- submission views
- external access views
- dashboards and diagnostics
- admin views

---

## 5. Data Model Requirements

- portal definition tables
- portal access tables
- submission tables
- portal audit/history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Portals owns portals-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- portal CRUD
- submission actions
- external access actions
- dashboards and summaries
- diagnostics and admin

### 6.2 Required contracts
- portal definition contract
- submission contract
- external access contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- protected portal publish or exposure flows
- submission review and approval flows

### 7.2 DAuth integration
- external actor access
- scoped visibility
- portal admin authority
- delegation
- SoD
- lifecycle authorization

No protected portals transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- submission summarization
- portal guidance support

### 8.2 Restricted AI behavior
- autonomous protected portal exposure
- external scope bypass

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- draft
- published
- blocked
- degraded
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- portal policy visibility
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- portal changes
- submission events
- access events
- AI usage

### 11.2 Required metrics
- portal usage
- submission volumes
- approval latency

### 11.3 Required diagnostics
- exposure diagnostics
- submission pipeline diagnostics
- external access diagnostics

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
- PortalDefinitionService
- PortalAccessService
- PortalSubmissionService
- PortalDashboardService
- PortalDiagnosticsService

---

## 13. Exact Build Instructions

- Centralize portals runtime truth inside the `portals` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- portals-domain runtime truth is centralized in `portals`
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

**Module Patch 38 — Privacy Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current portals implementation against the full canonical portals target, classify every portals-layer gap, build only the missing portals artifacts, validate against pass/fail rules, and update the as-built ledger.
