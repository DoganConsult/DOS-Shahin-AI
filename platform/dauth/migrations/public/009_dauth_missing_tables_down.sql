-- 009_dauth_missing_tables_down.sql
-- Rollback: drops the 10 tables created by 009_dauth_missing_tables.sql

BEGIN;

DROP TABLE IF EXISTS dos.user_competencies;
DROP TABLE IF EXISTS dos.user_availability;
DROP TABLE IF EXISTS dos.delegation_policies;
DROP TABLE IF EXISTS dos.delegation_chains;
DROP TABLE IF EXISTS dos.authority_scope_bindings;
DROP TABLE IF EXISTS dos.decision_authorities;
DROP TABLE IF EXISTS dos.authz_decision_log;
DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.invitations;
DROP TABLE IF EXISTS public.active_sessions;

COMMIT;
