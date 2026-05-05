-- =============================================================================
-- Migration: 20260505_3000_platform_drift_log
-- Purpose:   Phase 6 runtime drift telemetry — durable hourly samples of
--            gap-relevant counts so the on-call can graph & alert on trend
--            (vs. just point-in-time CI gates).
--
-- Sampler:   scripts/ops/drift-telemetry-sample.mjs
--            (cron: hourly; PagerDuty when severity='critical' rows appear).
--
-- Schema is intentionally minimal — three columns plus the metric payload
-- bag — so the sampler can evolve without re-migrating.
-- Idempotent: YES.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.platform_drift_log (
  id            bigserial PRIMARY KEY,
  sampled_at    timestamptz NOT NULL DEFAULT now(),
  metric_key    text        NOT NULL,
  value_num     numeric,
  value_text    text,
  severity      text        NOT NULL DEFAULT 'info'
                CHECK (severity IN ('info','warn','critical')),
  details       jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_platform_drift_log_metric_time
  ON dos.platform_drift_log (metric_key, sampled_at DESC);

CREATE INDEX IF NOT EXISTS ix_platform_drift_log_severity_time
  ON dos.platform_drift_log (severity, sampled_at DESC)
  WHERE severity <> 'info';

COMMENT ON TABLE dos.platform_drift_log IS
'Phase 6 runtime drift telemetry. Hourly sampler appends one row per
metric_key. Severity raises to ''critical'' when a CI-guard equivalent
predicate trips at runtime — surfaced to PagerDuty via
scripts/ops/drift-telemetry-sample.mjs';

-- ─── Self-assertion ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='dos' AND table_name='platform_drift_log'
  ) THEN
    RAISE EXCEPTION 'platform_drift_log not installed';
  END IF;
END $$;

COMMIT;
