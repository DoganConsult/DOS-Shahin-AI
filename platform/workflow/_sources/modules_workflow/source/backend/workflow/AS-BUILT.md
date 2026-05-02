# Workflow Module — AS-BUILT Ledger

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `workflow` |
| Spec | MP-02 (`DOS-AIO-Specs/module-patch-02-workflow-end-to-end.md`) |
| Layer | Domain / module infrastructure hybrid |
| Criticality | Platform-wide control critical |
| Product Owner | `shahin` |
| Route Base | `/api/workflow`, `/api/workflows`, `/api/approval-requests`, `/api/process-tasks`, `/api/task-board`, `/api/work-items` |
| Version | 2.0.0 |
| Tier | platform |
| Agent Binding | A02 |

## Owned Artifacts

### Backend Services (71 real implementations)

| Service | Path | Purpose |
|---------|------|---------|
| Workflow Definition | `services/core/workflow-definition.service.ts` | Create, read, update workflow definitions |
| Transition Registry | `services/core/transition-registry.service.ts` | Manage state transitions |
| Workflow SLA | `services/core/workflow-sla.service.ts` | SLA monitoring, warnings, breaches |
| Workflow Escalation | `services/core/workflow-escalation.service.ts` | Escalation handling |
| Workflow Categories | `services/core/workflow-categories.service.ts` | Workflow category taxonomy |
| Workflow Lookups | `services/core/workflow-lookups.service.ts` | Lookup data management |
| Workflow Mermaid | `services/core/workflow-mermaid.service.ts` | Diagram generation |
| Template CRUD | `services/core/workflow-template-crud.service.ts` | Template CRUD operations |
| Approval Routing | `services/approvals/approval-routing.service.ts` | Comprehensive approval routing logic (607 lines) |
| Approval Prescreen | `services/approvals/approval-prescreen.service.ts` | Pre-screen approvals before human review |
| Draft Actions | `services/approvals/workflow-draft-actions.service.ts` | Draft task/email/response/approval actions |
| Mandatory Review | `services/approvals/workflow-mandatory-review.service.ts` | Mandatory review point management |
| Workflow AI | `services/ai/workflow-ai.service.ts` | AI action configuration, allowed/blocked lists |
| Module AI Orchestrator | `services/ai/module-ai-orchestrator.service.ts` | Cross-module AI orchestration (293 lines) |
| Next Best Action | `services/ai/next-best-action.service.ts` | Priority queue for actionable items |
| Agent Role | `services/ai/workflow-agent-role.service.ts` | AI agents as workflow participants (441 lines) |
| AI Policy | `services/ai/workflow-ai-policy.service.ts` | Per-module AI policy management |
| AI Budget | `services/ai/workflow-ai-budget.service.ts` | AI operation budget tracking |
| AI Notes | `services/ai/workflow-ai-notes.service.ts` | AI guidance notes and coaching |
| Step Autonomy | `services/ai/workflow-step-autonomy.service.ts` | Step-level autonomy scope |
| Recommendation Catalog | `services/ai/workflow-recommendation-catalog.service.ts` | AI recommendation categories |
| Agent Execution | `services/autonomous-workflow/agent-execution.ts` | Execute steps via AI agents (312 lines) |
| Autonomous Chain | `services/autonomous-workflow/autonomous-chain.ts` | Autonomous chain processing |
| Confidence Decision | `services/autonomous-workflow/confidence-decision.ts` | Confidence scoring for AI takeover |
| Task Board | `services/tasks/task-board.service.ts` | Kanban board with urgency/transitions |
| Task Triage | `services/tasks/task-triage.service.ts` | Smart task triage and auto-assignment |
| Task Auto-Resolution | `services/tasks/task-auto-resolution.service.ts` | Auto-resolve low-complexity tasks (327 lines) |
| Workload Balancer | `services/tasks/workload-balancer.service.ts` | Workload balancing across team members |
| Process Task Monitor | `services/tasks/process-task-monitor.service.ts` | Monitor process tasks (398 lines) |
| Process Template | `services/tasks/process-template.service.ts` | Process templates |
| Workflow Templates | `services/templates/workflow-templates.service.ts` | Primary template service (662 lines) |
| Workflow Versioning | `services/templates/workflow-versioning.service.ts` | Version management |
| Workflow Comparison | `services/templates/workflow-comparison.service.ts` | Version comparison |
| Workflow Serialization | `services/templates/workflow-serialization.service.ts` | Serialization to/from JSON |
| Version Rollout Admin | `admin/version-rollout-admin.service.ts` | Promote, deprecate, rollout versions (304 lines) |
| Workflow Dashboard | `services/dashboard/workflow-dashboard.service.ts` | Dashboard analytics and metrics |
| Workflow Diagnostics | `services/diagnostics/workflow-diagnostics.service.ts` | Module health checks |
| Execution Audit Viewer | `services/diagnostics/execution-audit-viewer.service.ts` | Audit trail viewers |
| Lifecycle Bridge | `services/integration/lifecycle-bridge.service.ts` | Bridge with lifecycle system |
| Chain Executor | `services/chains/workflow-chain-executor.service.ts` | Execute chained workflows |
| Workflow ACL | `services/ops/workflow-acl.service.ts` | Access control lists |
| Workflow Advanced | `services/ops/workflow-advanced.service.ts` | Conditions, delegation, simulation |
| Workflow Attachments | `services/ops/workflow-attachments.service.ts` | File attachments |
| Workflow Automation | `services/ops/workflow-automation.service.ts` | Automation rule execution |
| Workflow Comments | `services/ops/workflow-comments.service.ts` | Comments on instances |
| Workflow Kill Switch | `services/ops/workflow-kill-switch.service.ts` | Emergency stop |
| Workflow Queue | `services/ops/workflow-queue.service.ts` | Task queue management |
| Workflow Retention | `services/ops/workflow-retention.service.ts` | Data retention policies |
| Workflow Rollback | `services/ops/workflow-rollback.service.ts` | Rollback/undo functionality |
| Workflow Stall Recovery | `services/ops/workflow-stall-recovery.service.ts` | Detect/recover stalled workflows |

### Backend Routes (27 route files in catalog)

| Mount Path | Route File | Key Endpoints |
|------------|-----------|---------------|
| `/api/workflow` | `routes/workflow/workflow-3level.routes.ts` | Barrel: AI, controls, drafts, instance ops, monitoring, supervisor |
| `/api/workflows` | `routes/misc/workflows.routes.ts` | Primary CRUD, execution, simulation, analytics, templates |
| `/api/approval-requests` | `routes/misc/approval-requests.routes.ts` | Approval request handling |
| `/api/approval-routing` | `routes/misc/approval-routing.routes.ts` | Approval routing logic |
| `/api/autonomous-workflows` | `routes/misc/autonomous-workflow.routes.ts` | Autonomous execution |
| `/api/cooperative-workflows` | `routes/misc/cooperative-workflows.routes.ts` | Multi-party workflows |
| `/api/journey` | `routes/misc/journey.routes.ts` | Workflow journey/timeline |
| `/api/module-workflows` | `routes/misc/module-workflow.routes.ts` | Module-level workflows |
| `/api/process-tasks` | `routes/misc/process-tasks.routes.ts` | Process task management |
| `/api/review-cycle` | `routes/misc/review-cycle.routes.ts` | Review cycle management |
| `/api/task-board` | `routes/misc/task-board.routes.ts` | Kanban board |
| `/api/work-items` | `routes/misc/work-items.routes.ts` | Work item tracking |
| `/api/workflow-bulk-tasks` | `routes/misc/bulk-tasks.routes.ts` | Bulk operations |
| `/api/module-ai-orchestrator` | `routes/misc/module-ai-orchestrator.routes.ts` | AI orchestration |
| `/api/workflow/admin` | `routes/workflow/workflow-admin.routes.ts` | Admin endpoints |
| `/api/workflow/advanced` | `routes/workflow/workflow-advanced.routes.ts` | Advanced features |
| `/api/workflow/agents` | `routes/workflow/workflow-agent.routes.ts` | AI agent routes |
| `/api/workflow/attachments` | `routes/workflow/workflow-attachments.routes.ts` | File attachments |
| `/api/workflow-chains` | `routes/workflow/workflow-chain.routes.ts` | Workflow chains |
| `/api/workflow/comments` | `routes/workflow/workflow-comments.routes.ts` | Comments/discussion |
| `/api/workflow-enterprise` | `routes/workflow/workflow-enterprise.routes.ts` | Enterprise features |
| `/api/workflow-ext` | `routes/workflow/workflow-ext.routes.ts` | Extensions |
| `/api/workflow-import-export` | `routes/workflow/workflow-import-export.routes.ts` | Import/export |
| `/api/workflow/lookups` | `routes/workflow/workflow-lookups.routes.ts` | Lookup data |
| `/api/workflow-templates` | `routes/workflow/workflow-templates.routes.ts` | Template endpoints |
| `/api/workflow/diagnostics` | `routes/workflow-diagnostics.routes.ts` | Health/diagnostics |
| `/api/workflow-profile` | `routes/workflow-profile.routes.ts` | User workflow profile |

### Owned Tables (tenant schema, 27 declared in manifest)

- `workflow_workflows` (primary workflow definitions)
- `workflow_instances` (execution instances)
- `workflow_steps` (step definitions)
- `workflow_transitions` (transition definitions)
- `workflow_execution_steps` (execution step records)
- `workflow_approvals` (approval records)
- `workflow_approval_history` (approval audit trail)
- `workflow_sla_timers` (SLA timer records)
- `workflow_escalation_records` (escalation tracking)
- `workflow_retry_records` (retry/recovery records)
- `workflow_event_bindings` (event subscription bindings)
- `workflow_audit_logs` (workflow-specific audit)
- `workflow_templates` (template definitions)
- `workflow_versions` (version records)
- `workflow_chains` (chain definitions)
- `workflow_chain_steps` (chain step records)
- `workflow_autonomous_configs` (autonomous workflow configs)
- `workflow_autonomous_executions` (autonomous execution records)
- `workflow_cooperative_instances` (multi-party instances)
- `workflow_task_board` (kanban task board)
- `workflow_comments` (instance comments)
- `workflow_attachments` (file attachments)
- `workflow_lookups` (lookup data)
- `workflow_categories` (category taxonomy)
- `workflow_trigger_metadata` (trigger configs)
- `workflow_department_scope` (department scoping)
- `workflow_kill_switch` (emergency stop state)

### Shared Tables (consumed, not owned)

- `approval_requests` (shared — workflow creates, DAuth governs)
- `process_tasks` (shared — orchestration layer)
- `module_configs` (platform)
- `lifecycle_history` (platform)
- `module_lifecycle_transitions` (platform)
- `audit_trail` (owned by audit module)

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate | Approval |
|--------|-------|-----------|----------|
| Create workflow definition | `POST /api/workflows` | `requirePermission('workflow.definition.create')` | No |
| Activate workflow | `POST /api/workflows/:id/activate` | `evaluateLifecycleTransition` (draft→active) | Yes — approval matrix |
| Execute workflow | `POST /api/workflows/:id/execute` | `requirePermission('workflow.instance.execute')` | No |
| Approve step | `POST /api/approval-requests/:id/approve` | `evaluateLifecycleTransition` + sign-off authority | Yes — DAuth approval authority |
| Reject step | `POST /api/approval-requests/:id/reject` | `evaluateLifecycleTransition` + decision authority | No |
| Delegate approval | `POST /api/approval-requests/:id/delegate` | Delegation authority check | No |
| Cancel workflow | `POST /api/workflows/:id/cancel` | `requirePermission('workflow.instance.cancel')` | No |
| Rollback execution | `POST /api/workflow/:id/rollback` | `requirePermission('workflow.instance.rollback')` | Yes — supervisor approval |
| Kill switch | `POST /api/workflow/kill-switch` | Supervisor role required | No |
| Version rollout | `POST /api/workflow/admin/rollout` | `requirePermission('workflow.admin.rollout')` | Yes — admin approval |
| Import workflow | `POST /api/workflow-import-export/import` | `requirePermission('workflow.definition.import')` | No |
| Autonomous step execution | `POST /api/autonomous-workflows/:id/execute` | AI policy + human-in-loop boundary | Conditional — confidence threshold |

## Security Manifest

| Dimension | Count |
|-----------|-------|
| Permissions | 17 unique (approval, autonomous, instance, task, definition, admin, agent) |
| Roles | 8 (executive_owner, module_lead, approver, operator, contributor, reviewer, auditor, viewer) |
| SoD Rules | Defined in `security/workflow.sod.ts` — conflicting role prevention matrix |
| Approval Matrix | Defined in `security/workflow.approval-matrix.ts` — role-based routing, risk-based approver selection |
| Ownership Rules | Defined in `security/workflow.ownership.ts` — scope boundaries (own, department, org) |

## Diagnostics (Rule 6.1)

| Check | Purpose |
|-------|---------|
| Table existence | Verify all 27 workflow tables exist in tenant schema |
| Stuck executions | Detect workflow instances stuck in non-terminal state beyond SLA |
| SLA breach monitoring | Identify breached and approaching SLA timers |
| Overdue tasks | Detect tasks past their due date |
| Stale drafts | Find draft workflows not updated within retention window |
| Blocked closures | Identify instances that cannot close due to pending approvals |
| Unassigned items | Find workflow tasks without an assignee |

## Scheduled Jobs (Rule 4.6)

| Job | Cron | Purpose |
|-----|------|---------|
| `workflow-sla-monitor` | `0 */1 * * *` | Hourly: check approaching/breached SLAs, emit warning/breach events |
| `autonomous-step-processor` | `*/5 * * * *` | Every 5 min: process autonomous workflow steps (registered in agrc-jobs) |
| `escalation-check` | `*/30 * * * *` | Every 30 min: check approval escalations (registered in agrc-jobs) |
| `review-cycle-engine` | `0 2 * * *` | Daily 2 AM: review cycle engine (registered in agrc-jobs) |

## Event Subscribers (Rule 4.4)

| Event | Handler | Effect |
|-------|---------|--------|
| `risk.status_changed` | `handleRiskStatusChanged` | Trigger risk-related workflow transitions |
| `compliance.gap_detected` | `handleComplianceGapDetected` | Create remediation workflow |
| `incident.classified` | `handleIncidentClassified` | Trigger incident response workflow |
| `evidence.collected` | `handleEvidenceCollected` | Advance evidence-dependent steps |
| `audit.finding_created` | `handleAuditFindingCreated` | Create audit finding workflow |
| `policy.approved` | `handlePolicyApproved` | Advance policy approval workflows |
| `vendor.sla_breached` | `handleVendorSlaBreach` | Trigger vendor escalation workflow |
| `exception.approved` | `handleExceptionApproved` | Advance exception workflows |
| `team.member_removed` | `handleTeamMemberRemoved` | Reassign workflows from removed member |
| `onboarding.completed` | `handleOnboardingCompleted` | Trigger post-onboarding workflows |
| `dora.obligation_created` | `handleDoraObligationCreated` | Create DORA compliance workflow |
| `governance_ai.signal_detected` | `handleGovernanceSignalDetected` | AI-triggered governance workflow |

Published Events: 19 (instance_created, instance_completed, instance_cancelled, step_completed, step_failed, step_skipped, approval_requested, approval_granted, approval_rejected, task_assigned, task_completed, task_reassigned, sla_warning, sla_breached, escalation_triggered, chain_started, chain_completed, automation_executed, status_changed)

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workflow/admin/config` | GET | Fetch module configuration |
| `/api/workflow/admin/config` | PUT | Update module configuration |
| `/api/workflow/admin/reseed` | POST | Reseed module data |
| `/api/workflow/admin/health` | GET | Health status |
| `/api/workflow/admin/reindex` | POST | Reindex data |
| `/api/workflow/admin/backfill` | POST | Backfill operations |
| `/api/workflow/admin/rollout` | POST | Version rollout |

## Approval Matrix (Rule 3.4)

| Entity Type | Transitions | Notes |
|-------------|-------------|-------|
| Workflow Definition | draft → in_review → approved → active | Creator cannot approve own definition |
| Workflow Instance | active → suspended, active → cancelled | Supervisor or owner only |
| Approval Step | pending → approved/rejected | Authority-based, SoD enforced |
| Version Rollout | candidate → promoted → deprecated | Admin approval required |

## Audit Trail Coverage (Rule 6.2)

All workflow mutations call `setAuditData()` via `auditMiddleware('workflows')` applied at the barrel level. Tracked actions: creation, execution, transition, approval, rejection, delegation, escalation, cancellation, rollback, import/export, AI autonomous execution, kill switch activation, version rollout.

## i18n Coverage (Rule 2.5)

| File | Keys | Status |
|------|------|--------|
| `i18n/en.json` | 52 | Complete — titles, statuses, actions, errors, empty states, SLA labels |
| `i18n/ar.json` | 52 | Complete — full Arabic translations |

## Known Risks

1. **High migration count (42+ files)**: Accumulated from iterative development. Consider consolidation migration in future release.
2. **Re-export files (6)**: Follow Law 1 pattern but may confuse new developers. Document in module README.
3. **AI autonomy boundary**: Autonomous workflow execution relies on confidence thresholds; misconfigured thresholds could allow AI to act beyond intended scope. Mitigated by `workflow-ai-policy.service.ts` and human-in-loop boundaries.
4. **SLA timer accuracy**: SLA monitor runs hourly; sub-hour SLA requirements need cron adjustment.
5. **Cross-module event ordering**: 15 consumed events from other modules; event ordering guarantees depend on event backbone configuration (300s deduplication window, max 3 retries).
