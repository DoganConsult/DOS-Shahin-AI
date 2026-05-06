-- Foundation Universal Catalogs (Wave 2.1) — every tenant gets these without
-- configuration. These are platform-level reference catalogs that drive
-- dropdowns, validation, and default behaviour across all 21+ Foundation pages.
--
-- Naming convention: dos.foundation_cat_<topic> — singular noun, 'cat' marks
-- it as a catalog (read-only-from-app, write-only-via-platform-seed).

-- ─── 1. Reference data (catch-all key/value catalog) ────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_reference (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,                  -- 'country','currency','language','timezone','framework','sector','industry'
  code            TEXT NOT NULL,                  -- ISO code or slug
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  parent_code     TEXT,                           -- for nested (e.g. city → country)
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_foundation_cat_reference UNIQUE (category, code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_reference_cat ON dos.foundation_cat_reference (category) WHERE is_active = true;

-- ─── 2. Profile types (employee / contractor / vendor / etc.) ───────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_profile_types (
  profile_code    TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  default_perm_pack TEXT,                         -- references canonical perm pack
  has_lifecycle   BOOLEAN NOT NULL DEFAULT true,
  has_probation   BOOLEAN NOT NULL DEFAULT false,
  requires_nda    BOOLEAN NOT NULL DEFAULT false,
  requires_coi    BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 3. Ownership domains (what kinds of artifacts can have owners) ─────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_ownership_domains (
  domain_code     TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  source_module   TEXT NOT NULL,                  -- 'risk','compliance','foundation','policy', etc.
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 4. Lawful bases for data processing (PDPL Art. 5 + GDPR Art. 6) ────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_lawful_bases (
  basis_code      TEXT PRIMARY KEY,
  framework       TEXT NOT NULL CHECK (framework IN ('PDPL','GDPR','Both')),
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  description_ar  TEXT,
  requires_consent BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 5. Data classification levels ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_data_classifications (
  level_code      TEXT PRIMARY KEY,
  level_order     INT NOT NULL,                   -- 1 = lowest sensitivity
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  default_color   TEXT,
  encryption_required BOOLEAN NOT NULL DEFAULT false,
  audit_required  BOOLEAN NOT NULL DEFAULT false
);

-- ─── 6. Audit action taxonomy ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_audit_actions (
  action_code     TEXT PRIMARY KEY,
  category        TEXT NOT NULL CHECK (category IN ('crud','access','workflow','security','admin')),
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  default_severity TEXT NOT NULL CHECK (default_severity IN ('info','low','medium','high','critical')),
  evidence_required BOOLEAN NOT NULL DEFAULT false
);

-- ─── 7. COI disclosure categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_coi_categories (
  category_code   TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 8. Readiness dimensions (operations-readiness scorecard) ───────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_readiness_dimensions (
  dimension_code  TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  weight          NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  query_ref       TEXT,                           -- handler key for the dimension's score query
  threshold_warn  NUMERIC(5,2) NOT NULL DEFAULT 70.0,
  threshold_crit  NUMERIC(5,2) NOT NULL DEFAULT 50.0,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 9. Org type templates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_org_types (
  org_type_code   TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  levels          INT NOT NULL,
  sample_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicable_sectors TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 10. Location types ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_location_types (
  type_code       TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  applicable_sectors TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ─── 11. Calendar systems ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_calendar_systems (
  calendar_code   TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  is_default_in_regions TEXT[]
);

-- ─── 12. Tenant defaults per region+sector ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_cat_tenant_defaults (
  region_code     TEXT NOT NULL,
  sector_code     TEXT,                           -- NULL = applies to any sector
  default_locale  TEXT NOT NULL,
  timezone        TEXT NOT NULL,
  currency        TEXT NOT NULL,
  fiscal_year_end_month INT NOT NULL,
  calendar_systems TEXT[] NOT NULL,
  date_format     TEXT NOT NULL,
  regulators      TEXT[] NOT NULL,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT pk_foundation_cat_tenant_defaults PRIMARY KEY (region_code, sector_code)
);
ALTER TABLE dos.foundation_cat_tenant_defaults DROP CONSTRAINT IF EXISTS pk_foundation_cat_tenant_defaults;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_foundation_cat_tenant_defaults') THEN
    ALTER TABLE dos.foundation_cat_tenant_defaults ADD CONSTRAINT uq_foundation_cat_tenant_defaults UNIQUE NULLS NOT DISTINCT (region_code, sector_code);
  END IF;
END $$;
