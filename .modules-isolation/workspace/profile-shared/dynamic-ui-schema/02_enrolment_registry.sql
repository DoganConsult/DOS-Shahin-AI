-- Enrolment substrate. Lives alongside dos.profile_registry / dos.tenant_profile.
-- Mirrors live-tree contracts so seeds port back without rewrites.
BEGIN;
CREATE SCHEMA IF NOT EXISTS dos;

-- 1. Module registry (canonical list of modules per profile)
CREATE TABLE IF NOT EXISTS dos.module_registry (
  profile_code   TEXT NOT NULL REFERENCES dos.profile_registry(code) ON DELETE CASCADE,
  module_code    TEXT NOT NULL,
  tier           TEXT NOT NULL CHECK (tier IN ('dna','module','product')),
  product_key    TEXT NOT NULL,                          -- parent product (e.g. 'shahin-ai')
  card_position  INT  NOT NULL,
  entitlement_key TEXT NOT NULL,                         -- e.g. 'module.foundation'
  feature_flag   TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_code, module_code)
);

-- 2. Tenant-product activation (tenant has access to parent product)
CREATE TABLE IF NOT EXISTS dos.tenant_product_activation (
  tenant_id    UUID NOT NULL,
  product_key  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','retired')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, product_key)
);

-- 3. Tenant-module entitlements (per-module bundle: trial state, limits)
CREATE TABLE IF NOT EXISTS dos.tenant_module_entitlements (
  tenant_id     UUID NOT NULL,
  profile_code  TEXT NOT NULL,
  module_code   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','trial','suspended','expired','retired')),
  trial_ends_at TIMESTAMPTZ,
  limits        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, profile_code, module_code),
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.module_registry(profile_code, module_code) ON DELETE CASCADE
);

-- 4. Tier column on dos.ui_module (mirrors module_registry.tier so the
--    visibility filter pipeline can run without joining)
ALTER TABLE dos.ui_module
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'module'
    CHECK (tier IN ('dna','module','product'));

-- 5. Aliases that match live-tree names (so port-back is rename-free)
CREATE OR REPLACE VIEW dos.dynamic_ui_navigation AS SELECT * FROM dos.ui_navigation;
CREATE OR REPLACE VIEW dos.dynamic_ui_pages      AS SELECT * FROM dos.ui_view;

CREATE INDEX IF NOT EXISTS module_registry_tier_idx ON dos.module_registry (profile_code, tier);
CREATE INDEX IF NOT EXISTS tme_tenant_idx           ON dos.tenant_module_entitlements (tenant_id);
COMMIT;
