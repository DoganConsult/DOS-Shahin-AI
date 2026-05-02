-- Module: notification | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  recipient_id    UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms','slack','teams','webhook')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','dismissed')),
  entity_type     TEXT,
  entity_id       UUID,
  action_url      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.notifications
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms','slack','teams','webhook'));
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','dismissed'));
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channel         TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, notification_type, channel)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.notification_preferences
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.notification_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  channel         TEXT NOT NULL,
  subject         TEXT,
  body_template   TEXT NOT NULL,
  variables       JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code, channel)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.notification_templates
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS body_template TEXT;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.notification_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.inbox_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  recipient_id    UUID NOT NULL,
  notification_id UUID REFERENCES __TENANT_SCHEMA__.notifications(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.inbox_items
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES __TENANT_SCHEMA__.notifications(id) ON DELETE SET NULL;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent'));
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.inbox_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON __TENANT_SCHEMA__.notifications(tenant_id, recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_items_recipient ON __TENANT_SCHEMA__.inbox_items(tenant_id, recipient_id, is_read);
