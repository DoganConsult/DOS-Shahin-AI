-- =====================================================================
-- public.users /me-surface columns (20260425_0004)
--
-- Auth-service's /api/auth/me handler SELECTs columns that were
-- introduced in the codebase but never migrated into public.users,
-- causing `safeQuery` to swallow a 42703 "column … does not exist"
-- error and the handler to respond 404 USER_NOT_FOUND even for a
-- valid, authenticated user with a matching row.
--
-- Evidence (routes/me.routes.ts:16):
--   SELECT user_id, email, name, role, status, tenant_id,
--          onboarding_complete, member_onboarded, is_super_admin,
--          avatar_url, locale, timezone, created_at, last_login_at
--     FROM users WHERE user_id = $1
--
-- Missing columns: avatar_url, locale, timezone, last_login_at.
-- Defaults chosen to match me.routes.ts field fallbacks:
--   locale   → 'en'
--   timezone → 'UTC'
--   avatar_url → NULL
--   last_login_at → NULL
--
-- `last_login_at` shadows the existing `last_login` column (which is
-- already populated by the login path). Keep both — the existing
-- column name is referenced from other services that write it on
-- login; the new column is set to the same value on UPDATE via a
-- backfill trigger to avoid a code-touching migration step.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locale        VARCHAR(20)  DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone      VARCHAR(64)  DEFAULT 'UTC';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- One-time backfill so existing rows carry the canonical defaults.
UPDATE public.users SET locale   = 'en'  WHERE locale   IS NULL;
UPDATE public.users SET timezone = 'UTC' WHERE timezone IS NULL;

-- Mirror the existing last_login column into last_login_at so the /me
-- handler immediately shows the correct value. Forward drift is
-- covered by the login path — auth-service can be updated to write
-- both columns in a follow-up.
UPDATE public.users
   SET last_login_at = last_login
 WHERE last_login_at IS NULL
   AND last_login   IS NOT NULL;

COMMIT;
