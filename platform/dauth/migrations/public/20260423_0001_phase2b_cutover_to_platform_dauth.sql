-- DAuth G8 Phase 2b — cutover DAuth-owned tables into the platform_dauth schema.
--
-- Ships the physical ALTER TABLE SET SCHEMA moves that Phase 1 (views)
-- and Phase 2a (TypeScript references) prepared for. After this runs:
--   - every DAuth-owned table lives in platform_dauth.*
--   - the 35 Phase-1 views become the underlying tables (the view names
--     are reused as table names where there was no collision)
--   - collision pairs (sessions, access_profiles, user_access_profiles)
--     are resolved: public.* wins the canonical name, dos.* is renamed
--     to <name>_legacy before move
--   - REVERSE compat views in dos.* / public.* keep the 7 external
--     consumers (tenant-service, user-service, onboarding-service,
--     modules/{compliance,evidence,onboarding}/...) working while they
--     migrate onto DAuthPort.
--
-- Rollback: 20260423_0001_phase2b_cutover_to_platform_dauth_down.sql
-- drops the reverse views, moves every table back to its original
-- schema, and restores the Phase-1 views.
--
-- Safety:
--   - Every DDL statement is wrapped in the outer transaction the
--     migration runner opens (no -- dos:no-transaction header).
--   - IF EXISTS / IF NOT EXISTS guards make the migration re-entrant
--     — a partial failure can be re-run without duplicate-object errors.
--   - The Phase-1 views MUST exist before this runs. migration
--     20260422_0005_create_platform_dauth_schema.sql is its hard
--     prerequisite (enforced by the migration runner's lexicographic
--     ordering — 20260422_0005 sorts before 20260423_0001).

-- ────────────────────────────────────────────────────────────────────
-- 1. Drop Phase-1 views. ALTER TABLE SET SCHEMA cannot reuse the name
--    if a view already occupies it.
-- ────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS platform_dauth.access_profiles;
DROP VIEW IF EXISTS platform_dauth.approval_matrix_rules_template;
DROP VIEW IF EXISTS platform_dauth.authority_scope_bindings;
DROP VIEW IF EXISTS platform_dauth.authz_decision_log;
DROP VIEW IF EXISTS platform_dauth.decision_authorities;
DROP VIEW IF EXISTS platform_dauth.delegation_chains;
DROP VIEW IF EXISTS platform_dauth.delegation_policies;
DROP VIEW IF EXISTS platform_dauth.delegations;
DROP VIEW IF EXISTS platform_dauth.functional_roles;
DROP VIEW IF EXISTS platform_dauth.lifecycle_auth_log_template;
DROP VIEW IF EXISTS platform_dauth.login_attempts;
DROP VIEW IF EXISTS platform_dauth.permissions;
DROP VIEW IF EXISTS platform_dauth.role_permissions;
DROP VIEW IF EXISTS platform_dauth.sessions_dos;
DROP VIEW IF EXISTS platform_dauth.sign_off_authorities_template;
DROP VIEW IF EXISTS platform_dauth.sod_conflict_audit_template;
DROP VIEW IF EXISTS platform_dauth.sod_rules;
DROP VIEW IF EXISTS platform_dauth.user_access_profiles_dos;
DROP VIEW IF EXISTS platform_dauth.user_availability;
DROP VIEW IF EXISTS platform_dauth.user_competencies;
DROP VIEW IF EXISTS platform_dauth.user_mfa;
DROP VIEW IF EXISTS platform_dauth.user_role_assignments;

DROP VIEW IF EXISTS platform_dauth.access_profiles_public;
DROP VIEW IF EXISTS platform_dauth.access_snapshots;
DROP VIEW IF EXISTS platform_dauth.active_sessions;
DROP VIEW IF EXISTS platform_dauth.actors;
DROP VIEW IF EXISTS platform_dauth.authorization_audit_log;
DROP VIEW IF EXISTS platform_dauth.invitations;
DROP VIEW IF EXISTS platform_dauth.jwt_signing_keys;
DROP VIEW IF EXISTS platform_dauth.refresh_token_families;
DROP VIEW IF EXISTS platform_dauth.scim_api_tokens;
DROP VIEW IF EXISTS platform_dauth.security_events;
DROP VIEW IF EXISTS platform_dauth.sessions;
DROP VIEW IF EXISTS platform_dauth.token_blacklist;
DROP VIEW IF EXISTS platform_dauth.user_access_profiles;

-- ────────────────────────────────────────────────────────────────────
-- 2. Resolve collisions BEFORE moving. Three tables exist in both
--    dos.* and public.*. The public.* copy is the DAuth canonical
--    (Phase-2a TS code targets `platform_dauth.sessions` =
--    originally public.sessions). Rename the dos.* variant to
--    <name>_legacy, then both are safe to move.
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='sessions') THEN
    EXECUTE 'ALTER TABLE dos.sessions RENAME TO sessions_legacy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='access_profiles') THEN
    EXECUTE 'ALTER TABLE dos.access_profiles RENAME TO access_profiles_legacy';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename='user_access_profiles') THEN
    EXECUTE 'ALTER TABLE dos.user_access_profiles RENAME TO user_access_profiles_legacy';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 3. Move every DAuth-owned dos.* table into platform_dauth.
--    Wrapped in per-statement EXISTS guards for re-entrancy.
-- ────────────────────────────────────────────────────────────────────
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
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='dos' AND tablename=tbl) THEN
      EXECUTE format('ALTER TABLE dos.%I SET SCHEMA platform_dauth', tbl);
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 4. Move every DAuth-owned public.* table into platform_dauth.
-- ────────────────────────────────────────────────────────────────────
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
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA platform_dauth', tbl);
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 5. REVERSE compat views — keep the 7 external consumers + 3 module
--    copies (enterprise-authz.service.ts × 3) working while they
--    migrate onto DAuthPort. Dropped as each consumer migrates off.
-- ────────────────────────────────────────────────────────────────────
-- dos.* reverse views (external consumers in services/tenant-service,
-- services/user-service, and modules/{compliance,evidence,onboarding}
-- still SELECT from dos.functional_roles / dos.permissions / dos.sod_rules
-- / dos.delegations / dos.access_profiles / dos.user_role_assignments).
CREATE OR REPLACE VIEW dos.functional_roles        AS SELECT * FROM platform_dauth.functional_roles;
CREATE OR REPLACE VIEW dos.permissions             AS SELECT * FROM platform_dauth.permissions;
CREATE OR REPLACE VIEW dos.sod_rules               AS SELECT * FROM platform_dauth.sod_rules;
CREATE OR REPLACE VIEW dos.delegations             AS SELECT * FROM platform_dauth.delegations;
CREATE OR REPLACE VIEW dos.access_profiles         AS SELECT * FROM platform_dauth.access_profiles_legacy;
CREATE OR REPLACE VIEW dos.user_access_profiles    AS SELECT * FROM platform_dauth.user_access_profiles_legacy;
CREATE OR REPLACE VIEW dos.sessions                AS SELECT * FROM platform_dauth.sessions_legacy;
CREATE OR REPLACE VIEW dos.user_role_assignments   AS SELECT * FROM platform_dauth.user_role_assignments;

-- public.* reverse views (onboarding-service still SELECTs from
-- public.sessions / public.refresh_token_families / public.invitations).
CREATE OR REPLACE VIEW public.sessions                AS SELECT * FROM platform_dauth.sessions;
CREATE OR REPLACE VIEW public.refresh_token_families  AS SELECT * FROM platform_dauth.refresh_token_families;
CREATE OR REPLACE VIEW public.invitations             AS SELECT * FROM platform_dauth.invitations;
CREATE OR REPLACE VIEW public.active_sessions         AS SELECT * FROM platform_dauth.active_sessions;
CREATE OR REPLACE VIEW public.security_events         AS SELECT * FROM platform_dauth.security_events;
CREATE OR REPLACE VIEW public.actors                  AS SELECT * FROM platform_dauth.actors;
CREATE OR REPLACE VIEW public.token_blacklist         AS SELECT * FROM platform_dauth.token_blacklist;
CREATE OR REPLACE VIEW public.access_profiles         AS SELECT * FROM platform_dauth.access_profiles;
CREATE OR REPLACE VIEW public.user_access_profiles    AS SELECT * FROM platform_dauth.user_access_profiles;
CREATE OR REPLACE VIEW public.jwt_signing_keys        AS SELECT * FROM platform_dauth.jwt_signing_keys;
CREATE OR REPLACE VIEW public.scim_api_tokens         AS SELECT * FROM platform_dauth.scim_api_tokens;
CREATE OR REPLACE VIEW public.access_snapshots        AS SELECT * FROM platform_dauth.access_snapshots;
CREATE OR REPLACE VIEW public.authorization_audit_log AS SELECT * FROM platform_dauth.authorization_audit_log;

COMMENT ON SCHEMA platform_dauth IS
  'DAuth platform module — dedicated schema. Phase 2b cutover complete: every DAuth-owned table lives here natively. dos.* / public.* reverse views preserve backward compatibility for external consumers during their own migration.';
