# Normalization audit — schema `dos`

Generated 2026-04-30T03:44:09.211Z

## Summary

- **tablesWithoutPK**: 6
- **foreignKeysWithoutIndex**: 8
- **jsonbColumns**: 113
- **compositePKsOver2Cols**: 1
- **denormalizedNameColumns**: 14
- **tenantIdColumnsWithoutIndex**: 28
- **uniqueCandidates**: 67

## Findings

### tablesWithoutPK (6)

```json
[
  "_test_idempotent_1777175520394",
  "_test_idempotent_1777175883798",
  "_test_idempotent_1777176053723",
  "_test_idempotent_1777176770358",
  "_test_idempotent_1777177122725",
  "_test_idempotent_1777177739829"
]
```

### foreignKeysWithoutIndex (8)

```json
[
  {
    "table_name": "ai_workflow_trigger_log",
    "col_name": "trigger_id",
    "conname": "ai_workflow_trigger_log_trigger_id_fkey"
  },
  {
    "table_name": "business_units",
    "col_name": "organization_id",
    "conname": "business_units_organization_id_fkey"
  },
  {
    "table_name": "compliance_requirements",
    "col_name": "framework_id",
    "conname": "compliance_requirements_framework_id_fkey"
  },
  {
    "table_name": "dynamic_ui_agent_squads",
    "col_name": "orchestrator_agent_id",
    "conname": "dynamic_ui_agent_squads_orchestrator_agent_id_fkey"
  },
  {
    "table_name": "dynamic_ui_navigation",
    "col_name": "parent_id",
    "conname": "dynamic_ui_navigation_parent_id_fkey"
  },
  {
    "table_name": "location_bu_map",
    "col_name": "bu_id",
    "conname": "location_bu_map_bu_id_fkey"
  },
  {
    "table_name": "positions",
    "col_name": "bu_id",
    "conname": "positions_bu_id_fkey"
  },
  {
    "table_name": "training_enrollments",
    "col_name": "course_id",
    "conname": "training_enrollments_course_id_fkey"
  }
]
```

### jsonbColumns (113)

```json
[
  {
    "table_name": "access_reviews",
    "column_name": "scope"
  },
  {
    "table_name": "agent_action_receipts",
    "column_name": "after_state"
  },
  {
    "table_name": "agent_action_receipts",
    "column_name": "before_state"
  },
  {
    "table_name": "agent_memory",
    "column_name": "payload"
  },
  {
    "table_name": "agent_recommendations",
    "column_name": "evidence_links"
  },
  {
    "table_name": "agent_run_steps",
    "column_name": "payload"
  },
  {
    "table_name": "agent_run_steps",
    "column_name": "result"
  },
  {
    "table_name": "agrc_agent_memory",
    "column_name": "value"
  },
  {
    "table_name": "agrc_agent_runs",
    "column_name": "context"
  },
  {
    "table_name": "agrc_agent_runs",
    "column_name": "result"
  },
  {
    "table_name": "agrc_cycles",
    "column_name": "agents"
  },
  {
    "table_name": "agrc_cycles",
    "column_name": "context"
  },
  {
    "table_name": "agrc_cycles",
    "column_name": "results"
  },
  {
    "table_name": "agrc_discoveries",
    "column_name": "metadata"
  },
  {
    "table_name": "agrc_handoffs",
    "column_name": "payload"
  },
  {
    "table_name": "agrc_proposed_actions",
    "column_name": "payload"
  },
  {
    "table_name": "agrc_tasks",
    "column_name": "input_data"
  },
  {
    "table_name": "agrc_tasks",
    "column_name": "output_data"
  },
  {
    "table_name": "ai_agent_registry",
    "column_name": "capabilities"
  },
  {
    "table_name": "ai_model_registry",
    "column_name": "capabilities"
  },
  {
    "table_name": "ai_workflow_trigger_log",
    "column_name": "payload"
  },
  {
    "table_name": "ai_workflow_triggers",
    "column_name": "rule"
  },
  {
    "table_name": "assets",
    "column_name": "metadata"
  },
  {
    "table_name": "audit_log",
    "column_name": "details"
  },
  {
    "table_name": "audit_log_archive",
    "column_name": "after_state"
  },
  {
    "table_name": "audit_log_archive",
    "column_name": "before_state"
  },
  {
    "table_name": "audit_logs",
    "column_name": "after_state"
  },
  {
    "table_name": "audit_logs",
    "column_name": "before_state"
  },
  {
    "table_name": "audit_logs",
    "column_name": "metadata"
  },
  {
    "table_name": "audit_trail",
    "column_name": "payload"
  }
]
```

_(showing 30 of 113)_

### compositePKsOver2Cols (1)

```json
[
  {
    "table_name": "tenant_migrations",
    "pk_cols": "{tenant_id,migration_id,checksum}"
  }
]
```

### denormalizedNameColumns (14)

```json
[
  {
    "table_name": "access_profiles",
    "denormalized_col": "profile_code",
    "fk_col": "profile_id"
  },
  {
    "table_name": "audit_logs",
    "denormalized_col": "actor_email",
    "fk_col": "actor_id"
  },
  {
    "table_name": "departments",
    "denormalized_col": "department_code",
    "fk_col": "department_id"
  },
  {
    "table_name": "functional_roles",
    "denormalized_col": "role_code",
    "fk_col": "role_id"
  },
  {
    "table_name": "governance_os_learning_signals",
    "denormalized_col": "signal_name",
    "fk_col": "signal_id"
  },
  {
    "table_name": "job_registry",
    "denormalized_col": "job_code",
    "fk_col": "job_id"
  },
  {
    "table_name": "maturity_signals",
    "denormalized_col": "signal_name",
    "fk_col": "signal_id"
  },
  {
    "table_name": "permissions",
    "denormalized_col": "permission_code",
    "fk_col": "permission_id"
  },
  {
    "table_name": "sod_rules",
    "denormalized_col": "rule_code",
    "fk_col": "rule_id"
  },
  {
    "table_name": "teams",
    "denormalized_col": "team_code",
    "fk_col": "team_id"
  },
  {
    "table_name": "tenants",
    "denormalized_col": "tenant_code",
    "fk_col": "tenant_id"
  },
  {
    "table_name": "tenants",
    "denormalized_col": "tenant_name",
    "fk_col": "tenant_id"
  },
  {
    "table_name": "workflow_templates",
    "denormalized_col": "template_code",
    "fk_col": "template_id"
  },
  {
    "table_name": "workspaces",
    "denormalized_col": "workspace_name",
    "fk_col": "workspace_id"
  }
]
```

### tenantIdColumnsWithoutIndex (28)

```json
[
  "agent_action_receipts",
  "agent_evidence_links",
  "audit_log",
  "config_audit_logs",
  "config_locks",
  "config_runtime_overrides",
  "config_values",
  "delegations",
  "executive_briefings",
  "job_executions",
  "lifecycle_auth_log",
  "location_bu_map",
  "login_attempts",
  "maturity_questions",
  "platform_audit_logs",
  "sessions",
  "tenant_config_versions_legacy",
  "tenant_feature_flag_overrides",
  "tenant_memberships",
  "tenant_migrations_failed",
  "tenant_migrations_latest",
  "tenant_product_activation",
  "tenant_settings_legacy",
  "user_access_profiles",
  "user_role_assignments",
  "v_foundation_entities",
  "workflow_templates",
  "workspaces"
]
```

### uniqueCandidates (67)

```json
[
  {
    "table_name": "access_profiles",
    "column_name": "profile_code"
  },
  {
    "table_name": "agent_recommendations",
    "column_name": "module_code"
  },
  {
    "table_name": "agent_runs",
    "column_name": "module_code"
  },
  {
    "table_name": "ai_agent_registry",
    "column_name": "model_code"
  },
  {
    "table_name": "ai_prompt_registry",
    "column_name": "model_code"
  },
  {
    "table_name": "ai_prompt_registry",
    "column_name": "module_code"
  },
  {
    "table_name": "ai_workflow_triggers",
    "column_name": "workflow_code"
  },
  {
    "table_name": "approval_matrix_rules",
    "column_name": "action_code"
  },
  {
    "table_name": "approval_matrix_rules",
    "column_name": "module_code"
  },
  {
    "table_name": "approval_matrix_rules",
    "column_name": "required_authority_code"
  },
  {
    "table_name": "audit_logs",
    "column_name": "actor_email"
  },
  {
    "table_name": "business_units",
    "column_name": "code"
  },
  {
    "table_name": "committees",
    "column_name": "code"
  },
  {
    "table_name": "compliance_requirements",
    "column_name": "code"
  },
  {
    "table_name": "component_registry",
    "column_name": "module_code"
  },
  {
    "table_name": "component_registry",
    "column_name": "product_code"
  },
  {
    "table_name": "config_definitions",
    "column_name": "module_code"
  },
  {
    "table_name": "departments",
    "column_name": "code"
  },
  {
    "table_name": "departments",
    "column_name": "department_code"
  },
  {
    "table_name": "dynamic_ui_actions",
    "column_name": "workflow_code"
  },
  {
    "table_name": "dynamic_ui_agent_actions",
    "column_name": "workflow_code"
  },
  {
    "table_name": "dynamic_ui_agent_squads",
    "column_name": "module_code"
  },
  {
    "table_name": "dynamic_ui_agents",
    "column_name": "module_code"
  },
  {
    "table_name": "dynamic_ui_navigation",
    "column_name": "module_code"
  },
  {
    "table_name": "dynamic_ui_routes",
    "column_name": "module_code"
  },
  {
    "table_name": "dynamic_ui_skill_packs",
    "column_name": "module_codes"
  },
  {
    "table_name": "feature_flags",
    "column_name": "module_code"
  },
  {
    "table_name": "framework_recommendation_rules",
    "column_name": "framework_code"
  },
  {
    "table_name": "functional_roles",
    "column_name": "role_code"
  },
  {
    "table_name": "governance_context",
    "column_name": "module_code"
  }
]
```

_(showing 30 of 67)_

