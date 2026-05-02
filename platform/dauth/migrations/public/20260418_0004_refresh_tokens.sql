-- 20260418_0004: Refresh token storage (Phase 4); additive if families table absent.
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tenant_id varchar(16),
  token_hash text NOT NULL,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_family
  ON public.refresh_tokens (user_id, family_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash_uk
  ON public.refresh_tokens (token_hash);
