-- Foundation functional-roles seed (P6.6).
--
-- Idempotent — mirrors the DML embedded in
--   migrations/20260424_0100_foundation_zero_blocker.sql
-- Applies AFTER foundation-permissions.sql so the permission_code
-- references resolve.

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

-- Rebind role_permissions join (idempotent).
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT fr.role_id, p.permission_id
  FROM dos.functional_roles fr
  JOIN LATERAL unnest(fr.permissions) AS pc(permission_code) ON TRUE
  JOIN dos.permissions p ON p.permission_code = pc.permission_code
 WHERE NOT EXISTS (
   SELECT 1 FROM platform_dauth.role_permissions rp
    WHERE rp.role_id = fr.role_id AND rp.permission_id = p.permission_id
 );
