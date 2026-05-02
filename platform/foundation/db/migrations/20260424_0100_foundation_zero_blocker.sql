-- =====================================================================
-- Foundation Zero-Blocker Pass (20260424_0100)
--
-- Closes the gaps reported against Foundation layer:
--   • creates every `dos.*` table the Foundation services SELECT/INSERT
--     against (organizations, business_units, positions, locations,
--     location_bu_map, position_assignments, committees,
--     committee_members, ownership_mappings, invitations, audit_trail)
--   • seeds `dos.permissions` catalogue (no empty response for
--     /api/access/my-permissions)
--   • seeds `dos.functional_roles` and their permission bindings
--     (tenant_owner, platform_super_admin, org_admin, hr_admin,
--     risk_manager, compliance_officer, auditor, viewer)
--   • repairs `public.tenants.schema_name` drift so it always matches
--     the canonical `tenant_<uuid-hex>` convention used by
--     @dos/module-sdk → tenantSchema()
--
-- Idempotent. Safe to re-run. No `catch() => empty` fallbacks anywhere.
-- =====================================================================

BEGIN;

SET search_path = public;

-- ---------------------------------------------------------------------
-- 1. Foundation `dos.*` tables
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.organizations (
  organization_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  code             TEXT,
  parent_id        UUID,
  org_type         TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  description      TEXT,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_orgs_tenant ON dos.organizations(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.business_units (
  bu_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  code             TEXT,
  organization_id  UUID REFERENCES dos.organizations(organization_id) ON DELETE SET NULL,
  parent_bu_id     UUID,
  bu_type          TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  description      TEXT,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_bu_tenant ON dos.business_units(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.positions (
  position_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  title_en         TEXT NOT NULL,
  title_ar         TEXT,
  code             TEXT,
  bu_id            UUID REFERENCES dos.business_units(bu_id) ON DELETE SET NULL,
  grade            TEXT,
  level            INTEGER,
  reports_to       UUID,
  status           TEXT NOT NULL DEFAULT 'active',
  description      TEXT,
  created_by       VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_positions_tenant ON dos.positions(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.position_assignments (
  assignment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id      UUID NOT NULL REFERENCES dos.positions(position_id) ON DELETE CASCADE,
  user_id          VARCHAR(64) NOT NULL,
  tenant_id        VARCHAR(64) NOT NULL,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  is_primary       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_posassign_pos ON dos.position_assignments(position_id, tenant_id);

CREATE TABLE IF NOT EXISTS dos.locations (
  location_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  name_en            TEXT NOT NULL,
  name_ar            TEXT,
  code               TEXT,
  location_type      TEXT,
  country            TEXT,
  city               TEXT,
  address            TEXT,
  parent_location_id UUID,
  latitude           NUMERIC(10,7),
  longitude          NUMERIC(10,7),
  status             TEXT NOT NULL DEFAULT 'active',
  description        TEXT,
  created_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_locations_tenant ON dos.locations(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.location_bu_map (
  location_id      UUID NOT NULL REFERENCES dos.locations(location_id) ON DELETE CASCADE,
  bu_id            UUID NOT NULL REFERENCES dos.business_units(bu_id) ON DELETE CASCADE,
  tenant_id        VARCHAR(64) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (location_id, bu_id)
);

CREATE TABLE IF NOT EXISTS dos.committees (
  committee_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  code             TEXT,
  committee_type   TEXT,
  charter          TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_committees_tenant ON dos.committees(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.committee_members (
  member_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id     UUID NOT NULL REFERENCES dos.committees(committee_id) ON DELETE CASCADE,
  user_id          VARCHAR(64) NOT NULL,
  tenant_id        VARCHAR(64) NOT NULL,
  role_in_committee TEXT NOT NULL DEFAULT 'member',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dos_cm_tenant ON dos.committee_members(committee_id, tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.ownership_mappings (
  mapping_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        VARCHAR(64) NOT NULL,
  owner_user_id    VARCHAR(64) NOT NULL,
  ownership_type   TEXT NOT NULL DEFAULT 'primary',
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, entity_id, owner_user_id, ownership_type)
);

CREATE TABLE IF NOT EXISTS dos.invitations (
  invitation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  email            TEXT NOT NULL,
  display_name     TEXT,
  role             TEXT,
  department_id    VARCHAR(64),
  status           TEXT NOT NULL DEFAULT 'pending',
  batch_id         UUID,
  invited_by       VARCHAR(64),
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_dos_invitations_tenant ON dos.invitations(tenant_id);

CREATE TABLE IF NOT EXISTS dos.audit_trail (
  entry_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  actor_id         VARCHAR(64),
  action           TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        VARCHAR(64),
  module           TEXT,
  payload          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_audit_tenant ON dos.audit_trail(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dos_audit_module ON dos.audit_trail(tenant_id, module, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. Permissions catalogue (source of truth: dos.permissions)
--    platform_dauth.permissions is a VIEW over dos.permissions.
-- ---------------------------------------------------------------------
INSERT INTO dos.permissions (permission_id, permission_code, module_code, resource_type, action_type, description)
VALUES
  ('perm_platform_tenant_read',     'platform.tenant.read',      'platform',   'tenant',        'read',    'Read tenant config'),
  ('perm_platform_tenant_write',    'platform.tenant.write',     'platform',   'tenant',        'update',  'Write tenant config'),
  ('perm_platform_admin_read',      'platform.admin.read',       'platform',   'admin',         'read',    'Read platform admin'),
  ('perm_platform_admin_write',     'platform.admin.write',      'platform',   'admin',         'update',  'Write platform admin'),
  ('perm_workspace_read',           'workspace.read',            'workspace',  'workspace',     'read',    'Read workspace'),
  ('perm_workspace_write',          'workspace.write',           'workspace',  'workspace',     'update',  'Write workspace'),
  ('perm_navigation_read',          'navigation.read',           'workspace',  'navigation',    'read',    'Read navigation'),
  ('perm_foundation_read',          'foundation.read',           'foundation', 'foundation',    'read',    'Read foundation surface'),
  ('perm_foundation_write',         'foundation.write',          'foundation', 'foundation',    'update',  'Write foundation surface'),
  ('perm_user_read',                'user.read',                 'foundation', 'user',          'read',    'Read users'),
  ('perm_user_write',               'user.write',                'foundation', 'user',          'update',  'Write users'),
  ('perm_role_read',                'role.read',                 'foundation', 'role',          'read',    'Read roles'),
  ('perm_role_write',               'role.write',                'foundation', 'role',          'update',  'Write roles'),
  ('perm_team_read',                'team.read',                 'foundation', 'team',          'read',    'Read teams'),
  ('perm_team_write',               'team.write',                'foundation', 'team',          'update',  'Write teams'),
  ('perm_department_read',          'department.read',           'foundation', 'department',    'read',    'Read departments'),
  ('perm_department_write',         'department.write',          'foundation', 'department',    'update',  'Write departments'),
  ('perm_organization_read',        'organization.read',         'foundation', 'organization',  'read',    'Read organizations'),
  ('perm_organization_write',       'organization.write',        'foundation', 'organization',  'update',  'Write organizations'),
  ('perm_bu_read',                  'business_unit.read',        'foundation', 'business_unit', 'read',    'Read BUs'),
  ('perm_bu_write',                 'business_unit.write',       'foundation', 'business_unit', 'update',  'Write BUs'),
  ('perm_position_read',            'position.read',             'foundation', 'position',      'read',    'Read positions'),
  ('perm_position_write',           'position.write',            'foundation', 'position',      'update',  'Write positions'),
  ('perm_location_read',            'location.read',             'foundation', 'location',      'read',    'Read locations'),
  ('perm_location_write',           'location.write',            'foundation', 'location',      'update',  'Write locations'),
  ('perm_committee_read',           'committee.read',            'foundation', 'committee',     'read',    'Read committees'),
  ('perm_committee_write',          'committee.write',           'foundation', 'committee',     'update',  'Write committees'),
  ('perm_invitation_read',          'invitation.read',           'foundation', 'invitation',    'read',    'Read invitations'),
  ('perm_invitation_write',         'invitation.write',          'foundation', 'invitation',    'update',  'Write invitations'),
  ('perm_access_review_read',       'access_review.read',        'foundation', 'access_review', 'read',    'Read access reviews'),
  ('perm_access_review_write',      'access_review.write',       'foundation', 'access_review', 'update',  'Write access reviews'),
  ('perm_delegation_read',          'delegation.read',           'foundation', 'delegation',    'read',    'Read delegations'),
  ('perm_delegation_write',         'delegation.write',          'foundation', 'delegation',    'update',  'Write delegations'),
  ('perm_audit_trail_read',         'audit_trail.read',          'foundation', 'audit_trail',   'read',    'Read audit trail'),
  ('perm_compliance_program_read',  'compliance.program.read',   'compliance', 'program',       'read',    'Read compliance programs'),
  ('perm_compliance_control_read',  'compliance.control.read',   'compliance', 'control',       'read',    'Read controls'),
  ('perm_governance_record_read',   'governance.record.read',    'governance', 'record',        'read',    'Read governance'),
  ('perm_risk_record_read',         'risk.record.read',          'risk',       'record',        'read',    'Read risks'),
  ('perm_audit_record_read',        'audit.record.read',         'audit',      'record',        'read',    'Read audit records'),
  ('perm_evidence_item_read',       'evidence.item.read',        'evidence',   'item',          'read',    'Read evidence')
ON CONFLICT (permission_id) DO UPDATE
   SET permission_code = EXCLUDED.permission_code,
       module_code     = EXCLUDED.module_code,
       resource_type   = EXCLUDED.resource_type,
       action_type     = EXCLUDED.action_type,
       description     = EXCLUDED.description;

-- ---------------------------------------------------------------------
-- 3. Functional roles (source of truth: dos.functional_roles)
-- ---------------------------------------------------------------------
INSERT INTO dos.functional_roles (role_id, role_code, display_name, description, permissions)
VALUES
  ('role_platform_super_admin', 'platform_super_admin', 'Platform Super Admin', 'Global platform administrator',
     (SELECT array_agg(permission_code) FROM dos.permissions)),
  ('role_tenant_owner',         'tenant_owner',         'Tenant Owner',         'Tenant-scoped owner',
     (SELECT array_agg(permission_code) FROM dos.permissions)),
  ('role_org_admin',            'org_admin',            'Organization Admin',   'Org/BU/dept administrator',
     ARRAY['foundation.read','foundation.write','user.read','user.write','role.read','team.read','team.write',
           'department.read','department.write','organization.read','organization.write',
           'business_unit.read','business_unit.write','position.read','position.write',
           'location.read','location.write','committee.read','committee.write',
           'invitation.read','invitation.write','audit_trail.read','workspace.read','navigation.read']),
  ('role_hr_admin',             'hr_admin',             'HR Admin',             'HR user/role/invitation admin',
     ARRAY['foundation.read','user.read','user.write','role.read','team.read','team.write',
           'department.read','department.write','position.read','position.write',
           'invitation.read','invitation.write','workspace.read','navigation.read']),
  ('role_risk_manager',         'risk_manager',         'Risk Manager',         'Risk module operator',
     ARRAY['workspace.read','navigation.read','foundation.read','risk.record.read','audit_trail.read']),
  ('role_compliance_officer',   'compliance_officer',   'Compliance Officer',   'Compliance module operator',
     ARRAY['workspace.read','navigation.read','foundation.read','compliance.program.read','compliance.control.read','audit_trail.read']),
  ('role_auditor',              'auditor',              'Auditor',              'Read-only auditor',
     ARRAY['workspace.read','navigation.read','foundation.read','audit.record.read','evidence.item.read','audit_trail.read']),
  ('role_viewer',               'viewer',               'Viewer',               'Read-only viewer',
     ARRAY['workspace.read','navigation.read','foundation.read'])
ON CONFLICT (role_id) DO UPDATE
   SET role_code    = EXCLUDED.role_code,
       display_name = EXCLUDED.display_name,
       description  = EXCLUDED.description,
       permissions  = EXCLUDED.permissions;

-- ---------------------------------------------------------------------
-- 4. dos.role_permissions join (canonical permission binding)
--    Emits one row per (role_id, permission_id) pair.
--    dos.role_permissions is a thin view over platform_dauth.role_permissions
--    (same pattern as dos.permissions / dos.functional_roles).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW dos.role_permissions AS
  SELECT role_id, permission_id, created_at
    FROM platform_dauth.role_permissions;

INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT fr.role_id, p.permission_id
  FROM dos.functional_roles fr
  JOIN LATERAL unnest(fr.permissions) AS pc(permission_code) ON TRUE
  JOIN dos.permissions p ON p.permission_code = pc.permission_code
 WHERE NOT EXISTS (
   SELECT 1 FROM platform_dauth.role_permissions rp
    WHERE rp.role_id = fr.role_id AND rp.permission_id = p.permission_id
 );

-- ---------------------------------------------------------------------
-- 5. Tenant schema drift repair
--    public.tenants.schema_name MUST equal tenant_<uuid-hex> (the
--    @dos/module-sdk → tenantSchema() convention). Any drifted row is
--    corrected in place.
-- ---------------------------------------------------------------------
UPDATE public.tenants
   SET schema_name = 'tenant_' || regexp_replace(tenant_id::text, '[^a-zA-Z0-9_]', '', 'g')
 WHERE schema_name IS DISTINCT FROM
       'tenant_' || regexp_replace(tenant_id::text, '[^a-zA-Z0-9_]', '', 'g');

-- ---------------------------------------------------------------------
-- 6. Ensure every active tenant has an actual schema matching
--    schema_name. Missing schemas are created on the fly so route
--    handlers using tenantSchema() no longer 500 on "schema not found".
-- ---------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT schema_name FROM public.tenants WHERE schema_name IS NOT NULL LOOP
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', r.schema_name);
  END LOOP;
END$$;

COMMIT;
