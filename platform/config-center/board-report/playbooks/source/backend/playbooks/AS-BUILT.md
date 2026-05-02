# AS-BUILT: Playbooks Module (MP-54)

## Module Identity
- **Module Code:** `playbooks`
- **Tier:** Product Hub
- **Criticality:** P2

## Owned Artifacts
- **Database Tables:** `playbook_templates`, `playbook_steps`, `playbook_executions`, `playbook_execution_logs`
- **Aggregate Root:** `playbook_templates`
- **API Surface:** `/api/playbooks/` → `/templates`, `/steps`, `/execute`, `/:executionId/logs`, `/logs`, `/diagnostics`

## Protected Actions (DAuth Enforcement Points)
- `playbooks.template.manage` — Create/edit/transition templates (DAuth lifecycle gated)
- `playbooks.execute` — Launch playbook execution instances
- `playbooks.read` — View templates and execution logs

## Service Families
1. **Template Catalog Service** — `createTemplate()`, `listTemplates()`, `transitionTemplate()`
2. **Step Management** — `addStep()`
3. **Execution Engine Interop** — `executePlaybook()` (spawns workflow instances)
4. **Execution Tracker Service** — `logStep()`, `getExecutionLogs()`
5. **Diagnostics Service** — `runDiagnostics()`

## Diagnostics
- Active templates without steps (critical)
- Stuck executions (running >24h)

## Event Backbone
- Publishes: `playbooks.execution_started`, `playbooks.execution_completed`
- Consumes: `incident.created`, `remediation.created`
