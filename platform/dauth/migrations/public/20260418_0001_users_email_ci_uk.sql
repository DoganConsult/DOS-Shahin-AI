-- 20260418_0001: Unique index on normalized email (register duplicate semantics).
-- dos:no-transaction
-- Requires: public.users(email)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_trim_uk
  ON public.users (lower(btrim(email::text)));
