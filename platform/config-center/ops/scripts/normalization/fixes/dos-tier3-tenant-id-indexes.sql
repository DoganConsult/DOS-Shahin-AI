-- TIER 3 — CREATE INDEX on tenant_id columns in schema dos
-- Generated 2026-04-30T03:47:41.254Z
-- Why: every tenant-scoped query filters on tenant_id; without an
--      index this becomes a table scan per request.

CREATE INDEX IF NOT EXISTS "ix_agent_action_receipts_tenant_id"
  ON "dos"."agent_action_receipts" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_agent_evidence_links_tenant_id"
  ON "dos"."agent_evidence_links" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_audit_log_tenant_id"
  ON "dos"."audit_log" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_config_audit_logs_tenant_id"
  ON "dos"."config_audit_logs" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_config_locks_tenant_id"
  ON "dos"."config_locks" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_config_runtime_overrides_tenant_id"
  ON "dos"."config_runtime_overrides" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_config_values_tenant_id"
  ON "dos"."config_values" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_delegations_tenant_id"
  ON "dos"."delegations" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_executive_briefings_tenant_id"
  ON "dos"."executive_briefings" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_job_executions_tenant_id"
  ON "dos"."job_executions" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_lifecycle_auth_log_tenant_id"
  ON "dos"."lifecycle_auth_log" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_location_bu_map_tenant_id"
  ON "dos"."location_bu_map" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_login_attempts_tenant_id"
  ON "dos"."login_attempts" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_maturity_questions_tenant_id"
  ON "dos"."maturity_questions" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_platform_audit_logs_tenant_id"
  ON "dos"."platform_audit_logs" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_sessions_tenant_id"
  ON "dos"."sessions" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_config_versions_legacy_tenant_id"
  ON "dos"."tenant_config_versions_legacy" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_feature_flag_overrides_tenant_id"
  ON "dos"."tenant_feature_flag_overrides" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_memberships_tenant_id"
  ON "dos"."tenant_memberships" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_migrations_failed_tenant_id"
  ON "dos"."tenant_migrations_failed" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_migrations_latest_tenant_id"
  ON "dos"."tenant_migrations_latest" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_product_activation_tenant_id"
  ON "dos"."tenant_product_activation" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_tenant_settings_legacy_tenant_id"
  ON "dos"."tenant_settings_legacy" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_user_access_profiles_tenant_id"
  ON "dos"."user_access_profiles" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_user_role_assignments_tenant_id"
  ON "dos"."user_role_assignments" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_workflow_templates_tenant_id"
  ON "dos"."workflow_templates" (tenant_id);

CREATE INDEX IF NOT EXISTS "ix_workspaces_tenant_id"
  ON "dos"."workspaces" (tenant_id);

