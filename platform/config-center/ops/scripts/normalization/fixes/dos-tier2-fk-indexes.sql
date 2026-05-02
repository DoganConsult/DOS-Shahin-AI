-- TIER 2 — CREATE INDEX on FK columns missing index in schema dos
-- Generated 2026-04-30T03:47:41.254Z
-- Why: PostgreSQL does NOT auto-index FK columns. Cascade DELETE
--      on the parent table sequential-scans the child for every row.
-- Uses CONCURRENTLY where possible for online build.

CREATE INDEX IF NOT EXISTS "ix_ai_workflow_trigger_log_trigger_id"
  ON "dos"."ai_workflow_trigger_log" ("trigger_id");

CREATE INDEX IF NOT EXISTS "ix_business_units_organization_id"
  ON "dos"."business_units" ("organization_id");

CREATE INDEX IF NOT EXISTS "ix_compliance_requirements_framework_id"
  ON "dos"."compliance_requirements" ("framework_id");

CREATE INDEX IF NOT EXISTS "ix_dynamic_ui_agent_squads_orchestrator_agent_id"
  ON "dos"."dynamic_ui_agent_squads" ("orchestrator_agent_id");

CREATE INDEX IF NOT EXISTS "ix_dynamic_ui_navigation_parent_id"
  ON "dos"."dynamic_ui_navigation" ("parent_id");

CREATE INDEX IF NOT EXISTS "ix_location_bu_map_bu_id"
  ON "dos"."location_bu_map" ("bu_id");

CREATE INDEX IF NOT EXISTS "ix_positions_bu_id"
  ON "dos"."positions" ("bu_id");

CREATE INDEX IF NOT EXISTS "ix_training_enrollments_course_id"
  ON "dos"."training_enrollments" ("course_id");

