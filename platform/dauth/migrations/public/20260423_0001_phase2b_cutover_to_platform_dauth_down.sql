-- DAuth G8 Phase 2b — rollback.
--
-- Undoes the schema cutover: drops the reverse compat views, moves
-- every DAuth-owned table back to its original schema, restores the
-- sessions / access_profiles / user_access_profiles names on the
-- dos.* side, and recreates the Phase-1 view layer exactly as it
-- looked before 20260423_0001 ran.
--
-- Mirror of the up migration, executed in reverse order so that
-- every step's precondition (table in schema X, view not present,
-- etc.) is satisfied.

-- 1. Drop reverse compat views created in Phase 2b up.
DROP VIEW IF EXISTS dos.functional_roles;
DROP VIEW IF EXISTS dos.permissions;
DROP VIEW IF EXISTS dos.sod_rules;
DROP VIEW IF EXISTS dos.delegations;
DROP VIEW IF EXISTS dos.access_profiles;
DROP VIEW IF EXISTS dos.user_access_profiles;
DROP VIEW IF EXISTS dos.sessions;
DROP VIEW IF EXISTS dos.user_role_assignments;

DROP VIEW IF EXISTS public.sessions;
DROP VIEW IF EXISTS public.refresh_token_families;
DROP VIEW IF EXISTS public.invitations;
DROP VIEW IF EXISTS public.active_sessions;
DROP VIEW IF EXISTS public.security_events;
DROP VIEW IF EXISTS public.actors;
DROP VIEW IF EXISTS public.token_blacklist;
DROP VIEW IF EXISTS public.access_profiles;
DROP VIEW IF EXISTS public.user_access_profiles;
DROP VIEW IF EXISTS public.jwt_signing_keys;
DROP VIEW IF EXISTS public.scim_api_tokens;
DROP VIEW IF EXISTS public.access_snapshots;
DROP VIEW IF EXISTS public.authorization_audit_log;

-- 2. Move every public.* DAuth-owned table back from platform_dauth.
DO $$
DECLARE
  tbl TEXT;
  pub_tables TEXT[] := ARRAY[
    'access_profiles',
    'access_snapshots',
    'active_sessions',
    'actors',
    'authorization_audit_log',
    'invitations',
    'jwt_signing_keys',
    'refresh_token_families',
    'scim_api_tokens',
    'security_events',
    'sessions',
    'token_blacklist',
    'user_access_profiles'
  ];
BEGIN
  FOREACH tbl IN ARRAY pub_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='platform_dauth' AND tablename=tbl) THEN
      EXECUTE format('ALTER TABLE platform_dauth.%I SET SCHEMA public', tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Move every dos.* DAuth-owned table back from platform_dauth.
DO $$
DECLARE
  tbl TEXT;
  dos_tables TEXT[] := ARRAY[
    'approval_matrix_rules_template',
    'authority_scope_bindings',
    'authz_decision_log',
    'decision_authorities',
    'delegation_chains',
    'delegation_policies',
    'delegations',
    'functional_roles',
    'lifecycle_auth_log_template',
    'login_attempts',
    'permissions',
    'role_permissions',
    'sign_off_authorities_template',
    'sod_conflict_audit_template',
    'sod_rules',
    'user_availability',
    'user_competencies',
    'user_mfa',
    'user_role_assignments',
    'sessions_legacy',
    'access_profiles_legacy',
    'user_access_profiles_legacy'
  ];
BEGIN
  FOREACH tbl IN ARRAY dos_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='platform_dauth' AND tablename=tbl) THEN
      EXECUTE format('ALTER TABLE platform_dauth.%I SET SCHEMA dos', tbl);
    END IF;
  END LOOP;
END $$;

-- 4. Restore the original names on the dos.* side.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='sessions_legacy') THEN
    EXECUTE 'ALTER TABLE dos.sessions_legacy RENAME TO sessions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='access_profiles_legacy') THEN
    EXECUTE 'ALTER TABLE dos.access_profiles_legacy RENAME TO access_profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='user_access_profiles_legacy') THEN
    EXECUTE 'ALTER TABLE dos.user_access_profiles_legacy RENAME TO user_access_profiles';
  END IF;
END $$;

-- 5. Recreate the Phase-1 views exactly as 20260422_0005 created them.
CREATE OR REPLACE VIEW platform_dauth.access_profiles                AS SELECT * FROM dos.access_profiles;
CREATE OR REPLACE VIEW platform_dauth.approval_matrix_rules_template AS SELECT * FROM dos.approval_matrix_rules_template;
CREATE OR REPLACE VIEW platform_dauth.authority_scope_bindings       AS SELECT * FROM dos.authority_scope_bindings;
CREATE OR REPLACE VIEW platform_dauth.authz_decision_log             AS SELECT * FROM dos.authz_decision_log;
CREATE OR REPLACE VIEW platform_dauth.decision_authorities           AS SELECT * FROM dos.decision_authorities;
CREATE OR REPLACE VIEW platform_dauth.delegation_chains              AS SELECT * FROM dos.delegation_chains;
CREATE OR REPLACE VIEW platform_dauth.delegation_policies            AS SELECT * FROM dos.delegation_policies;
CREATE OR REPLACE VIEW platform_dauth.delegations                    AS SELECT * FROM dos.delegations;
CREATE OR REPLACE VIEW platform_dauth.functional_roles               AS SELECT * FROM dos.functional_roles;
CREATE OR REPLACE VIEW platform_dauth.lifecycle_auth_log_template    AS SELECT * FROM dos.lifecycle_auth_log_template;
CREATE OR REPLACE VIEW platform_dauth.login_attempts                 AS SELECT * FROM dos.login_attempts;
CREATE OR REPLACE VIEW platform_dauth.permissions                    AS SELECT * FROM dos.permissions;
CREATE OR REPLACE VIEW platform_dauth.role_permissions               AS SELECT * FROM dos.role_permissions;
CREATE OR REPLACE VIEW platform_dauth.sessions_dos                   AS SELECT * FROM dos.sessions;
CREATE OR REPLACE VIEW platform_dauth.sign_off_authorities_template  AS SELECT * FROM dos.sign_off_authorities_template;
CREATE OR REPLACE VIEW platform_dauth.sod_conflict_audit_template    AS SELECT * FROM dos.sod_conflict_audit_template;
CREATE OR REPLACE VIEW platform_dauth.sod_rules                      AS SELECT * FROM dos.sod_rules;
CREATE OR REPLACE VIEW platform_dauth.user_access_profiles_dos       AS SELECT * FROM dos.user_access_profiles;
CREATE OR REPLACE VIEW platform_dauth.user_availability              AS SELECT * FROM dos.user_availability;
CREATE OR REPLACE VIEW platform_dauth.user_competencies              AS SELECT * FROM dos.user_competencies;
CREATE OR REPLACE VIEW platform_dauth.user_mfa                       AS SELECT * FROM dos.user_mfa;
CREATE OR REPLACE VIEW platform_dauth.user_role_assignments          AS SELECT * FROM dos.user_role_assignments;

CREATE OR REPLACE VIEW platform_dauth.access_profiles_public         AS SELECT * FROM public.access_profiles;
CREATE OR REPLACE VIEW platform_dauth.access_snapshots               AS SELECT * FROM public.access_snapshots;
CREATE OR REPLACE VIEW platform_dauth.active_sessions                AS SELECT * FROM public.active_sessions;
CREATE OR REPLACE VIEW platform_dauth.actors                         AS SELECT * FROM public.actors;
CREATE OR REPLACE VIEW platform_dauth.authorization_audit_log        AS SELECT * FROM public.authorization_audit_log;
CREATE OR REPLACE VIEW platform_dauth.invitations                    AS SELECT * FROM public.invitations;
CREATE OR REPLACE VIEW platform_dauth.jwt_signing_keys               AS SELECT * FROM public.jwt_signing_keys;
CREATE OR REPLACE VIEW platform_dauth.refresh_token_families         AS SELECT * FROM public.refresh_token_families;
CREATE OR REPLACE VIEW platform_dauth.scim_api_tokens                AS SELECT * FROM public.scim_api_tokens;
CREATE OR REPLACE VIEW platform_dauth.security_events                AS SELECT * FROM public.security_events;
CREATE OR REPLACE VIEW platform_dauth.sessions                       AS SELECT * FROM public.sessions;
CREATE OR REPLACE VIEW platform_dauth.token_blacklist                AS SELECT * FROM public.token_blacklist;
CREATE OR REPLACE VIEW platform_dauth.user_access_profiles           AS SELECT * FROM public.user_access_profiles;
