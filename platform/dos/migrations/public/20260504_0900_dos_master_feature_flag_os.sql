-- DOS Master Phase 2 — feature-flag-os controlled tables.
-- Doctrine: Articles 4 (admin trust zone), 11 (DOS Master is the only writer).

BEGIN;

CREATE TABLE IF NOT EXISTS dos.feature_flag_record (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_key      text NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('boolean','percentage','cohort','kill-switch')),
  trust_zone      text NOT NULL CHECK (trust_zone IN ('public','tenant','admin')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  retired_at      timestamptz,
  UNIQUE (record_key, version)
);
CREATE INDEX IF NOT EXISTS ix_feature_flag_record_status
  ON dos.feature_flag_record(record_key, status);

CREATE TABLE IF NOT EXISTS dos.feature_flag_event (
  id              bigserial PRIMARY KEY,
  record_id       uuid REFERENCES dos.feature_flag_record(id) ON DELETE CASCADE,
  record_key      text,
  kind            text NOT NULL,
  payload         jsonb,
  emitted_by      text NOT NULL,
  emitted_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_feature_flag_event_record
  ON dos.feature_flag_event(record_id, emitted_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['feature_flag_record','feature_flag_event'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_dos_master_only_%I ON dos.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_dos_master_only_%I
         BEFORE INSERT OR UPDATE OR DELETE ON dos.%I
         FOR EACH ROW EXECUTE FUNCTION trg_dos_master_only()',
      t, t);
  END LOOP;
END $$;

SET LOCAL dos.actor = 'dos-master';
INSERT INTO dos.feature_flag_record (record_key, version, title, kind, trust_zone, status, config, created_by, published_at)
VALUES ('core.workflow.composer', 1, 'Feature flag', 'boolean', 'admin', 'published',
        jsonb_build_object('seed', true), 'dos-master', now())
ON CONFLICT (record_key, version) DO NOTHING;

COMMIT;
