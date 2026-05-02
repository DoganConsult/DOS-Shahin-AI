-- Wave 1.5 closure — grant ai.* permissions to canonical roles.
--
-- Without these grants, /api/ai-engine/temporal/workflows/* succeeds only
-- under the platform-admin bypass, which masks real RBAC gaps. This
-- migration wires the four ai.* permissions seeded by 530 to the actual
-- tenant + platform roles that should hold them.
--
-- Idempotent: ON CONFLICT (role_id, permission_id) DO NOTHING.

-- ai.temporal.invoke — start agent workflows on the AI-OS task queue.
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT r.role_id, 'ai.temporal.invoke'
FROM (VALUES
  ('platform_super_admin'),
  ('role_platform_super_admin'),
  ('tenant_admin'),
  ('role_tenant_owner'),
  ('compliance_officer'),
  ('role_compliance_officer'),
  ('risk_manager'),
  ('role_risk_manager'),
  ('security_admin'),
  ('workflow_admin')
) AS r(role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_dauth.role_permissions rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = 'ai.temporal.invoke'
);

-- ai.kernel.admin — administer kill switches/snapshots (platform only).
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT r.role_id, 'ai.kernel.admin'
FROM (VALUES
  ('platform_super_admin'),
  ('role_platform_super_admin')
) AS r(role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_dauth.role_permissions rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = 'ai.kernel.admin'
);

-- ai.governance.review — review bias/impact reports.
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT r.role_id, 'ai.governance.review'
FROM (VALUES
  ('platform_super_admin'),
  ('role_platform_super_admin'),
  ('tenant_admin'),
  ('role_tenant_owner'),
  ('auditor'),
  ('role_auditor'),
  ('compliance_officer'),
  ('role_compliance_officer')
) AS r(role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_dauth.role_permissions rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = 'ai.governance.review'
);

-- ai.landing.invoke — public landing copilot (A13). Open to standard
-- tenant roles; the public-chat surface is rate-limited inside the engine.
INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
SELECT r.role_id, 'ai.landing.invoke'
FROM (VALUES
  ('platform_super_admin'),
  ('role_platform_super_admin'),
  ('tenant_admin'),
  ('role_tenant_owner'),
  ('standard_user'),
  ('viewer'),
  ('role_viewer')
) AS r(role_id)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_dauth.role_permissions rp
  WHERE rp.role_id = r.role_id AND rp.permission_id = 'ai.landing.invoke'
);
