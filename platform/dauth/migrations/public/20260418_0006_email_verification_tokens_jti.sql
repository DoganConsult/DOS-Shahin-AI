-- 20260418_0006: Pending verification token sweep (single-use semantics via used_at).
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_pending_expiry
  ON public.email_verification_tokens (expires_at, used_at)
  WHERE used_at IS NULL;
