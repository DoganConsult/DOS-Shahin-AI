-- 059: iam_identities — maps DAuth user_id to external identity provider subjects.
-- Primary use: bridge between public.users (DAuth mirror) and Keycloak users
-- when Keycloak is authoritative for identity/credentials.
-- Forward-only, additive; safe to re-run (IF NOT EXISTS).
-- Ledger: dos.platform_migrations (migration-runner).

CREATE TABLE IF NOT EXISTS public.iam_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Matches public.users.user_id (VARCHAR(64) from migration 000); runtime
  -- stores UUID strings in that column. A UUID-typed FK here fails with
  -- "foreign key constraint cannot be implemented" on any fresh DB.
  user_id VARCHAR(64) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('keycloak', 'native', 'sso-saml', 'sso-oidc')),
  external_subject TEXT NOT NULL,
  realm TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_subject, realm)
);

CREATE INDEX IF NOT EXISTS idx_iam_identities_user
  ON public.iam_identities (user_id);

CREATE INDEX IF NOT EXISTS idx_iam_identities_provider_realm
  ON public.iam_identities (provider, realm);

COMMENT ON TABLE public.iam_identities IS
  'Cross-reference between public.users.user_id and external identity provider subjects. One user may have multiple rows (e.g., migrated from native → keycloak). UNIQUE(provider, external_subject, realm) prevents duplicate mappings within a realm.';

COMMENT ON COLUMN public.iam_identities.external_subject IS
  'Provider-assigned opaque user identifier. For Keycloak this is the user UUID; for SAML the NameID; for OIDC the sub claim.';

COMMENT ON COLUMN public.iam_identities.realm IS
  'Provider realm / tenant. For Keycloak: KEYCLOAK_REALM at the time of mapping. NULL for providers without realms.';
