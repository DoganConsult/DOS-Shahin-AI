-- DSOC bootstrap migration — dedicated schema + native tables.
--
-- Unlike DAuth (which migrated existing tables into a new schema),
-- DSOC starts in `platform_dsoc.*` from day one. Three tables:
--
--   audit_log         — every DSOCAuditEvent the platform emits.
--   alerts            — high-severity events that triggered raiseAlert().
--   posture_snapshots — periodic per-tenant posture computations.
--
-- All tables are tenant-scoped; queries MUST filter by tenant_id.
-- The composite indexes below cover the hot read patterns:
--   - audit_log: (tenant_id, occurred_at DESC) for timeline view
--   - audit_log: (tenant_id, category, severity) for filtered roll-ups
--   - audit_log: (correlation_id) for cross-event tracing
--   - alerts:    (tenant_id, status, created_at DESC) for inbox
--   - posture:   (tenant_id, captured_at DESC) for "latest snapshot"
--
-- Rollback (down): drops the schema with CASCADE — all DSOC data lost.
-- Acceptable only at fresh-environment provisioning.

CREATE SCHEMA IF NOT EXISTS platform_dsoc;

-- ── audit_log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dsoc.audit_log (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT        NOT NULL,
  category        TEXT        NOT NULL CHECK (category IN (
                    'authn','authz','session','mfa','sod','delegation',
                    'config_change','data_access','threat','posture'
                  )),
  severity        TEXT        NOT NULL CHECK (severity IN (
                    'info','low','medium','high','critical'
                  )),
  actor_type      TEXT        NOT NULL CHECK (actor_type IN ('user','service','agent')),
  actor_id        TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  outcome         TEXT        NOT NULL CHECK (outcome IN ('success','failure','denied')),
  occurred_at     TIMESTAMPTZ NOT NULL,
  attributes      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  correlation_id  TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_time
  ON platform_dsoc.audit_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_cat_sev
  ON platform_dsoc.audit_log (tenant_id, category, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_correlation
  ON platform_dsoc.audit_log (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON platform_dsoc.audit_log (tenant_id, actor_type, actor_id, occurred_at DESC);

-- ── alerts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dsoc.alerts (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         TEXT        NOT NULL,
  audit_event_id    BIGINT      REFERENCES platform_dsoc.audit_log(id) ON DELETE SET NULL,
  category          TEXT        NOT NULL,
  severity          TEXT        NOT NULL CHECK (severity IN (
                      'info','low','medium','high','critical'
                    )),
  action            TEXT        NOT NULL,
  payload           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT        NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','acknowledged','resolved','suppressed')),
  acknowledged_by   TEXT,
  acknowledged_at   TIMESTAMPTZ,
  resolved_by       TEXT,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status_time
  ON platform_dsoc.alerts (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_severity
  ON platform_dsoc.alerts (tenant_id, severity, created_at DESC);

-- ── posture_snapshots ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dsoc.posture_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT        NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score           INTEGER     NOT NULL CHECK (score BETWEEN 0 AND 100),
  findings        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  computed_by     TEXT        NOT NULL DEFAULT 'dsoc-service'
);

CREATE INDEX IF NOT EXISTS idx_posture_tenant_time
  ON platform_dsoc.posture_snapshots (tenant_id, captured_at DESC);

COMMENT ON SCHEMA platform_dsoc IS
  'DSOC platform module — Security Operations Center. audit_log + alerts + posture_snapshots. Native dedicated schema (DSOC has no legacy tables to migrate).';
