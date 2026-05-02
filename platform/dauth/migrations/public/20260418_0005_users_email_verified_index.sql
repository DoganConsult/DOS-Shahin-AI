-- 20260418_0005: Query support for verified users (column from baseline schema).
CREATE INDEX IF NOT EXISTS idx_users_email_verified_at
  ON public.users (email_verified_at)
  WHERE email_verified_at IS NOT NULL;
