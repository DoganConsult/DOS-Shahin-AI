-- 008_mfa_enforcement.sql
-- Adds mfa_enrollment_deadline to users table for universal MFA enforcement after first login.
-- All operations are idempotent (safe to re-run).

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- ADD mfa_enrollment_deadline to public.users
-- After a user's first successful login, this timestamp is set to
-- (first_login + grace_period). Once NOW() > mfa_enrollment_deadline
-- AND the user has no MFA enrolled, login is blocked with MFA_ENROLLMENT_REQUIRED.
-- NULL = no deadline set yet (user has not completed first login).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_enrollment_deadline TIMESTAMPTZ;

-- Index for efficient lookup during login enforcement
CREATE INDEX IF NOT EXISTS idx_users_mfa_deadline
  ON public.users (mfa_enrollment_deadline)
  WHERE mfa_enrollment_deadline IS NOT NULL;

COMMIT;
