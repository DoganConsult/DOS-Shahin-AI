-- Rollback for 20260425_0015_privacy_ops_tables.sql
BEGIN;
DROP TABLE IF EXISTS public.privacy_retention_policies CASCADE;
DROP TABLE IF EXISTS public.privacy_breaches CASCADE;
DROP TABLE IF EXISTS public.privacy_consent_log CASCADE;
DROP TABLE IF EXISTS public.privacy_dsr_requests CASCADE;
DROP TABLE IF EXISTS public.privacy_processing_activities CASCADE;
COMMIT;
