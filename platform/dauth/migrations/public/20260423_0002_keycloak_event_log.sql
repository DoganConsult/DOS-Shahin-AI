-- 20260423_0002_keycloak_event_log.sql
-- Receives Keycloak webhook events so SIEM dashboards see KC side-effects
-- next to DAuth native decisions. Populated by POST /api/keycloak/events.

CREATE SCHEMA IF NOT EXISTS platform_dauth;

CREATE TABLE IF NOT EXISTS platform_dauth.keycloak_event_log (
  id            BIGSERIAL PRIMARY KEY,
  realm_id      TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  user_id       TEXT        NULL,
  session_id    TEXT        NULL,
  client_id     TEXT        NULL,
  ip_address    INET        NULL,
  event_time    TIMESTAMPTZ NOT NULL,
  details       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  error         TEXT        NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Replay-safe uniqueness: same KC event delivered twice is absorbed.
CREATE UNIQUE INDEX IF NOT EXISTS ux_keycloak_event_log_dedup
  ON platform_dauth.keycloak_event_log (
    realm_id, event_type, event_time, coalesce(user_id, ''), coalesce(session_id, '')
  );

-- Range scans for dashboards.
CREATE INDEX IF NOT EXISTS ix_keycloak_event_log_time
  ON platform_dauth.keycloak_event_log (event_time DESC);

CREATE INDEX IF NOT EXISTS ix_keycloak_event_log_user
  ON platform_dauth.keycloak_event_log (user_id, event_time DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_keycloak_event_log_type
  ON platform_dauth.keycloak_event_log (event_type, event_time DESC);

COMMENT ON TABLE platform_dauth.keycloak_event_log IS
  'Keycloak event-listener webhook sink. Source-of-truth remains Keycloak; rows here are for cross-system audit, incident response, and analytics.';
