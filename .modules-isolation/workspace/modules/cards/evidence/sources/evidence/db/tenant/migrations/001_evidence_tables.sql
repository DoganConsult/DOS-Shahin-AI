-- Module: evidence | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_type   TEXT NOT NULL CHECK (evidence_type IN ('document','screenshot','log','test_result','policy','report','other')),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','accepted','rejected','expired')),
  entity_type     TEXT,
  entity_id       UUID,
  file_url        TEXT,
  file_name       TEXT,
  file_size       BIGINT,
  mime_type       TEXT,
  hash_sha256     TEXT,
  collected_by    UUID NOT NULL,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_from      DATE,
  valid_to        DATE,
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_items
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS evidence_type TEXT CHECK (evidence_type IN ('document','screenshot','log','test_result','policy','report','other'));
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','accepted','rejected','expired'));
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS collected_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS valid_to DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  requested_by    UUID NOT NULL,
  assigned_to     UUID,
  title           TEXT NOT NULL,
  instructions    TEXT,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','overdue','cancelled')),
  fulfilled_at    TIMESTAMPTZ,
  evidence_id     UUID REFERENCES __TENANT_SCHEMA__.evidence_items(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_requests
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','overdue','cancelled'));
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS evidence_id UUID REFERENCES __TENANT_SCHEMA__.evidence_items(id);
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.evidence_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.evidence_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  evidence_id     UUID NOT NULL REFERENCES __TENANT_SCHEMA__.evidence_items(id) ON DELETE CASCADE,
  linked_entity_type TEXT NOT NULL,
  linked_entity_id   UUID NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'supports',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(evidence_id, linked_entity_type, linked_entity_id)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.evidence_links
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS evidence_id UUID REFERENCES __TENANT_SCHEMA__.evidence_items(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS linked_entity_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS linked_entity_id UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'supports';
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.evidence_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_evidence_items_tenant ON __TENANT_SCHEMA__.evidence_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_items_entity ON __TENANT_SCHEMA__.evidence_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_entity ON __TENANT_SCHEMA__.evidence_links(linked_entity_type, linked_entity_id);
