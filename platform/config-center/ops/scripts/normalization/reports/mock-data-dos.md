# Mock-data audit — schema `dos`

Generated 2026-04-30T03:52:24.748Z

## Summary

| Bucket | Count |
|---|---|
| **total** | 175 |
| **empty** | 122 |
| **demoOnly** | 2 |
| **mostlyMock** | 0 |
| **criticalNullSweep** | 7 |
| **singletonSeed** | 0 |
| **healthy** | 44 |

## Empty tables (must be seeded with real data, or DROPPED)

```
access_review_items
access_reviews
action_items
agent_action_receipts
agent_evidence_links
agent_memory
agent_recommendations
agent_run_steps
agent_runs
agrc_agent_memory
agrc_agent_runs
agrc_cycles
agrc_discoveries
agrc_handoffs
agrc_proposed_actions
agrc_tasks
ai_model_registry
ai_prompt_registry
approval_matrix_rules
assets
audit_findings
audit_log_archive
audit_logs
audit_plans
bcp_plans
briefings
committee_meetings
committee_members
compliance_frameworks
compliance_requirements
component_registry
config_audit_logs
config_center_audit_log
config_locks
config_runtime_overrides
controls
dashboard_widgets
dashboards
dora_assessments
dynamic_ui_component_registry
dynamic_ui_skill_packs
dynamic_ui_tenant_overrides
dynamic_ui_user_preferences
event_dead_letter_queue
evidence
evidences
executive_briefings
framework_branching_rules
framework_recommendation_rules
governance_context
governance_decisions
governance_initiatives
governance_os_cases
governance_os_config
governance_os_learning_metrics
governance_os_learning_signals
governance_policies
inbox_items
incidents
integrations
invitations
leadership_digests
lifecycle_auth_log
location_bu_map
login_attempts
maturity_assessment_responses
maturity_assessments
maturity_dimension_definitions
maturity_questions
maturity_signals
migration_history
migration_lock
mobile_sessions
module_operating_state
module_sla_defaults
onboarding_journeys
ownership_mappings
policies
portals
position_assignments
privacy_assessments
proactive_leadership_milestones
product_licenses
product_registry
qiyas_journeys
records
remediation_actions
remediations
report_schedules
risks
runtime_config
runtime_config_history
shell_config
sod_conflict_audit
sso_identities
sso_providers
sso_role_mappings
sso_sessions
system_events
team_members
team_raci_assignments
tenant_config_versions
tenant_config_versions_legacy
tenant_dashboard_widget_pins
tenant_feature_flag_overrides
tenant_settings_legacy
training_courses
training_enrollments
training_programs
user_org_scope
user_roles
vendor_engagement_scores
vendors
widgets
work_items
workflow_approvals
workflow_instances
workflow_schedules
workflow_sla_configs
workflow_tasks
workspace_config
workspaces
```

## Demo-only tables (every row matches mock pattern)

```json
[
  {
    "table": "notifications",
    "rows": 4,
    "mockRows": 4
  },
  {
    "table": "organizations",
    "rows": 41,
    "mockRows": 41
  }
]
```

## Mostly-mock tables (≥50% rows match mock pattern)

_none_

## Critical-column null sweep (name/title/email all NULL)

```json
[
  {
    "table": "committees",
    "columns": {
      "description": "125/125 (100% NULL/empty)"
    }
  },
  {
    "table": "departments",
    "columns": {
      "description": "27/27 (100% NULL/empty)"
    }
  },
  {
    "table": "feature_flags",
    "columns": {
      "display_name": "43/43 (100% NULL/empty)"
    }
  },
  {
    "table": "job_registry",
    "columns": {
      "description": "10/10 (100% NULL/empty)"
    }
  },
  {
    "table": "locations",
    "columns": {
      "description": "125/125 (100% NULL/empty)"
    }
  },
  {
    "table": "positions",
    "columns": {
      "description": "249/249 (100% NULL/empty)"
    }
  },
  {
    "table": "teams",
    "columns": {
      "description": "3/3 (100% NULL/empty)"
    }
  }
]
```

## Singleton seeds (1 row, default/sample/demo prefix)

_none_
