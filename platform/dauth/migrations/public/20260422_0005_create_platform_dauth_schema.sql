-- DAuth — create isolated `platform_dauth` schema + views layer.
--
-- Phase 1 of G8 (schema isolation). Non-destructive: existing tables
-- stay in their current locations (`dos.*` and `public.*`); new code
-- can address them through `platform_dauth.*` views. Phase 2 (future)
-- performs the actual ALTER TABLE SET SCHEMA cutover once every caller
-- has migrated off the legacy names.
--
-- Rollback: 20260422_0005_create_platform_dauth_schema_down.sql drops
-- the views + the schema. Views only — no data is moved by this
-- migration, so rollback is safe.

CREATE SCHEMA IF NOT EXISTS platform_dauth;

-- ── Views over tables owned by DAuth in the `dos` schema ────────────
CREATE OR REPLACE VIEW platform_dauth.access_profiles                   AS SELECT * FROM dos.access_profiles;
CREATE OR REPLACE VIEW platform_dauth.approval_matrix_rules_template    AS SELECT * FROM dos.approval_matrix_rules_template;
CREATE OR REPLACE VIEW platform_dauth.authority_scope_bindings          AS SELECT * FROM dos.authority_scope_bindings;
CREATE OR REPLACE VIEW platform_dauth.authz_decision_log                AS SELECT * FROM dos.authz_decision_log;
CREATE OR REPLACE VIEW platform_dauth.decision_authorities              AS SELECT * FROM dos.decision_authorities;
CREATE OR REPLACE VIEW platform_dauth.delegation_chains                 AS SELECT * FROM dos.delegation_chains;
CREATE OR REPLACE VIEW platform_dauth.delegation_policies               AS SELECT * FROM dos.delegation_policies;
CREATE OR REPLACE VIEW platform_dauth.delegations                       AS SELECT * FROM dos.delegations;
CREATE OR REPLACE VIEW platform_dauth.functional_roles                  AS SELECT * FROM dos.functional_roles;
CREATE OR REPLACE VIEW platform_dauth.lifecycle_auth_log_template       AS SELECT * FROM dos.lifecycle_auth_log_template;
CREATE OR REPLACE VIEW platform_dauth.login_attempts                    AS SELECT * FROM dos.login_attempts;
CREATE OR REPLACE VIEW platform_dauth.permissions                       AS SELECT * FROM dos.permissions;
CREATE OR REPLACE VIEW platform_dauth.role_permissions                  AS SELECT * FROM dos.role_permissions;
CREATE OR REPLACE VIEW platform_dauth.sessions_dos                      AS SELECT * FROM dos.sessions;
CREATE OR REPLACE VIEW platform_dauth.sign_off_authorities_template     AS SELECT * FROM dos.sign_off_authorities_template;
CREATE OR REPLACE VIEW platform_dauth.sod_conflict_audit_template       AS SELECT * FROM dos.sod_conflict_audit_template;
CREATE OR REPLACE VIEW platform_dauth.sod_rules                         AS SELECT * FROM dos.sod_rules;
CREATE OR REPLACE VIEW platform_dauth.user_access_profiles_dos          AS SELECT * FROM dos.user_access_profiles;
CREATE OR REPLACE VIEW platform_dauth.user_availability                 AS SELECT * FROM dos.user_availability;
CREATE OR REPLACE VIEW platform_dauth.user_competencies                 AS SELECT * FROM dos.user_competencies;
CREATE OR REPLACE VIEW platform_dauth.user_mfa                          AS SELECT * FROM dos.user_mfa;
CREATE OR REPLACE VIEW platform_dauth.user_role_assignments             AS SELECT * FROM dos.user_role_assignments;

-- ── Views over tables owned by DAuth in the `public` schema ─────────
-- Names that collide with `dos.*` above are suffixed `_public`.
CREATE OR REPLACE VIEW platform_dauth.access_profiles_public            AS SELECT * FROM public.access_profiles;
CREATE OR REPLACE VIEW platform_dauth.access_snapshots                  AS SELECT * FROM public.access_snapshots;
CREATE OR REPLACE VIEW platform_dauth.active_sessions                   AS SELECT * FROM public.active_sessions;
CREATE OR REPLACE VIEW platform_dauth.actors                            AS SELECT * FROM public.actors;
CREATE OR REPLACE VIEW platform_dauth.authorization_audit_log           AS SELECT * FROM public.authorization_audit_log;
CREATE OR REPLACE VIEW platform_dauth.invitations                       AS SELECT * FROM public.invitations;
CREATE OR REPLACE VIEW platform_dauth.jwt_signing_keys                  AS SELECT * FROM public.jwt_signing_keys;
CREATE OR REPLACE VIEW platform_dauth.refresh_token_families            AS SELECT * FROM public.refresh_token_families;
CREATE OR REPLACE VIEW platform_dauth.scim_api_tokens                   AS SELECT * FROM public.scim_api_tokens;
CREATE OR REPLACE VIEW platform_dauth.security_events                   AS SELECT * FROM public.security_events;
CREATE OR REPLACE VIEW platform_dauth.sessions                          AS SELECT * FROM public.sessions;
CREATE OR REPLACE VIEW platform_dauth.token_blacklist                   AS SELECT * FROM public.token_blacklist;
CREATE OR REPLACE VIEW platform_dauth.user_access_profiles              AS SELECT * FROM public.user_access_profiles;

COMMENT ON SCHEMA platform_dauth IS
  'DAuth platform module — dedicated schema. Phase 1 ships views over existing dos.* and public.* tables so new code can address the isolated namespace immediately. Phase 2 (future) cutover will ALTER TABLE SET SCHEMA and drop these views.';
