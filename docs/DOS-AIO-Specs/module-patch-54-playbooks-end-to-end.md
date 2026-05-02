# Module Patch MP-54 — Playbooks Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 54 — Playbooks Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Playbooks module** end to end. 

It tells an agent exactly how to:
- inspect operational playbook management, runbook automation, incident response procedures, and execution tracking
- compare the current implementation against the canonical playbooks target
- know what belongs to Playbooks, what belongs to the temporal orchestrator, and what belongs to incident/remediation
- know exactly what files, services, contracts, and workflow schemas must exist

### 0.4 Module identity
- Module code: `playbooks`
- Layer: product bundle/hub surface
- Criticality: **P2 medium**
- Runtime role: playbook template catalog, runbook automation, incident response procedure sequencing, interactive execution tracking
- Primary dependency domains: DOS foundation, DAuth control spine, workflow, incident, remediation

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 4 (Workflow Rules)
- Patch 5 (Lifecycle Auth)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What Playbooks owns directly
- Playbook template catalog (create, edit, publish versions)
- Playbook step definitions (conditionals, branching logic, automated vs manual steps)
- Execution tracking (instantiating a playbook run, tracking step completions)
- Cross-module playbook trigger mappings (e.g. mapping "Ransomware Alert" to "Ransomware Playbook")
- Playbook runtime dashboards

### 2.2 What Playbooks consumes from DOS
- Foundation org structure (for assigning task steps to roles)
- Event backbone (triggering events upon completion of steps)

### 2.3 What Playbooks consumes from DAuth
- Execution Authorization (who is allowed to launch a destructive playbook)
- Approval constraints for sensitive steps inside a playbook

### 2.4 What Playbooks consumes from adjacent modules
- **Incident**: Playbooks are often launched *from* an Incident record
- **Remediation**: Corrective action plans utilize playbooks for staging fixes
- **Task Engine / Workflow**: For handling the state-machine execution of the playbook

### 2.5 What Playbooks must not implement
- Duplicate workflow execution engine (It relies on xstate/temporal underlying engines)
- Duplicate incident handling logic (The playbook advises, the incident records)

---

## 3. Canonical Backend Structure

```text
backend/src/modules/playbooks/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  diagnostics/
  ports/
  index.ts
  playbooks.module.ts
  lifecycle-registration.ts
```

### 3.1 Required backend service families
- **Template Catalog Service**: Full CRUD and versioning logic for Playbook designs
- **Trigger Service**: Checking incoming platform events against trigger conditions
- **Execution Engine Interop**: Bridge code to the Workflow/Temporal orchestrator to spawn runs
- **Execution Tracker Service**: Read-models to show who ran what and when
- **Diagnostics Service**: Identifying broken playbooks

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/playbooks/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Playbook Catalog (library view)
- Playbook Template Editor (visual flowchart or step-by-step UI)
- Active Executions Dashboard
- Interactive Runner View (A user going step-by-step, checking boxes)

---

## 5. Data Model Requirements

Playbooks owns the following PostgreSQL tables:
- `playbook_templates` — id, name, version, status, triggering_events_json
- `playbook_steps` — id, template_id, step_order, title, instructions_md, is_automated, required_role
- `playbook_executions` — id, template_id, trigger_source_entity, status, started_at, completed_at
- `playbook_execution_logs` — id, execution_id, step_id, acted_by_user_id, result_data

---

## 6. API Surface Requirements

Required route groups:
- **Template CRUD**: `/api/playbooks/templates`
- **Execution Instantiation**: `/api/playbooks/execute`
- **Log Fetching**: `/api/playbooks/:executionId/logs`
- **Trigger Mgmt**: `/api/playbooks/triggers`
- **Diagnostics**: `/api/playbooks/diagnostics`

Required contracts:
- `PlaybookTemplateContract`
- `PlaybookExecutionContract`
- `PlaybookLogContract`

---

## 7. Workflow and DAuth Integration

- **Workflow**: Extremely tightly coupled. Instantiating a playbook essentially spawns a state machine instance.
- **DAuth**: Scoped execution rights. Some steps require "approver" level roles to unblock the sequence.

---

## 8. AI Integration

Allowed AI participation:
- Auto-generating a draft playbook template based on an uploaded enterprise PDF standard
- AI-driven suggestions for the next step based on historical incident success rates

Restricted:
- AI must not silently skip required manual verification steps.

---

## 9. UI and Experience Requirements

The UI must provide:
- A timeline/stepper interface for active runs.
- Distinct visual separation between human-action-required steps and automated steps.
- Deep links back to the originating incident/risk.


### 9.1 Cross-Module UX and Interactivity
- **Contextual Runbook Mounts**: Playbooks visually nest directly inside Incident records, changing state interactively as the user checks off items.
- **Cross-Boundary Escalations**: A single playbook can spawn tasks in Action, alerts in Notification, and blocks in DAuth silently.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Execution timeout bounds (cancel if open > 30 days)
- Global kill switch for automated triggers

---

## 11. Observability and Operations

Required diagnostics:
- Stale active playbooks
- Broken trigger links (linked to deactivated modules)
- Failure rates of automated steps

---

## 12. Required Tests

- Template versioning integrity tests
- Trigger matching tests
- Execution tracking tests (asserting logs are successfully written upon step advancement)
- DAuth boundary tests

---

## 13. Exact Build Instructions

If Playbacks are merely text documents right now:
- Transition the architecture to the `playbook_steps` relational model.
- Implement interacting endpoints where users post "step_complete" which moves the state machine forward.

---

## 14. Acceptance Criteria

Pass only if:
- Playbooks can be sequentially executed.
- Steps enforce role-based access controls explicitly via DAuth.
- The UI properly guides a human responder through an incident.

---

## 15. Fail Conditions

FAIL if:
- Playbooks bypass authorization when running scripts.
- The state is locked in browser memory instead of synchronized to the database.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 55 — Operating Cockpit Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to verify interactive runbook orchestration, assert xstate/workflow boundaries, validate UI steppers, and update the ledger.
