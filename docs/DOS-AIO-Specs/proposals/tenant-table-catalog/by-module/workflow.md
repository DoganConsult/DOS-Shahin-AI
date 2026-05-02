# Module: `workflow`

**Owner service:** `workflow-service` -- **Tables:** 83 -- **Has-data:** 22 -- **Schema-only:** 61

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `agrc_runbooks` | 13 | AGRC runbooks | R |  |
| 2 | `ai_step_executions` | 15 | Workflow -- Ai Step Executions | N |  |
| 3 | `ai_step_feedback` | 8 | Workflow -- Ai Step Feedback | N |  |
| 4 | `approval_history` | 20 | Workflow -- Approval: Historical change records | P |  |
| 5 | `approval_packs` | 13 | Workflow -- Approval record (Approval Packs) | T |  |
| 6 | `approval_requests` | 22 | Workflow -- Approval record (Approval Requests) | T |  |
| 7 | `approvals` | 10 | Workflow -- Approval record (Approvals) | T |  |
| 8 | `approver_resolution_cache` | 8 | Workflow -- Approver Resolution: Cached values | P |  |
| 9 | `auto_approval_config` | 9 | Workflow -- Auto Approval: Configuration values | P | ✓ |
| 10 | `automation_rules_legacy` | 14 | Workflow -- Automation Rules Legacy | N |  |
| 11 | `autonomous_workflow_config` | 8 | Workflow -- Autonomous Workflow: Configuration values | P |  |
| 12 | `cadence_tasks` | 11 | Workflow -- Cadence: Task records | P |  |
| 13 | `cep_event_windows` | 9 | Workflow -- Cep Event Windows | N |  |
| 14 | `cep_pattern_definitions` | 17 | Workflow -- Cep Pattern: Definition catalog | P | ✓ |
| 15 | `default_automation_templates` | 9 | Workflow -- Default Automation: Template catalog | P | ✓ |
| 16 | `event_consumer_cursors` | 5 | Workflow -- Event Consumer Cursors | N |  |
| 17 | `event_entity_sequences` | 4 | Workflow -- Event Entity Sequences | N |  |
| 18 | `event_idempotency_log` | 3 | Workflow -- Event Idempotency: Activity/audit log records | P | ✓ |
| 19 | `event_type_registry` | 12 | Workflow -- Event Type Registry | N |  |
| 20 | `inbound_handler_registry` | 10 | Workflow -- Inbound Handler Registry | N | ✓ |
| 21 | `process_audit_trail` | 12 | Workflow -- Process: Audit-trail entries | P |  |
| 22 | `process_metrics` | 31 | Workflow -- Process: Metric data points | P |  |
| 23 | `process_tasks` | 34 | Workflow -- Process: Task records | P |  |
| 24 | `process_templates` | 9 | Workflow -- Process: Template catalog | P |  |
| 25 | `processes` | 10 | Workflow -- Processes | N |  |
| 26 | `sla_auto_setup_log` | 25 | Workflow -- Sla Auto Setup: Activity/audit log records | P |  |
| 27 | `sla_breaches` | 14 | Workflow -- Sla Breaches | N |  |
| 28 | `sla_definitions` | 16 | Workflow -- Sla: Definition catalog | P |  |
| 29 | `sla_predictions` | 16 | Workflow -- Sla Predictions | N |  |
| 30 | `sla_priority_config` | 6 | Workflow -- Sla Priority: Configuration values | P | ✓ |
| 31 | `task_auto_resolution_rules` | 11 | Workflow -- Task Auto Resolution: Rules/policy definitions | P | ✓ |
| 32 | `task_routing_rules` | 19 | Workflow -- Task Routing: Rules/policy definitions | P | ✓ |
| 33 | `wf_approval_decisions` | 13 | Workflow -- Decision record (Wf Approval Decisions) | T |  |
| 34 | `workflow_acl` | 7 | Workflow -- Workflow Acl | N |  |
| 35 | `workflow_agent_tool_policy` | 9 | Workflow -- AI agent record (Workflow Agent Tool Policy) | T |  |
| 36 | `workflow_ai_agents` | 10 | Workflow -- AI agent record (Workflow Ai Agents) | T | ✓ |
| 37 | `workflow_ai_budget` | 13 | Workflow -- Workflow Ai Budget | N |  |
| 38 | `workflow_ai_notes` | 17 | Workflow -- Workflow Ai Notes | N |  |
| 39 | `workflow_ai_policy` | 11 | Workflow -- Policy record (Workflow Ai Policy) | T |  |
| 40 | `workflow_attachments` | 13 | Workflow -- Workflow: File/blob attachments | P |  |
| 41 | `workflow_auto_initiation` | 22 | Workflow -- Workflow Auto Initiation | N |  |
| 42 | `workflow_categories` | 11 | Workflow -- Workflow: Category taxonomy | P | ✓ |
| 43 | `workflow_chain_definitions` | 8 | Workflow -- Workflow Chain: Definition catalog | P | ✓ |
| 44 | `workflow_chain_instances` | 11 | Workflow -- Workflow Chain Instances | N |  |
| 45 | `workflow_chain_step_log` | 11 | Workflow -- Workflow Chain Step: Activity/audit log records | P |  |
| 46 | `workflow_comments` | 16 | Workflow -- Workflow Comments | N |  |
| 47 | `workflow_conditions` | 10 | Workflow -- Workflow Conditions | N |  |
| 48 | `workflow_decision_log` | 15 | Workflow -- Workflow Decision: Activity/audit log records | P |  |
| 49 | `workflow_draft_actions` | 18 | Workflow -- Workflow Draft: Action/operation catalog | P |  |
| 50 | `workflow_escalation_policies` | 13 | Workflow -- Workflow Escalation Policies | N |  |
| 51 | `workflow_events` | 12 | Workflow -- Workflow: Domain event records | P |  |
| 52 | `workflow_executions` | 17 | Workflow -- Workflow Executions | N |  |
| 53 | `workflow_executions_archive` | 14 | Workflow -- Workflow Executions Archive | N |  |
| 54 | `workflow_forbidden_boundaries` | 9 | Workflow -- Workflow Forbidden Boundaries | N | ✓ |
| 55 | `workflow_graph_versions` | 9 | Workflow -- Workflow Graph: Versioned record history | P |  |
| 56 | `workflow_instance_steps` | 15 | Workflow -- Workflow Instance: Execution step records | P |  |
| 57 | `workflow_instances` | 23 | Workflow -- Workflow Instances | N |  |
| 58 | `workflow_intervention_log` | 10 | Workflow -- Workflow Intervention: Activity/audit log records | P |  |
| 59 | `workflow_kill_switch` | 10 | Workflow -- Workflow Kill Switch | N |  |
| 60 | `workflow_lookup_options` | 13 | Workflow -- Workflow Lookup Options | N | ✓ |
| 61 | `workflow_mandatory_review` | 8 | Workflow -- Workflow Mandatory Review | N | ✓ |
| 62 | `workflow_mandatory_review_points` | 9 | Workflow -- Workflow Mandatory Review Points | N | ✓ |
| 63 | `workflow_profile_catalog` | 11 | Workflow -- Workflow Profile Catalog | N | ✓ |
| 64 | `workflow_profile_states` | 12 | Workflow -- Workflow Profile: State-machine state catalog | P | ✓ |
| 65 | `workflow_raci_config` | 6 | Workflow -- Workflow Raci: Configuration values | P | ✓ |
| 66 | `workflow_recommendation_catalog` | 11 | Workflow -- Workflow Recommendation Catalog | N | ✓ |
| 67 | `workflow_retention_policies` | 8 | Workflow -- Workflow Retention Policies | N |  |
| 68 | `workflow_rollback_log` | 13 | Workflow -- Workflow Rollback: Activity/audit log records | P |  |
| 69 | `workflow_rules` | 14 | Workflow -- Workflow: Rules/policy definitions | P |  |
| 70 | `workflow_schedules` | 13 | Workflow -- Workflow Schedules | N |  |
| 71 | `workflow_state_history` | 15 | Workflow -- Workflow State: Historical change records | P |  |
| 72 | `workflow_step_autonomy` | 10 | Workflow -- Workflow Step Autonomy | N | ✓ |
| 73 | `workflow_steps` | 32 | Workflow -- Workflow: Execution step records | P |  |
| 74 | `workflow_subscribers` | 8 | Workflow -- Workflow Subscribers | N |  |
| 75 | `workflow_task_assignments` | 13 | Workflow -- Workflow Task: Assignment mapping (X to Y) | P |  |
| 76 | `workflow_tasks` | 16 | Workflow -- Workflow: Task records | P |  |
| 77 | `workflow_templates` | 13 | Workflow -- Workflow: Template catalog | P |  |
| 78 | `workflow_timeline_entries` | 15 | Workflow timeline tracking | R |  |
| 79 | `workflow_transitions` | 13 | Workflow -- Workflow Transitions | N |  |
| 80 | `workflow_triggers` | 23 | Workflow -- Workflow Triggers | N | ✓ |
| 81 | `workflow_versions` | 14 | Workflow -- Workflow: Versioned record history | P |  |
| 82 | `workflow_webhooks` | 13 | Workflow -- Workflow Webhooks | N |  |
| 83 | `workflows` | 17 | Workflow -- Workflows | N | ✓ |
