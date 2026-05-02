-- 130_incidents_unique_for_fk.sql
--
-- Delta migration that unblocks
-- modules/incident/db/tenant/migrations/101_incidents_ops_additions.sql
-- (immutable). 101 declares foreign keys to incidents(incident_id) but
-- some legacy tenant schemas were provisioned with incidents.incident_id
-- lacking either a PRIMARY KEY or UNIQUE constraint, so:
--
--   ERROR: there is no unique constraint matching given keys for
--          referenced table "incidents"
--
-- This delta forces the required uniqueness on the reference column,
-- then re-creates the three child tables and FKs from 101 idempotently
-- so an unblocked tenant can move forward without editing 101.

-- 1. Ensure incidents.incident_id is uniquely identified.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'incidents'
  ) THEN
    RAISE NOTICE 'incidents table not present in %, skipping', current_schema();
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM   pg_index i
    JOIN   pg_class c ON c.oid = i.indrelid
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    JOIN   pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey)
    WHERE  n.nspname = current_schema()
      AND  c.relname  = 'incidents'
      AND  a.attname  = 'incident_id'
      AND  i.indisunique
  ) THEN
    BEGIN
      EXECUTE format('ALTER TABLE %I.incidents ADD CONSTRAINT incidents_incident_id_uk UNIQUE (incident_id)', current_schema());
      RAISE NOTICE 'Added UNIQUE constraint on %.incidents(incident_id)', current_schema();
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END
$$;

-- Same guard for vulnerabilities.vulnerability_id and findings.finding_id
-- (referenced by 101's vulnerability_findings_map).
DO $$
DECLARE
  pair RECORD;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('vulnerabilities','vulnerability_id'),
    ('findings','finding_id')
  ) AS v(t, c)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = pair.t
    ) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
      WHERE n.nspname = current_schema()
        AND c.relname = pair.t
        AND a.attname = pair.c
        AND i.indisunique
    ) THEN
      BEGIN
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I UNIQUE (%I)',
          current_schema(), pair.t, pair.t || '_' || pair.c || '_uk', pair.c);
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
      END;
    END IF;
  END LOOP;
END
$$;

-- 2. Re-run 101's table creation idempotently. (Same DDL; safe under IF NOT EXISTS.)
CREATE TABLE IF NOT EXISTS incident_updates (
  update_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id        UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  update_type        VARCHAR(50) NOT NULL,
  update_text        TEXT,
  updated_by         VARCHAR(64),
  status_change_from VARCHAR(30),
  status_change_to   VARCHAR(30),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_type     ON incident_updates(update_type)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_updates_by       ON incident_updates(updated_by)   WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_updates_created  ON incident_updates(created_at DESC);

CREATE TABLE IF NOT EXISTS incident_response_actions (
  action_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  action_type  VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  assigned_to  VARCHAR(64),
  due_date     DATE,
  status       VARCHAR(30) NOT NULL DEFAULT 'pending',
  priority     VARCHAR(20),
  outcome      TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incident_actions_incident  ON incident_response_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_actions_status    ON incident_response_actions(status)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_assigned  ON incident_response_actions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_due       ON incident_response_actions(due_date)    WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_actions_priority  ON incident_response_actions(priority)    WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name='vulnerabilities')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name='findings') THEN
    EXECUTE $ddl$
      CREATE TABLE IF NOT EXISTS vulnerability_findings_map (
        map_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(vulnerability_id) ON DELETE CASCADE,
        finding_id       UUID NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
        mapping_type     VARCHAR(30),
        notes            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_vuln_findings_vuln    ON vulnerability_findings_map(vulnerability_id);
      CREATE INDEX IF NOT EXISTS idx_vuln_findings_finding ON vulnerability_findings_map(finding_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_vuln_finding_pair
        ON vulnerability_findings_map(vulnerability_id, finding_id) WHERE deleted_at IS NULL;
    $ddl$;
  END IF;
END
$$;
