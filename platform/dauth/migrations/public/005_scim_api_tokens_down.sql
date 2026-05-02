BEGIN;
DROP INDEX IF EXISTS idx_scim_token_tenant;
DROP TABLE IF EXISTS public.scim_api_tokens;

COMMIT;
