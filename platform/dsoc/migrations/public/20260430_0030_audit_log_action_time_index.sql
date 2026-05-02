-- DSOC audit_log query coverage — Wave 2 closure.
--
-- The dashboard and AI-trigger reconciliation queries filter by
-- (tenant_id, action, occurred_at) but no covering index existed before
-- this migration. Existing indexes covered (tenant_id, occurred_at) and
-- (tenant_id, category, severity, occurred_at) only — neither helps when
-- the predicate is a specific action like 'ai.agent.completed' or
-- 'risk.created'. Without this index those queries seq-scan the whole
-- table, which is the difference between sub-second and ~10s response
-- once the log accumulates production volume.
--
-- Idempotent: CREATE INDEX IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_audit_log_action_time
  ON platform_dsoc.audit_log (tenant_id, action, occurred_at DESC);
