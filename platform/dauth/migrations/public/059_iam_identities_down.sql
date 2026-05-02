-- 059 down: drop iam_identities.
-- Safe: the table is new in this cycle; no downstream FK consumers yet.

DROP INDEX IF EXISTS public.idx_iam_identities_provider_realm;
DROP INDEX IF EXISTS public.idx_iam_identities_user;
DROP TABLE IF EXISTS public.iam_identities;
