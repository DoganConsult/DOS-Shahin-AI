-- Foundation permissions catalogue seed (P6.6).
--
-- Idempotent — mirrors the DML embedded in
--   migrations/20260424_0100_foundation_zero_blocker.sql
-- so that the permission catalogue can be refreshed on an existing DB
-- without re-running the full zero-blocker migration.
--
-- Keep in lockstep with the zero_blocker migration until that DML is
-- permanently moved here.

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
