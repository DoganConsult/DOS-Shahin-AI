-- =====================================================================
-- Wave 20 — public.tenant_user_memberships ↔ dos.tenant_memberships bridge
--
-- Root cause:
--   tenant-service writes membership rows into dos.tenant_memberships at
--   self-registration time, but the dauth decision-engine reads its
--   "tenant_membership_valid" check from public.tenant_user_memberships.
--   The two tables are not synchronized, so every newly-registered user's
--   first authenticated call into a dauth-protected route (audit-trail,
--   delegations, profiles, sod, …) is denied with
--   DAUTH_DENY_TENANT_MEMBERSHIP_MISSING.
--
-- Doctrine fix at the DB layer (no frontend invention, no service patch):
--   1) backfill public.tenants from dos.tenants (FK target for memberships)
--   2) backfill public.tenant_user_memberships from dos.tenant_memberships
--   3) install AFTER INSERT/UPDATE triggers on dos.tenants and
--      dos.tenant_memberships so future writes propagate idempotently
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- 1. Backfill public.tenants from dos.tenants ----------------------------
INSERT INTO public.tenants
  (tenant_id, org_name, tenant_code, tenant_name_en, schema_name, status,
   industry, org_size, created_at, updated_at)
SELECT
  t.tenant_id::varchar,
  COALESCE(t.tenant_name, t.tenant_code, t.tenant_id::text),
  t.tenant_code,
  COALESCE(t.tenant_name, t.tenant_code, t.tenant_id::text),
  ('tenant_' || regexp_replace(t.tenant_id::text, '[^a-zA-Z0-9_]', '', 'g')),
  CASE
    WHEN t.status IN ('active','suspended','archived','onboarding','registered',
                      'pending_onboarding','provisioning','onboarding_ready',
                      'verified','email_pending','pending','deleted')
      THEN t.status::varchar
    ELSE 'active'::varchar
  END,
  'other'::varchar,
  '1-50'::varchar,
  COALESCE(t.created_at, NOW()),
  NOW()
  FROM dos.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.tenants p WHERE p.tenant_id = t.tenant_id::varchar
 )
 AND t.tenant_id::text ~ '^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$';

-- 2. Forward trigger on dos.tenants --------------------------------------
CREATE OR REPLACE FUNCTION dos.fn_forward_tenant_to_public()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id::text !~ '^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.tenants
    (tenant_id, org_name, tenant_code, tenant_name_en, schema_name, status,
     industry, org_size, created_at, updated_at)
  VALUES
    (NEW.tenant_id::varchar,
     COALESCE(NEW.tenant_name, NEW.tenant_code, NEW.tenant_id::text),
     NEW.tenant_code,
     COALESCE(NEW.tenant_name, NEW.tenant_code, NEW.tenant_id::text),
     ('tenant_' || regexp_replace(NEW.tenant_id::text, '[^a-zA-Z0-9_]', '', 'g')),
     CASE WHEN NEW.status IN ('active','suspended','archived','onboarding','registered',
                              'pending_onboarding','provisioning','onboarding_ready',
                              'verified','email_pending','pending','deleted')
       THEN NEW.status::varchar ELSE 'active'::varchar END,
     'other', '1-50',
     COALESCE(NEW.created_at, NOW()), NOW())
  ON CONFLICT (tenant_id) DO UPDATE
    SET status     = EXCLUDED.status,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forward_tenant_to_public ON dos.tenants;
CREATE TRIGGER trg_forward_tenant_to_public
  AFTER INSERT OR UPDATE ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.fn_forward_tenant_to_public();

-- 3. Ensure dos.users principals exist in public.users (FK target) -------
-- public.tenant_user_memberships has FK to public.users(user_id).
INSERT INTO public.users (user_id, email, display_name, status, created_at, updated_at)
SELECT u.user_id::varchar,
       u.email,
       COALESCE(u.display_name, u.full_name, u.email),
       COALESCE(u.status, 'active'),
       COALESCE(u.created_at, NOW()),
       NOW()
  FROM dos.users u
 WHERE u.email IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.users p WHERE p.user_id = u.user_id::varchar)
ON CONFLICT DO NOTHING;

-- 4. Backfill memberships -------------------------------------------------
INSERT INTO public.tenant_user_memberships
  (membership_id, tenant_id, user_id, membership_type, is_tenant_owner,
   status, joined_at, updated_at, authz_version, org_role_code)
SELECT
  gen_random_uuid(),
  m.tenant_id::varchar, m.user_id::varchar,
  COALESCE(m.membership_type, 'internal'),
  COALESCE(m.is_tenant_owner, false),
  CASE WHEN m.status IN ('active','inactive','pending','revoked')
    THEN m.status ELSE 'active' END,
  COALESCE(m.created_at, NOW()),
  NOW(), 1,
  m.role_code
  FROM dos.tenant_memberships m
 WHERE EXISTS (SELECT 1 FROM public.tenants    pt WHERE pt.tenant_id = m.tenant_id::varchar)
   AND EXISTS (SELECT 1 FROM public.users      pu WHERE pu.user_id   = m.user_id::varchar)
   AND NOT EXISTS (
     SELECT 1 FROM public.tenant_user_memberships p
      WHERE p.tenant_id = m.tenant_id::varchar
        AND p.user_id   = m.user_id::varchar
   );

-- 5. Forward trigger on dos.tenant_memberships ---------------------------
CREATE OR REPLACE FUNCTION dos.fn_forward_membership_to_public()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Ensure user row exists in public.users (FK target).
  INSERT INTO public.users (user_id, email, display_name, status, created_at, updated_at)
    SELECT u.user_id::varchar, u.email,
           COALESCE(u.display_name, u.full_name, u.email),
           COALESCE(u.status, 'active'),
           COALESCE(u.created_at, NOW()), NOW()
      FROM dos.users u
     WHERE u.user_id = NEW.user_id AND u.email IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tenant_user_memberships
    (membership_id, tenant_id, user_id, membership_type, is_tenant_owner,
     status, joined_at, updated_at, authz_version, org_role_code)
  VALUES
    (gen_random_uuid(), NEW.tenant_id::varchar, NEW.user_id::varchar,
     COALESCE(NEW.membership_type, 'internal'),
     COALESCE(NEW.is_tenant_owner, false),
     CASE WHEN NEW.status IN ('active','inactive','pending','revoked')
       THEN NEW.status ELSE 'active' END,
     COALESCE(NEW.created_at, NOW()), NOW(), 1, NEW.role_code)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET status     = EXCLUDED.status,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forward_membership_to_public ON dos.tenant_memberships;
CREATE TRIGGER trg_forward_membership_to_public
  AFTER INSERT OR UPDATE ON dos.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION dos.fn_forward_membership_to_public();

-- 6. Self-test ------------------------------------------------------------
DO $$
DECLARE missing_t INT; missing_m INT;
BEGIN
  SELECT count(*) INTO missing_t
    FROM dos.tenants t
   WHERE t.tenant_id::text ~ '^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$'
     AND NOT EXISTS (
       SELECT 1 FROM public.tenants p WHERE p.tenant_id = t.tenant_id::varchar);

  SELECT count(*) INTO missing_m
    FROM dos.tenant_memberships m
   WHERE EXISTS (SELECT 1 FROM public.tenants pt WHERE pt.tenant_id = m.tenant_id::varchar)
     AND EXISTS (SELECT 1 FROM public.users   pu WHERE pu.user_id   = m.user_id::varchar)
     AND NOT EXISTS (
       SELECT 1 FROM public.tenant_user_memberships p
        WHERE p.tenant_id = m.tenant_id::varchar
          AND p.user_id   = m.user_id::varchar);

  IF missing_t > 0 OR missing_m > 0 THEN
    RAISE EXCEPTION 'wave20: bridge incomplete — tenants=% memberships=%', missing_t, missing_m;
  END IF;
  RAISE NOTICE 'wave20 proof: dos.{tenants,tenant_memberships} bridged into public mirrors';
END$$;

COMMIT;
