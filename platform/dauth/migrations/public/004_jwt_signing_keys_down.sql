BEGIN;
DROP INDEX IF EXISTS idx_jsk_status;
DROP TABLE IF EXISTS public.jwt_signing_keys;

COMMIT;
