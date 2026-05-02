# Module Patch 03 — AI Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 03 — AI Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the canonical target for the **AI module and AI operating capabilities that remain module-owned**, while explicitly separating them from DOS-owned AI OS runtime and DAuth-owned agent security.

It tells an agent exactly how to:
- inspect the current AI stack
- separate platform AI OS concerns from module AI concerns
- compare current implementation against the canonical target
- know exactly what runtime services, tool sets, reasoning services, governance hooks, UI surfaces, contracts, tests, and operations artifacts must exist

### 0.4 Module identity
- Module code: `ai`
- Layer: product/domain module with cross-cutting importance
- Criticality: **P0 architectural**
- Runtime role: domain AI behaviors, agent tools, reasoning, AI product surfaces, module-facing AI functionality
- Primary dependency domains: DOS AI OS, DAuth agent security, workflow, integrations, observability, delivery

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
- Patch 8
- Patch 9
- Patch 10
- Patch 11
- Patch 12
- Patch 13
- Patch 14
- Patch 15

---

## 2. AI Ownership Split — Critical Rule

## 2.1 DOS must own
- AI OS kernel
- agent runtime host
- scheduling/process model
- IPC/handoff transport
- runtime memory abstraction
- fleet orchestration
- platform observability of agent runtime
- durable execution primitives
- system-level agent lifecycle

## 2.2 DAuth must own
- agent principal model
- agent tokens/sessions
- agent permission/scope profiles
- agent delegation and authority
- agent SoD
- agent audit/security events

## 2.3 AI module owns directly
- domain agent tool packs
- reasoning and recommendation logic
- LLM gateway policies specific to AI product behavior
- AI UI surfaces
- AI cockpit/product pages
- AI assistance logic for other modules where routed through approved contracts
- module-level model/prompt/config surfaces
- AI module diagnostics and governance integration

## 2.4 AI module must not own
- hidden platform runtime truth that belongs to DOS AI OS
- hidden security/control truth that belongs to DAuth
- second lifecycle or orchestration engines as permanent platform truth

---

## 3. Canonical Backend Structure

```text
backend/src/modules/ai/
  controllers/
  routes/
  services/
    agents/
    orchestration/
    memory/
    gateway/
    llm/
    reasoning/
    observability/
    activity/
    workflow/
    diagnostics/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  admin/
  testing/
  index.ts
  ai.module.ts
```

## 3.1 Required service families

### Domain agent tooling
- tool packs A01–A12 and future typed tool bundles
- module-routing adapters
- tool execution safety adapters

### Reasoning
- decision engine
- explainability service
- recommendation engine
- signal inference
- NL query

### Gateway and LLM
- LLM service/router
- provider policy enforcer
- prompt registry
- injection guard
- trace/usage/cost tracking
- retry and fallback services

### Activity and audit
- agent activity feed
- agent audit
- task tracker
- alerting and correlation

### AI module diagnostics
- AI diagnostics
- failed run analysis
- tool usage diagnostics
- model/prompt diagnostics
- cost diagnostics

### AI-to-workflow/product integration
- proposed action service
- event triggers
- workflow trigger adapters
- module routing bridges

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/ai/
  pages/
  components/
  services/
  cockpit/
  diagnostics/
  governance/
  settings/
  admin/
  widgets/
  state/
  contracts/
  testing/
  index.ts
```

Required UI surfaces:
- AI cockpit
- agent hub
- agent detail
- decision trace
- explainability
- recommendations inbox
- model/runtime config
- policy/rules pages
- AI queue and action review
- diagnostics/cost/usage views
- governance linkage surfaces

---

## 5. Data Model Requirements

AI module may own or consume:
- agent run and step records
- proposals
- AI sessions
- module-owned memory coordination data
- prompt and model config records
- AI usage/cost records
- shadow/canary configuration
- recommendation and observation records

DOS owns platform runtime host truth.
DAuth owns principal/access truth.
AI module owns domain AI behavior and product-facing AI artifacts.

---

## 6. API Surface Requirements

Required route groups:
- agent registry/read views
- run and execution inspection
- tool and prompt admin/config surfaces
- recommendation/proposal surfaces
- explainability and decision history
- AI queue/review actions
- AI diagnostics and cost usage
- module integration hooks
- governance linkage hooks

Required contracts:
- agent run contract
- proposal contract
- recommendation contract
- explanation contract
- tool execution result contract
- prompt/model config contract
- diagnostics contract

---

## 7. Workflow Integration

The AI module must integrate with workflow for:
- proposed actions
- approval queues
- protected actions
- autonomous or semi-autonomous flows
- remediation/action handoff
- retry/recovery of AI-driven tasks

No protected AI action may bypass workflow and DAuth controls.

---

## 8. DAuth Integration

The AI module must consume DAuth for:
- agent principal resolution
- human principal resolution for copilot actions
- tool access gating
- data classification/clearance gating where applicable
- authority for protected actions
- delegation and acting-on-behalf-of
- SoD and self-approval prevention
- audit for agent/human mixed actions

---

## 9. UI and Experience Requirements

Required surfaces:
- AI cockpit
- agent registry/fleet views
- decision/explanation trace
- approval and override views
- tool visibility and invocation history
- cost and usage views
- prompt/model/runtime config pages
- diagnostics and support views

Required experience states:
- model unavailable
- provider degraded
- tool blocked
- permission blocked
- approval required
- delegated
- queued
- running
- streaming
- partial result
- failed
- fallback used
- completed

---

## 10. Settings/Admin/Runtime Control

Required controls:
- model/provider selection policy
- prompt registry management
- shadow/canary enablement
- runtime config controls
- cost/usage caps where supported
- proposal/autonomy policy visibility
- diagnostics and runbook links

---

## 11. Observability and Operations

Required logs:
- run start/end
- tool call and outcome
- provider/model selection
- blocked actions
- approval-required actions
- fallback usage
- prompt drift/injection events
- cost and quota events

Required metrics:
- runs
- tokens
- latency
- cost
- success/failure
- tool usage
- fallback rate
- approval-required rate

Required diagnostics:
- failed runs
- model/provider errors
- blocked tool invocations
- invalid output diagnostics
- queue and throughput diagnostics

---

## 12. Required Tests

- tool pack tests
- reasoning and recommendation tests
- prompt/model config tests
- provider routing tests
- blocked-action tests
- workflow and DAuth integration tests
- diagnostics tests
- operational smoke tests

---

## 13. Exact Build Instructions

## 13.1 If AI OS concerns still live in the module layer
### Build this
- extract DOS-owned runtime/kernel/orchestration concerns into `platform/dos/ai-os/`
- leave module-owned reasoning, tools, UI, and domain AI behavior in the AI module
- create explicit bridge contracts

### Do not build this
- keep platform runtime truth buried inside the `modules/ai` package

## 13.2 If agent security is weak
### Build this
- consume DAuth agent contracts for principal, session, access, scope, delegation, SoD
- remove local security shortcuts

### Do not build this
- agent-local auth truth
- direct privileged tool execution without DAuth mediation

## 13.3 If diagnostics/admin depth is weak
### Build this
- AI admin control plane
- diagnostics surfaces
- prompt/model/runtime governance views
- approval and override visibility

### Do not build this
- hidden configuration files as the operational admin model

---

## 14. Acceptance Criteria

Pass only if:
- AI module concerns are cleanly separated from DOS AI OS concerns
- DAuth governs agent security/control
- AI module owns only domain AI behaviors and AI product surfaces
- diagnostics/admin/tests are explicit
- workflow and approval interactions are explicit
- as-built updates are explicit

---

## 15. Fail Conditions

FAIL if:
- platform AI OS truth remains buried in the AI module with no ownership correction
- AI bypasses DAuth or workflow for protected actions
- runtime/admin/diagnostics are opaque
- required artifact classes are skipped

---

## 16. Recommended Next Part
After this module patch, the next highest-value module patch is:

**Module Patch 04 — Governance Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current AI implementation against the full canonical AI target, classify every AI-layer gap, separate DOS/DAuth/module ownership correctly, build only the missing AI artifacts, validate against AI pass/fail rules, and update the as-built ledger.
