-- 007_fix_schema_drift.sql
-- Fixes schema drift between auth-service and ops baseline definitions.
-- Safe to run on both drifted and correct schemas (all operations are idempotent).

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- FIX public.token_blacklist
-- Old schema had: token_hash (PK), expires_at, blacklisted_at
-- Correct schema: jti (PK), user_id, expires_at, is_active, created_at
-- ═══════════════════════════════════════════════════════════════

-- Rename PK column if old name exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'token_blacklist' AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE public.token_blacklist RENAME COLUMN token_hash TO jti;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE public.token_blacklist ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
ALTER TABLE public.token_blacklist ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.token_blacklist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Drop obsolete column
ALTER TABLE public.token_blacklist DROP COLUMN IF EXISTS blacklisted_at;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON public.token_blacklist (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON public.token_blacklist (expires_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_user ON public.token_blacklist (user_id, is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════
-- FIX public.sessions
-- Old schema had: refresh_token, last_active, is_active (missing jti, refresh_jti, revoked_at)
-- Correct schema: jti, refresh_jti, last_active_at, revoked_at
-- ═══════════════════════════════════════════════════════════════

-- Add missing columns
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS jti VARCHAR(128);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS refresh_jti VARCHAR(128);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Drop obsolete columns
ALTER TABLE public.sessions DROP COLUMN IF EXISTS refresh_token;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS is_active;

-- Rename last_active → last_active_at if old name exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE public.sessions RENAME COLUMN last_active TO last_active_at;
  END IF;
END $$;

-- Fix tenant_id to NOT NULL (backfill any NULLs first)
UPDATE public.sessions SET tenant_id = 'UNKNOWN' WHERE tenant_id IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.sessions ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Fix ip_address type: VARCHAR(45) → INET (if still varchar)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'ip_address' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.sessions ALTER COLUMN ip_address TYPE INET USING ip_address::INET;
  END IF;
EXCEPTION WHEN others THEN
  -- If cast fails (invalid IPs), leave as-is
  NULL;
END $$;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_tenant ON public.sessions (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jti ON public.sessions (jti);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_jti ON public.sessions (refresh_jti) WHERE refresh_jti IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions (user_id, revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions (expires_at);

-- ═══════════════════════════════════════════════════════════════
-- FIX dos.sessions (mirror table in dos schema)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'sessions' AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE dos.sessions RENAME COLUMN token_hash TO jti;
  END IF;
END $$;

ALTER TABLE dos.sessions ADD COLUMN IF NOT EXISTS refresh_jti VARCHAR(128);
ALTER TABLE dos.sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'sessions' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE dos.sessions RENAME COLUMN last_active TO last_active_at;
  END IF;
END $$;

COMMIT;
