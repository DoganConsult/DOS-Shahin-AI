-- 20260423_0020_dsoc_extensions.sql
-- Completes platform_dsoc with incidents, detection rules, anomalies, SoD violations,
-- threat indicators, investigation notes, posture findings.

CREATE TABLE IF NOT EXISTS platform_dsoc.incidents (
  incident_id     TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','investigating','contained','resolved','closed')),
  category        TEXT NOT NULL,
  assigned_to     TEXT,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status
  ON platform_dsoc.incidents (tenant_id, status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity
  ON platform_dsoc.incidents (tenant_id, severity, opened_at DESC);

CREATE TABLE IF NOT EXISTS platform_dsoc.detection_rules (
  rule_id         TEXT PRIMARY KEY,
  tenant_id       TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  rule_type       TEXT NOT NULL CHECK (rule_type IN ('threshold','pattern','ml','correlation','sigma')),
  expression      JSONB NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('info','low','medium','high','critical')),
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_detection_rules_enabled
  ON platform_dsoc.detection_rules (enabled, tenant_id);

CREATE TABLE IF NOT EXISTS platform_dsoc.anomaly_signals (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  source          TEXT NOT NULL,
  signal_type     TEXT NOT NULL,
  score           DOUBLE PRECISION NOT NULL CHECK (score BETWEEN 0 AND 1),
  baseline        DOUBLE PRECISION,
  observed        DOUBLE PRECISION,
  subject_type    TEXT,
  subject_id      TEXT,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_anomaly_tenant_time
  ON platform_dsoc.anomaly_signals (tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_score
  ON platform_dsoc.anomaly_signals (tenant_id, score DESC) WHERE score >= 0.7;

CREATE TABLE IF NOT EXISTS platform_dsoc.sod_violations (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  rule_code       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  conflicting_permissions TEXT[] NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'warning'
                    CHECK (severity IN ('info','warning','violation','critical')),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  waiver_id       TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_sod_violations_tenant
  ON platform_dsoc.sod_violations (tenant_id, resolved_at, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sod_violations_user
  ON platform_dsoc.sod_violations (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS platform_dsoc.threat_indicators (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT,
  ioc_type        TEXT NOT NULL CHECK (ioc_type IN ('ip','domain','hash','url','email','user_agent')),
  ioc_value       TEXT NOT NULL,
  source          TEXT NOT NULL,
  confidence      INTEGER NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  severity        TEXT NOT NULL DEFAULT 'medium',
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  UNIQUE (ioc_type, ioc_value, source)
);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_lookup
  ON platform_dsoc.threat_indicators (ioc_type, ioc_value);

CREATE TABLE IF NOT EXISTS platform_dsoc.investigation_notes (
  id              BIGSERIAL PRIMARY KEY,
  incident_id     TEXT REFERENCES platform_dsoc.incidents(incident_id) ON DELETE CASCADE,
  alert_id        BIGINT REFERENCES platform_dsoc.alerts(id) ON DELETE CASCADE,
  author_id       TEXT NOT NULL,
  note            TEXT NOT NULL,
  note_type       TEXT NOT NULL DEFAULT 'comment'
                    CHECK (note_type IN ('comment','evidence','finding','action_taken','conclusion')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (incident_id IS NOT NULL OR alert_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_notes_incident
  ON platform_dsoc.investigation_notes (incident_id, created_at DESC) WHERE incident_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_dsoc.posture_findings (
  id              BIGSERIAL PRIMARY KEY,
  snapshot_id     BIGINT NOT NULL REFERENCES platform_dsoc.posture_snapshots(id) ON DELETE CASCADE,
  finding_code    TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  title           TEXT NOT NULL,
  description     TEXT,
  remediation     TEXT,
  score_impact    INTEGER NOT NULL DEFAULT 0,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_posture_findings_snapshot
  ON platform_dsoc.posture_findings (snapshot_id, severity);
