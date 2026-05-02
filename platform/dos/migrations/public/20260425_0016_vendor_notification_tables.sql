-- =====================================================================
-- Vendor engagement scores + notifications (20260425_0016)
--
-- Backs:
--   modules/vendor/source/backend/analytics/services/engagement/
--     engagement-score.service.ts       → dos.vendor_engagement_scores
--   modules/incident/source/backend/notification/services/
--     notification.service.ts           → dos.notifications
--
-- engagement-score.service.recordScore appends a point row; getScoreSummary
-- + getScoreHistory window over recorded_at DESC. notification.service
-- createNotification inserts a row; the read path filters unread per user.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.vendor_engagement_scores (
  point_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  vendor_id          VARCHAR(128) NOT NULL,
  score              DOUBLE PRECISION NOT NULL,
  source             TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_vendor_engagement_scores_vendor
  ON dos.vendor_engagement_scores(tenant_id, vendor_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS dos.notifications (
  notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  user_id            VARCHAR(64) NOT NULL,
  title              TEXT NOT NULL,
  body               TEXT,
  severity           TEXT NOT NULL DEFAULT 'info',
  module             TEXT,
  entity_type        TEXT,
  entity_id          VARCHAR(128),
  data               JSONB NOT NULL DEFAULT '{}'::jsonb,
  read               BOOLEAN NOT NULL DEFAULT FALSE,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_notifications_unread
  ON dos.notifications(tenant_id, user_id, created_at DESC)
  WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_dos_notifications_user_recent
  ON dos.notifications(tenant_id, user_id, created_at DESC);

DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc — see 20260425_0010 header.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'vendor_engagement_scores', 'notifications'
  ];
BEGIN
  FOREACH service_role IN ARRAY write_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.%I TO %I',
          tbl, service_role
        );
      END LOOP;
    END IF;
  END LOOP;
END $grants$;

COMMIT;
