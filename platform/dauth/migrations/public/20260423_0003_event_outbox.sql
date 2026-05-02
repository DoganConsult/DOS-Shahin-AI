-- DOS registry outbox table for the Keycloak/OpenFGA registry-sync worker.
-- Producers insert rows; scripts/sync-registry-to-keycloak.mjs claims them with
-- FOR UPDATE SKIP LOCKED and applies the corresponding KC/FGA mutations.
CREATE SCHEMA IF NOT EXISTS platform_dos;

CREATE TABLE IF NOT EXISTS platform_dos.event_outbox (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ NULL,
  attempts      INT         NOT NULL DEFAULT 0,
  last_error    TEXT        NULL
);

CREATE INDEX IF NOT EXISTS ix_event_outbox_unprocessed
  ON platform_dos.event_outbox (id)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_event_outbox_type_time
  ON platform_dos.event_outbox (event_type, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON platform_dos.event_outbox TO dos_user;
GRANT USAGE, SELECT ON SEQUENCE platform_dos.event_outbox_id_seq TO dos_user;

COMMENT ON TABLE platform_dos.event_outbox IS
  'Registry-change outbox consumed by scripts/sync-registry-to-keycloak.mjs. Row is claimed via FOR UPDATE SKIP LOCKED and marked processed_at on success.';
