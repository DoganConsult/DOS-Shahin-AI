-- dos:draft
-- =====================================================================
-- Foundation — Org chart hierarchy + 16 teams + roster (20260502_0134)
--
-- Mirrors OpenFGA model.v2.fga `org_unit` (parent self-ref) + `team`
-- (parent_org_unit / head / deputy / roster / can_manage_roster).
--
-- Tables:
--   dos.org_units               — hierarchical org structure (self-ref)
--   dos.org_teams               — 16 enterprise teams per tenant
--   dos.org_team_members        — roster (user → team) with role column
--
-- Reconciled into OpenFGA tuples by
-- platform/config-center/ops/scripts/dauth-openfga-reconcile.mjs:
--   user:<head_user_id>     head            team:<tenant>:<team_code>
--   user:<deputy_user_id>   deputy          team:<tenant>:<team_code>
--   user:<roster_user_id>   roster          team:<tenant>:<team_code>
--   org_unit:<parent_id>    parent          org_unit:<child_id>
--   org_unit:<ou_id>        parent_org_unit team:<tenant>:<team_code>
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── org_units (hierarchy) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.org_units (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  org_unit_code     VARCHAR(150) NOT NULL,
  parent_org_unit_id UUID REFERENCES dos.org_units(id) ON DELETE SET NULL,
  display_name_key  VARCHAR(255) NOT NULL,
  description_key   VARCHAR(255),
  unit_type         VARCHAR(64) NOT NULL DEFAULT 'department',
  head_user_id      VARCHAR(64),
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_units_tenant_code_uk UNIQUE (tenant_id, org_unit_code),
  CONSTRAINT org_units_no_self_parent CHECK (id <> parent_org_unit_id)
);
CREATE INDEX IF NOT EXISTS org_units_tenant_idx ON dos.org_units (tenant_id);
CREATE INDEX IF NOT EXISTS org_units_parent_idx ON dos.org_units (parent_org_unit_id);
CREATE INDEX IF NOT EXISTS org_units_head_idx   ON dos.org_units (head_user_id);

-- ── org_teams (16 enterprise teams per tenant) ─────────────────────
CREATE TABLE IF NOT EXISTS dos.org_teams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  team_code         VARCHAR(150) NOT NULL,
  parent_org_unit_id UUID REFERENCES dos.org_units(id) ON DELETE SET NULL,
  display_name_key  VARCHAR(255) NOT NULL,
  description_key   VARCHAR(255),
  charter_key       VARCHAR(255),
  head_user_id      VARCHAR(64),
  deputy_user_id    VARCHAR(64),
  capacity          INT,
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_teams_tenant_code_uk UNIQUE (tenant_id, team_code),
  CONSTRAINT org_teams_head_not_deputy CHECK (
    head_user_id IS NULL OR deputy_user_id IS NULL OR head_user_id <> deputy_user_id
  )
);
CREATE INDEX IF NOT EXISTS org_teams_tenant_idx       ON dos.org_teams (tenant_id);
CREATE INDEX IF NOT EXISTS org_teams_parent_ou_idx    ON dos.org_teams (parent_org_unit_id);
CREATE INDEX IF NOT EXISTS org_teams_head_idx         ON dos.org_teams (head_user_id);
CREATE INDEX IF NOT EXISTS org_teams_deputy_idx       ON dos.org_teams (deputy_user_id);

-- ── org_team_members (roster) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.org_team_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  team_id           UUID NOT NULL REFERENCES dos.org_teams(id) ON DELETE CASCADE,
  user_id           VARCHAR(64) NOT NULL,
  member_role       VARCHAR(32) NOT NULL DEFAULT 'member',
                    -- 'head' | 'deputy' | 'member' | 'observer' | 'rotating'
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at        TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_team_members_team_user_uk UNIQUE (team_id, user_id, member_role),
  CONSTRAINT org_team_members_role_chk CHECK (
    member_role IN ('head','deputy','member','observer','rotating')
  )
);
CREATE INDEX IF NOT EXISTS org_team_members_tenant_idx ON dos.org_team_members (tenant_id);
CREATE INDEX IF NOT EXISTS org_team_members_user_idx   ON dos.org_team_members (user_id);
CREATE INDEX IF NOT EXISTS org_team_members_team_idx   ON dos.org_team_members (team_id);
CREATE INDEX IF NOT EXISTS org_team_members_active_idx ON dos.org_team_members (team_id, is_active);

-- ── Catalogue: 16 enterprise team codes (tenant-agnostic seed view) ─
-- Each tenant gets one row per code at provisioning time. The canonical
-- list MUST stay in lockstep with @dos/authz-ids ORG_TEAM_CODES.
CREATE TABLE IF NOT EXISTS dos.org_team_catalogue (
  team_code         VARCHAR(150) PRIMARY KEY,
  display_name_key  VARCHAR(255) NOT NULL,
  parent_unit_code  VARCHAR(150),
  default_sort      INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO dos.org_team_catalogue (team_code, display_name_key, parent_unit_code, default_sort) VALUES
  ('executive',         'org.team.executive',         NULL,            10),
  ('finance',           'org.team.finance',           'finance',       20),
  ('legal',             'org.team.legal',             'legal',         30),
  ('people_ops',        'org.team.people_ops',        'people',        40),
  ('engineering',       'org.team.engineering',       'technology',    50),
  ('product',           'org.team.product',           'technology',    60),
  ('design',            'org.team.design',            'technology',    70),
  ('data_analytics',    'org.team.data_analytics',    'technology',    80),
  ('security',          'org.team.security',          'risk',          90),
  ('risk_management',   'org.team.risk_management',   'risk',         100),
  ('compliance',        'org.team.compliance',        'risk',         110),
  ('internal_audit',    'org.team.internal_audit',    'risk',         120),
  ('it_operations',     'org.team.it_operations',     'technology',   130),
  ('customer_success',  'org.team.customer_success',  'commercial',   140),
  ('sales',             'org.team.sales',             'commercial',   150),
  ('marketing',         'org.team.marketing',         'commercial',   160)
ON CONFLICT (team_code) DO UPDATE
  SET display_name_key = EXCLUDED.display_name_key,
      parent_unit_code = EXCLUDED.parent_unit_code,
      default_sort     = EXCLUDED.default_sort;

COMMIT;
