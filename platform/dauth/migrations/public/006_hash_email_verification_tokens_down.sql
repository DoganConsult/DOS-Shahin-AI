BEGIN;
-- Rollback: Restore plaintext token column name
ALTER TABLE public.email_verification_tokens RENAME COLUMN token_hash TO token;

DROP INDEX IF EXISTS idx_evt_token_hash;
CREATE INDEX IF NOT EXISTS idx_evt_token ON public.email_verification_tokens (token);

COMMIT;
