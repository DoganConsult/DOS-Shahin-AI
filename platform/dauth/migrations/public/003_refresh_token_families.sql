BEGIN;
-- Migration 003: Create refresh_token_families table for refresh token rotation.
-- Enables replay detection and secure refresh token lifecycle tracking.

CREATE TABLE IF NOT EXISTS public.refresh_token_families (
  family_id       VARCHAR(64)   PRIMARY KEY,
  user_id         VARCHAR(64)   NOT NULL,
  tenant_id       VARCHAR(16),
  current_jti     VARCHAR(128)  NOT NULL,
  rotation_count  INTEGER       DEFAULT 0,
  status          VARCHAR(20)   DEFAULT 'active',
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rtf_user_status
  ON public.refresh_token_families (user_id, status);

CREATE INDEX IF NOT EXISTS idx_rtf_expires
  ON public.refresh_token_families (expires_at)
  WHERE status = 'active';

COMMIT;
