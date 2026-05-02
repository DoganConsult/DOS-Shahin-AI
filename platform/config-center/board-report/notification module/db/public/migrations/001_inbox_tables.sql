-- notification-inbox-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.notification_inbox (
  inbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  category VARCHAR(50),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_inbox_user ON dos.notification_inbox (tenant_id, user_id, is_read);

COMMIT;
