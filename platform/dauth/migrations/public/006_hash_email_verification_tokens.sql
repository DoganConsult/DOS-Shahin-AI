BEGIN;
-- Migration: Hash email verification tokens for consistent security.
-- Historically `public.email_verification_tokens.token` stored the raw
-- token; this migration renamed it to `token_hash` so the column name
-- matches the password_reset_tokens convention (SHA256 of the user-
-- delivered value, never the value itself). Later the base schema
-- (000_create_dos_schema.sql) was updated to create the column as
-- `token_hash` directly, so on fresh databases the RENAME is a no-op.
-- Guard both the RENAME and the legacy-index cleanup with existence
-- checks so this file re-applies idempotently.
--
-- Legacy-data safety: on an upgrade DB the RENAME alone would leave
-- plaintext tokens sitting inside a column now called `token_hash`,
-- which is misleading at best and a DB-dump replay risk at worst. The
-- post-rename DO block below tags every pre-migration row as expired
-- and consumed so verifyEmail's `expires_at > NOW() AND used_at IS
-- NULL` gate cannot honour any of them. Users with an in-flight
-- verification email get the standard "resend verification" UX; no
-- raw token is ever usable after this migration applies. Fresh DBs
-- have no rows to sweep so the block is a no-op there.
DO $$
DECLARE
  had_legacy_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'email_verification_tokens'
      AND column_name  = 'token'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'email_verification_tokens'
      AND column_name  = 'token_hash'
  ) INTO had_legacy_column;

  IF had_legacy_column THEN
    -- Rename raw-token column to token_hash to match the
    -- post-Phase-5 convention. Column data still carries plaintext
    -- until the invalidation sweep below runs.
    ALTER TABLE public.email_verification_tokens RENAME COLUMN token TO token_hash;

    -- Invalidate every row that was written under the legacy column
    -- convention. We can't safely rehash plaintext in-place because
    -- the MFA path shares this table and stores a different value
    -- domain (6-digit codes vs 64-hex tokens); rehashing would make
    -- both paths diverge from what the runtime re-computes. Setting
    -- expires_at to the epoch + marking used_at closes every code
    -- path in one shot.
    UPDATE public.email_verification_tokens
       SET expires_at = '1970-01-01 00:00:00+00'::timestamptz,
           used_at    = NOW()
     WHERE used_at IS NULL;
  END IF;
END
$$;

DROP INDEX IF EXISTS public.idx_evt_token;
CREATE INDEX IF NOT EXISTS idx_evt_token_hash
  ON public.email_verification_tokens (token_hash);

COMMIT;
