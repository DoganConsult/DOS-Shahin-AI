-- ============================================================================
-- 125_ai_dynamic_tables.sql
-- W1.1 step 2 — Durable migration for 9 AI tables that were being created
-- at runtime by ai-engine-service TypeScript repositories (anti-pattern).
--
-- Tables moved into this migration (DDL extracted verbatim from the repos):
--   - agrc_metrics_snapshots      (src/domain/agrc-engine/repositories/auto-extracted.repo.ts)
--   - agent_priority_weights      (src/domain/agrc-engine/repositories/auto-extracted.repo.ts)
--   - agent_feedback_log          (src/domain/agrc-engine/repositories/auto-extracted.repo.ts)
--   - agent_monitoring_targets    (src/domain/agrc-engine/repositories/auto-extracted.repo.ts)
--   - agrc_os_cycle_log           (src/domain/agrc-engine/repositories/auto-extracted.repo.ts)
--   - autonomous_engine_log       (src/domain/agrc-engine/services/autonomous-grc-engine.service.ts)
--   - ai_impact_assessments       (src/domain/ai-governance/repositories/auto-extracted.repo.ts)
--   - ai_alert_rules              (src/runtime/ai/repositories/auto-extracted.repo.ts)
--   - ai_activity_alerts          (src/runtime/ai/repositories/auto-extracted.repo.ts)
--
-- The runtime CREATE TABLE statements are removed in a follow-up code PR so
-- the migration becomes the single source of truth (same strategy as 099).
--
-- tenant_id is present on every table (some repos already had it, others
-- didn't — this migration ensures RLS-ready columns universally). After
-- creation, tenant_id is backfilled from dos.tenants and set NOT NULL.
--
-- Runs per-tenant schema; run-tenant-migrations.sh prepends SET search_path.
-- Idempotent: CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + UPDATE WHERE NULL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS agrc_metrics_snapshots (
  snapshot_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(64),
  cycle_count              INT DEFAULT 0,
  avg_cycle_ms             INT DEFAULT 0,
  enforcement_rate         DECIMAL(5,2) DEFAULT 0,
  stale_control_pct        DECIMAL(5,2) DEFAULT 0,
  telemetry_ingestion_rate INT DEFAULT 0,
  event_count              INT DEFAULT 0,
  critical_events          INT DEFAULT 0,
  snapshot_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_priority_weights (
  agent_id          VARCHAR(10) PRIMARY KEY,
  tenant_id         VARCHAR(64),
  acceptance_rate   NUMERIC(5,2) DEFAULT 100,
  total_accepted    INT DEFAULT 0,
  total_rejected    INT DEFAULT 0,
  priority_boost    NUMERIC(3,2) DEFAULT 1.0,
  last_updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_feedback_log (
  feedback_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64),
  agent_id         VARCHAR(10) NOT NULL,
  task_id          UUID,
  feedback_type    VARCHAR(20) NOT NULL,
  task_title       TEXT,
  responded_by     VARCHAR(64),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_monitoring_targets (
  target_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64),
  agent_id        VARCHAR(10) NOT NULL,
  target_type     VARCHAR(50) NOT NULL,
  target_config   JSONB NOT NULL DEFAULT '{}',
  priority        VARCHAR(10) DEFAULT 'medium',
  source          VARCHAR(50) DEFAULT 'onboarding',
  enabled         BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, target_type)
);

CREATE TABLE IF NOT EXISTS agrc_os_cycle_log (
  cycle_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64),
  telemetry_ingested   INT DEFAULT 0,
  controls_evaluated   INT DEFAULT 0,
  risks_recomputed     INT DEFAULT 0,
  policy_decisions     INT DEFAULT 0,
  enforcement_actions  INT DEFAULT 0,
  audit_entries        INT DEFAULT 0,
  cycle_ms             INT NOT NULL,
  warnings             JSONB DEFAULT '[]',
  executed_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autonomous_engine_log (
  log_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64),
  evidence_alerts       INT DEFAULT 0,
  policy_alerts         INT DEFAULT 0,
  vendor_alerts         INT DEFAULT 0,
  risk_drifts           INT DEFAULT 0,
  compliance_gaps       INT DEFAULT 0,
  control_issues        INT DEFAULT 0,
  sla_warnings          INT DEFAULT 0,
  framework_gaps        INT DEFAULT 0,
  privacy_alerts        INT DEFAULT 0,
  remediations_created  INT DEFAULT 0,
  total_actions         INT DEFAULT 0,
  cycle_ms              INT DEFAULT 0,
  warnings              JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_impact_assessments (
  assessment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64),
  model_id             UUID NOT NULL,
  created_by           UUID NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'draft',
  risk_level           VARCHAR(20),
  overall_risk_score   NUMERIC(5,2),
  sections_json        JSONB DEFAULT '[]',
  recommendations_json JSONB DEFAULT '[]',
  classification_json  JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_alert_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64),
  rule_name          VARCHAR(100) NOT NULL,
  condition_type     VARCHAR(50) NOT NULL,
  condition_config   JSONB DEFAULT '{}',
  severity           VARCHAR(20) DEFAULT 'warning',
  message_template   TEXT,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_activity_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64),
  alert_type       VARCHAR(50) NOT NULL DEFAULT 'system',
  severity         VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info','warning','critical')),
  message          TEXT NOT NULL,
  entity_type      VARCHAR(50),
  entity_id        VARCHAR(100),
  metadata         JSONB DEFAULT '{}',
  acknowledged_by  VARCHAR(100),
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-id backfill for all 9 tables: idempotent ADD COLUMN IF NOT EXISTS
-- (handles tenants that already had a pre-2026-04 variant without tenant_id
-- or with tenant_id UUID), followed by a scalar backfill and NOT NULL.
DO $$
DECLARE
  tbl TEXT;
  ai_dynamic_tables TEXT[] := ARRAY[
    'agrc_metrics_snapshots',
    'agent_priority_weights',
    'agent_feedback_log',
    'agent_monitoring_targets',
    'agrc_os_cycle_log',
    'autonomous_engine_log',
    'ai_impact_assessments',
    'ai_alert_rules',
    'ai_activity_alerts'
  ];
  resolved_tenant_id TEXT;
  remaining_nulls BIGINT;
BEGIN
  SELECT tenant_id INTO resolved_tenant_id
  FROM dos.tenants
  WHERE schema_name = current_schema()
  LIMIT 1;

  IF resolved_tenant_id IS NULL THEN
    RAISE NOTICE 'Dynamic AI backfill skip: no dos.tenants row for schema %', current_schema();
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY ai_dynamic_tables
  LOOP
    -- Handle pre-existing variants whose column type is UUID instead of
    -- VARCHAR(64). Skip retyping to avoid lossy casts; keep both possible
    -- shapes backfilled so the column is populated and non-null.
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64)',
      tbl
    );

    EXECUTE format(
      'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
      tbl,
      resolved_tenant_id
    );

    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL',
      tbl
    ) INTO remaining_nulls;

    IF remaining_nulls = 0 THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL',
        tbl
      );
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)',
      format('idx_%s_tenant_id', tbl),
      tbl
    );
  END LOOP;
END;
$$;
