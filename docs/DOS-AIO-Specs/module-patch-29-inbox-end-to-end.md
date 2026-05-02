# Module Patch 29 — Inbox Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 29 — Inbox Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Inbox module** end to end.

It tells an agent exactly how to:
- inspect the inbox module across backend, frontend, contracts, events, workflows, data, diagnostics, admin/runtime, and handover layers
- compare the current implementation against the canonical inbox target
- know what belongs to Inbox, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, settings, diagnostics, tests, and as-built artifacts must exist

### 0.4 Module identity
- Module code: `inbox`
- Layer: product business domain module
- Criticality: **enterprise production grade**
- Runtime role: unified inbox and operational work intake across notifications, approvals, tasks, and actioned messages
- Primary dependency domains: DOS shell/notifications/events, DAuth control spine, workflow, action, remediation, AI

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

## 2.1 What Inbox owns directly
- inbox item aggregation from approved sources
- inbox state and triage from the inbox perspective
- inbox dashboards and diagnostics

## 2.2 What Inbox consumes from DOS
- notifications
- event backbone
- shell runtime
- tenant context

## 2.3 What Inbox consumes from DAuth
- scoped visibility
- protected action authority where inbox actions trigger approvals
- delegation
- lifecycle authorization

## 2.4 What Inbox consumes from adjacent modules
- workflow, action, remediation, notification, and other modules as source providers
- AI for prioritization and summarization

## 2.5 What Inbox must never implement
- replace source-of-truth tasks or approvals
- own auth truth
- hide protected action execution outside DAuth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/inbox/
  controllers/\n  routes/\n  services/\n  repositories/\n  contracts/\n  schemas/\n  types/\n  events/\n  jobs/\n  diagnostics/\n  admin/\n  mappers/\n  policies/\n  data/\n  aggregation/\n  triage/\n
  index.ts
  inbox.module.ts
```

## 3.1 Required backend service families
- InboxAggregationService
- InboxTriageService
- InboxStateService
- InboxDashboardService
- InboxDiagnosticsService

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/inbox/
  pages/\n  components/\n  services/\n  dashboards/\n  diagnostics/\n  admin/\n  contracts/\n  testing/\n  triage/\n  queues/\n
  index.ts
```

## 4.1 Required UI surfaces
- inbox hub
- queue views
- triage views
- dashboards and diagnostics

---

## 5. Data Model Requirements

- inbox item tables or materializations
- triage state tables
- inbox audit/history tables

DOS owns platform truth.  
DAuth owns auth/control truth.  
Inbox owns inbox-domain runtime truth.

---

## 6. API Surface Requirements

### 6.1 Required route groups
- inbox retrieval
- triage actions
- state actions
- dashboards and summaries
- diagnostics

### 6.2 Required contracts
- inbox item contract
- triage contract
- state contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

### 7.1 Workflow integration
- handoff to protected source actions where inbox triggers approvals or transitions

### 7.2 DAuth integration
- scoped visibility
- protected action gating where inbox invokes downstream actions
- delegation
- lifecycle authorization

No protected inbox transition, approval, publish, release, closure, override, or sign-off path may bypass workflow + DAuth.

---

## 8. AI Integration

### 8.1 Allowed AI participation
- priority recommendations
- summary generation
- cluster and explain support

### 8.2 Restricted AI behavior
- direct protected actions without source workflow + DAuth

---

## 9. UI and Experience Requirements

### 9.1 Required UI states
- empty
- loading
- error
- unread
- triaged
- blocked
- completed
- archived

### 9.2 Empty / loading / error law
The module must define explicit empty, loading, error, blocked, degraded, and archived states. No silent fallback is allowed for protected or operationally critical surfaces.

---

## 10. Settings / Admin / Runtime Control

### 10.1 Required controls
- inbox preferences visibility
- diagnostics and runbook links

### 10.2 Runtime control law
Admin/runtime controls may expose configuration, diagnostics, retries, toggles, and health surfaces only inside DOS shell composition and always under DAuth control.

---

## 11. Observability and Operations

### 11.1 Required logs
- inbox aggregation events
- triage changes
- AI usage

### 11.2 Required metrics
- item counts
- time-to-triage
- stale inbox counts

### 11.3 Required diagnostics
- aggregation diagnostics
- source connectivity diagnostics
- stale item diagnostics

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
- InboxAggregationService
- InboxTriageService
- InboxStateService
- InboxDashboardService
- InboxDiagnosticsService

---

## 13. Exact Build Instructions

- Centralize inbox runtime truth inside the `inbox` module if it is fragmented across unrelated modules.
- Keep DOS concerns in DOS and DAuth concerns in DAuth. Consume them; do not reimplement them.
- Route protected actions through workflow + DAuth lifecycle authorization.
- Publish typed contracts for all major runtime objects.
- Add diagnostics before claiming production readiness.
- Update the as-built ledger after implementation or audit.

---

## 14. Acceptance Criteria

Pass only if:
- inbox-domain runtime truth is centralized in `inbox`
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

**Module Patch 30 — Issues Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current inbox implementation against the full canonical inbox target, classify every inbox-layer gap, build only the missing inbox artifacts, validate against pass/fail rules, and update the as-built ledger.
