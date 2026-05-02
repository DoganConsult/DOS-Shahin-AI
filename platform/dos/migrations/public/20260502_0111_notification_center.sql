-- dos:draft
-- =====================================================================
-- UI-OS — §9 Notifications — center items, prefs, read state  (20260502_0111)
--
-- Tables (3) — DKNF via dos.ui_notification_severity_t /
--                            dos.ui_notification_channel_t /
--                            dos.ui_notification_digest_window_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_notification_center_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  recipient_user_id   VARCHAR(64) NOT NULL,
  category            VARCHAR(60) NOT NULL,
  severity            dos.ui_notification_severity_t NOT NULL DEFAULT 'info',
  title_key           VARCHAR(150),
  body_key            VARCHAR(200),
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_url            TEXT,
  source_event_id     VARCHAR(120),
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_notification_center_user_time
  ON dos.ui_notification_center_items (tenant_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_notification_center_category
  ON dos.ui_notification_center_items (tenant_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  channel         dos.ui_notification_channel_t NOT NULL,
  category        VARCHAR(60) NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  digest_window   dos.ui_notification_digest_window_t NOT NULL DEFAULT 'instant',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_notification_preferences_uk
    UNIQUE (tenant_id, user_id, channel, category)
);

CREATE INDEX IF NOT EXISTS ix_ui_notification_preferences_user
  ON dos.ui_notification_preferences (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_notification_read_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  notification_id  UUID NOT NULL,
  user_id          VARCHAR(64) NOT NULL,
  read_at          TIMESTAMPTZ,
  dismissed_at     TIMESTAMPTZ,
  CONSTRAINT ui_notification_read_state_notif_fk
    FOREIGN KEY (notification_id) REFERENCES dos.ui_notification_center_items(id) ON DELETE CASCADE,
  CONSTRAINT ui_notification_read_state_uk
    UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_notification_read_state_user
  ON dos.ui_notification_read_state (tenant_id, user_id);

COMMIT;
