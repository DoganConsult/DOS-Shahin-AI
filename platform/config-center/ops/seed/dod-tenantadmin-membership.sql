-- =============================================================================
-- DOS Platform — DoD harness identity seed
-- =============================================================================
-- Binds the seeded Keycloak user `tenantadmin@shahin-ai.local`
-- (sub `7ed1f41f-a846-41c3-8f6d-b46435005dca2` in realm `dogan`) to the
-- existing tenant `782b08269e6cc5f9` (Visitor046 Dogan Consult workspace,
-- foundation product active) so the Phase-1 Gate R1 smoke harness can prove
-- positive 200 paths through:
--   /api/access/my-permissions   (tenant-service /permissions)
--   /api/tenants/home/overview   (tenant-service /tenant-home/overview)
--   /api/workspaces              (tenant-service /workspaces)
--   /api/foundation/*            (foundation-service)
--
-- Idempotent — safe to re-run. Owned by the platform.secrets layer; no
-- per-service configuration required.
-- =============================================================================

\set kc_sub        '7ed1f41f-a846-41c3-8f6d-b4643505dca2'
\set kc_email      'tenantadmin@shahin-ai.local'
\set kc_realm      'dogan'
\set tenant_id     '782b08269e6cc5f9'
\set role_code     'tenant_owner'

-- 1. dos.users — canonical platform user row keyed on the KC subject so
--    tenant-service joins resolve in one round-trip.
INSERT INTO dos.users
  (user_id, email, display_name, status, tenant_id, role,
   first_name, last_name, full_name, email_verified, member_onboarded,
   onboarding_complete)
VALUES
  (:'kc_sub', :'kc_email', 'Tenant Admin (DoD)', 'active', :'tenant_id', :'role_code',
   'Tenant', 'Admin', 'Tenant Admin (DoD)', true, true, true)
ON CONFLICT (user_id) DO UPDATE
  SET email        = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      status       = 'active',
      tenant_id    = EXCLUDED.tenant_id,
      role         = EXCLUDED.role,
      updated_at   = NOW();

-- 2. iam_identities — provider mapping so /permissions resolves the canonical
--    user_id from the KC subject in a single lookup.
INSERT INTO public.iam_identities
  (user_id, provider, external_subject, realm, external_email, status)
VALUES
  (:'kc_sub', 'keycloak', :'kc_sub', :'kc_realm', :'kc_email', 'active')
ON CONFLICT (provider, external_subject, realm) DO UPDATE
  SET user_id        = EXCLUDED.user_id,
      external_email = EXCLUDED.external_email,
      status         = 'active',
      updated_at     = NOW();

-- 3. dos.tenant_memberships — active tenant_owner membership so /permissions,
--    /workspaces, /tenant-home/overview all surface real data.
INSERT INTO dos.tenant_memberships
  (user_id, tenant_id, role_code, status, membership_type, is_tenant_owner)
VALUES
  (:'kc_sub', :'tenant_id', :'role_code', 'active', 'internal', true)
ON CONFLICT DO NOTHING;

-- 4. platform_dauth.user_role_assignments — surface the tenant_owner role to
--    the /permissions handler's role-resolution path so the assigned-roles
--    array is non-empty and downstream permission gates evaluate correctly.
--    assignment_id is a stable hash of (tenant, user, role) so the row is
--    idempotent across re-runs.
INSERT INTO platform_dauth.user_role_assignments
  (assignment_id, user_id, tenant_id, role_code, is_active, granted_at, granted_by)
VALUES
  (
    'dod-' || substring(md5(:'tenant_id' || ':' || :'kc_sub' || ':' || :'role_code') for 32),
    :'kc_sub', :'tenant_id', :'role_code', true, NOW(), 'system:dod-seed'
  )
ON CONFLICT (tenant_id, user_id, role_code) WHERE is_active = true DO NOTHING;
