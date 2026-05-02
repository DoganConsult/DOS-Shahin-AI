-- Foundation Sector Pack tables (Wave 2.2). Per-sector template bundles that
-- the bootstrap orchestrator applies to a new tenant when sector is declared.

CREATE TABLE IF NOT EXISTS dos.foundation_cat_bu_templates (
  template_code   TEXT NOT NULL,
  sector_code     TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  bu_type         TEXT NOT NULL CHECK (bu_type IN ('line_of_business','support','control','shared_service','regulatory_reporting')),
  parent_template TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pk_foundation_cat_bu_templates PRIMARY KEY (template_code, sector_code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_bu_templates_sector ON dos.foundation_cat_bu_templates (sector_code) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS dos.foundation_cat_dept_templates (
  template_code   TEXT NOT NULL,
  sector_code     TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  dept_function   TEXT NOT NULL,                  -- 'finance','hr','it','legal','compliance','risk','audit','infosec','dpo','operations','marketing','procurement','bcm','clinical','underwriting','treasury', etc.
  bu_template     TEXT,                           -- which BU template this dept belongs under
  is_mandatory    BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pk_foundation_cat_dept_templates PRIMARY KEY (template_code, sector_code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_dept_templates_sector ON dos.foundation_cat_dept_templates (sector_code) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS dos.foundation_cat_position_templates (
  template_code   TEXT NOT NULL,
  sector_code     TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  title_ar        TEXT,
  grade_code      TEXT NOT NULL,                  -- 'IC1','IC2','IC3','IC4','IC5','M1','M2','M3','M4','D1','D2','D3','EVP','C-suite','Board'
  grade_order     INT NOT NULL,                   -- 1-15
  dept_function   TEXT,                           -- which department
  is_executive    BOOLEAN NOT NULL DEFAULT false,
  required_skills TEXT[],
  reports_to_grade TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pk_foundation_cat_position_templates PRIMARY KEY (template_code, sector_code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_position_templates_sector ON dos.foundation_cat_position_templates (sector_code) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS dos.foundation_cat_role_templates (
  role_code       TEXT NOT NULL,
  sector_code     TEXT,                           -- NULL = applies to all sectors
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  description_en  TEXT,
  permissions     TEXT[],                         -- Permission codes from canonical-permissions
  applies_to_profiles TEXT[],                     -- profile types this role can be assigned to
  is_platform_default BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pk_foundation_cat_role_templates PRIMARY KEY NULLS NOT DISTINCT (role_code, sector_code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_role_templates_sector ON dos.foundation_cat_role_templates (sector_code) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS dos.foundation_cat_committee_templates (
  template_code   TEXT NOT NULL,
  sector_code     TEXT,                           -- NULL = applies to all sectors
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  charter_en      TEXT,
  charter_ar      TEXT,
  member_roles    TEXT[],                         -- role_codes that should be members
  quorum_pct      NUMERIC(5,2) NOT NULL DEFAULT 50.0,
  meeting_cadence TEXT,                           -- 'weekly','bi-weekly','monthly','quarterly','annual','ad-hoc'
  term_months     INT,
  is_mandatory    BOOLEAN NOT NULL DEFAULT false,
  required_by_frameworks TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT pk_foundation_cat_committee_templates PRIMARY KEY NULLS NOT DISTINCT (template_code, sector_code)
);
CREATE INDEX IF NOT EXISTS ix_foundation_cat_committee_templates_sector ON dos.foundation_cat_committee_templates (sector_code) WHERE is_active = true;
