-- =====================================================================
-- Access Review tables (20260425_0005)
--
-- services/user-service/src/domain/foundation/access-review.service.ts
-- queries dos.access_reviews and dos.access_review_items, neither of
-- which exists — /api/access-reviews/campaigns returns
-- 500 relation "dos.access_reviews" does not exist (42P01).
--
-- Columns chosen to match the service's INSERT / UPDATE / SELECT list.
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.access_reviews (
  review_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  campaign_name    TEXT NOT NULL,
  description      TEXT,
  scope            JSONB DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'draft',
  due_date         TIMESTAMPTZ,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_access_reviews_tenant
  ON dos.access_reviews(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.access_review_items (
  item_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        UUID NOT NULL REFERENCES dos.access_reviews(review_id) ON DELETE CASCADE,
  tenant_id        VARCHAR(64) NOT NULL,
  user_id          VARCHAR(64) NOT NULL,
  resource_type    TEXT NOT NULL,
  resource_id      VARCHAR(64) NOT NULL,
  entitlement      TEXT,
  decision         TEXT,
  decided_by       VARCHAR(64),
  decided_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_access_review_items_review
  ON dos.access_review_items(review_id, tenant_id);

COMMIT;
