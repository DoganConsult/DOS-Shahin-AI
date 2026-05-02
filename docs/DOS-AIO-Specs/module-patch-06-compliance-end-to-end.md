# Module Patch 06 — Compliance Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 06 — Compliance Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Compliance module** end to end.

It tells an agent exactly how to:
- inspect framework mapping, obligations, controls linkage, assessments, remediation linkage, evidence linkage, regulatory views, and compliance reporting
- compare the current implementation against the canonical compliance target
- know what belongs to Compliance, what belongs to DOS, what belongs to DAuth, what belongs to Workflow, and what belongs to adjacent modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `compliance`
- Layer: core business domain module
- Criticality: **P0 core GRC module**
- Runtime role: framework control mapping, obligation tracking, compliance assessments, regulatory alignment, gap visibility, remediation linkage, executive/regulator reporting support
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, evidence, policy, risk, reporting, analytics, AI, integrations

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

## 2.1 What Compliance owns directly
Compliance owns:
- framework ingestion/runtime representation at module level
- regulatory/control mapping logic for compliance use cases
- obligation and requirement tracking
- compliance assessment runtime
- framework coverage and maturity views
- compliance gap visibility
- remediation linkage orchestration from compliance perspective
- compliance dashboards, summaries, and regulator-facing readiness surfaces
- compliance diagnostics and admin/runtime control surfaces

## 2.2 What Compliance consumes from DOS
Compliance consumes:
- foundation org structure and ownership context
- product/module enablement state
- event backbone
- observability and shell runtime
- provisioning defaults where needed

## 2.3 What Compliance consumes from DAuth
Compliance consumes:
- access and scoped ownership
- review/approval authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization for state-changing actions
- audit/security event contracts

## 2.4 What Compliance consumes from adjacent modules
- Evidence for evidentiary support and freshness
- Policy for policy linkage and policy obligations
- Risk for control-risk linkage and residual exposure context
- Workflow for reviews, assessments, attestations, approvals, and escalations
- Reporting/Analytics for compliance summaries and executive views
- AI for mapping, gap explanation, scoring support, and narrative assistance

## 2.5 What Compliance must not implement
Compliance must not own:
- auth/access truth
- duplicate approval authority truth
- duplicate workflow engine
- duplicate evidence repository truth
- duplicate policy lifecycle truth
- hidden regulator framework truth outside approved registries

---

## 3. Canonical Backend Structure

```text
backend/src/modules/compliance/
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
  compliance.module.ts
```

## 3.1 Required backend service families
- framework registry/mapping service
- obligation service
- compliance assessment service
- requirement coverage service
- control cross-mapping service
- regulator readiness service
- compliance gap service
- remediation linkage service
- attestation/review service
- compliance dashboard/summary service
- diagnostics service
- admin/runtime configuration service
- event/subscription services

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/compliance/
  pages/
  components/
  services/
  dashboards/
  frameworks/
  obligations/
  assessments/
  gaps/
  diagnostics/
  admin/
  contracts/
  testing/
  index.ts
```

Required surfaces:
- compliance hub
- framework catalog/mapping views
- obligation views
- assessment views
- control mapping views
- gap and remediation linkage views
- dashboard and summary views
- diagnostics/admin views

---

## 5. Data Model Requirements

Compliance may own or consume:
- framework registry tables where module-owned
- requirement/obligation tables
- assessment runtime tables
- framework-control mapping tables
- control coverage and maturity runtime tables
- attestation/review tables
- compliance gap and recommendation tables
- regulatory readiness/support tables
- dashboard/summary support tables
- audit/history tables for compliance changes

DOS owns platform/foundation truth.
DAuth owns control truth.
Compliance owns compliance-domain runtime truth.

---

## 6. API Surface Requirements

Required route groups:
- framework and obligation retrieval/management
- mapping and crosswalk surfaces
- assessment create/run/review
- coverage and maturity retrieval
- gap and remediation linkage retrieval
- attestation/review actions
- dashboards and summaries
- diagnostics/admin

Required contracts:
- framework contract
- obligation contract
- assessment contract
- control mapping contract
- coverage/maturity contract
- gap contract
- attestation/review contract
- diagnostics contract

---

## 7. Workflow and DAuth Integration

Compliance must integrate with workflow for:
- assessment lifecycle
- attestation and review flows
- regulator-readiness review flows
- remediation handoff flows
- escalation on overdue or failed obligations

Compliance must integrate with DAuth for:
- scoped access
- review/approval authority
- delegation
- SoD
- self-approval prevention
- lifecycle authorization

No protected attestation, review, sign-off, or override may bypass DAuth and workflow.

---

## 8. AI Integration

Allowed AI participation:
- framework mapping assistance
- control crosswalk suggestions
- compliance narrative generation
- obligation summarization
- regulator explanation support
- gap prioritization
- evidence sufficiency hints

Restricted AI behavior:
- no silent attestation/sign-off
- no hidden compliance status override
- no regulator-facing output without traceability/audit where required
- no protected mutation outside workflow/DAuth controls

---

## 9. UI and Experience Requirements

Compliance UI must provide:
- framework and obligation visibility
- assessment execution and result surfaces
- mapping/crosswalk surfaces
- coverage and maturity views
- gaps and remediation visibility
- attestation/review state visibility
- diagnostics and admin/runtime surfaces
- executive/regulator summary surfaces where applicable

Must define:
- empty/loading/error
- blocked/authority-required
- delegated
- escalated
- overdue
- failed assessment
- incomplete evidence
- archived/superseded framework states

---

## 10. Settings/Admin/Runtime Control

Required controls:
- framework activation/deactivation visibility
- mapping policy visibility
- assessment cadence/config visibility
- attestation/review controls
- diagnostics and runbook links
- regulator/export configuration visibility where applicable

---

## 11. Observability and Operations

Required logs:
- framework mapping changes
- obligation changes
- assessment starts/completions/failures
- attestation/review decisions
- escalations
- remediation handoff events
- AI recommendation usage where applicable

Required metrics:
- control coverage
- obligation completion
- assessment pass/fail rates
- overdue obligations
- attestation latency
- framework readiness scores

Required diagnostics:
- assessment pipeline diagnostics
- mapping drift diagnostics
- missing evidence diagnostics
- blocked review diagnostics
- overdue obligation diagnostics

---

## 12. Required Tests

- framework mapping tests
- obligation lifecycle tests
- assessment runtime tests
- control mapping/crosswalk tests
- attestation/review tests
- DAuth authority/SoD/delegation tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

If framework and mapping logic is fragmented:
- centralize framework/obligation/mapping runtime in Compliance
- use typed contracts for crosswalks and coverage outputs

If protected attestation/review bypasses DAuth/workflow:
- route all protected actions through workflow + DAuth lifecycle authorization

If compliance UI surfaces are present but runtime contracts are weak:
- add explicit contracts for assessment state, coverage state, obligation state, and diagnostics

If regulator-facing outputs exist without auditability:
- add audit references, export controls, and diagnostics before release

---

## 14. Acceptance Criteria

Pass only if:
- compliance-domain truth is centralized in Compliance
- DOS and DAuth boundaries are respected
- workflow integration is explicit
- mapping/assessment/attestation/gap/admin/diagnostics/tests are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- protected attestation or review bypasses DAuth/workflow
- compliance truth is fragmented across modules with no canonical contract
- regulator-facing outputs lack diagnostics/audit expectations
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 07 — Policy Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current compliance implementation against the full canonical compliance target, classify every compliance-layer gap, build only the missing compliance artifacts, validate against compliance pass/fail rules, and update the as-built ledger.
