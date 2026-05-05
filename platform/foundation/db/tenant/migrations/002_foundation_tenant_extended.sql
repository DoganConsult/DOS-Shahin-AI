-- ══════════════════════════════════════════════════════════════════════
-- Foundation tenant tables — extended (Wave F0)
--
-- Adds the remaining tenant-owned tables declared in
-- platform/foundation/module.manifest.json#ownedTables that were not
-- created by 001_foundation_tenant_tables.sql, so that the F0
-- activation check (cell A6) can verify ≥19 owned tables exist in any
-- newly-provisioned tenant schema.
--
-- All tables here are skeleton CREATE-IF-NOT-EXISTS — full column
-- contracts live with their respective service migrations.
--
-- Idempotent. Re-runnable.
-- ══════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS "__TENANT_SCHEMA__";

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".committee_meetings (
  meeting_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id   UUID NOT NULL,
  title          TEXT NOT NULL,
  scheduled_at   TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'planned',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".team_raci_assignments (
  assignment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        UUID NOT NULL,
  user_id        TEXT NOT NULL,
  raci           TEXT NOT NULL CHECK (raci IN ('responsible','accountable','consulted','informed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".user_org_scope (
  scope_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  organization_id UUID,
  business_unit_id UUID,
  department_id  UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".tenant_memberships (
  membership_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".access_reviews (
  review_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  due_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".access_review_items (
  item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id      UUID NOT NULL,
  user_id        TEXT NOT NULL,
  role_code      TEXT,
  decision       TEXT,
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".delegations (
  delegation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id   TEXT NOT NULL,
  delegatee_id   TEXT NOT NULL,
  authority_kind TEXT,
  starts_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at        TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_authority_kinds (
  kind_code      TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_position_authority (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id    UUID NOT NULL,
  authority_kind TEXT NOT NULL,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_employee_lifecycle_state (
  user_id        TEXT PRIMARY KEY,
  state          TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_coi_declarations (
  declaration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  category       TEXT,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_policy_acknowledgments (
  ack_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  policy_code    TEXT NOT NULL,
  ack_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_sod_rules (
  rule_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code      TEXT NOT NULL UNIQUE,
  description    TEXT,
  conflict_set   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".foundation_sod_violations (
  violation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        UUID NOT NULL,
  user_id        TEXT NOT NULL,
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT NOT NULL DEFAULT 'open'
);
