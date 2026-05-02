-- Row-count proof for platform DB (onboarding slice + core tables).
-- Run after restore: psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -f ops/scripts/sql/row-count-proof.sql

SELECT 'users_total' AS check_name, COUNT(*)::bigint AS cnt FROM public.users
UNION ALL
SELECT 'tenants_total', COUNT(*)::bigint FROM public.tenants
UNION ALL
SELECT 'provisioning_jobs_total', COUNT(*)::bigint FROM public.provisioning_jobs
UNION ALL
SELECT 'email_verification_tokens_total', COUNT(*)::bigint FROM public.email_verification_tokens
UNION ALL
SELECT 'dos_platform_migrations_total', COUNT(*)::bigint FROM dos.platform_migrations;
