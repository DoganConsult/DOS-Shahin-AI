BEGIN;
DROP INDEX IF EXISTS idx_rtf_expires;
DROP INDEX IF EXISTS idx_rtf_user_status;
DROP TABLE IF EXISTS public.refresh_token_families;

COMMIT;
