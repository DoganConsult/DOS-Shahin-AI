-- 059_iam_identities.sql
-- Canonical DAuth <-> external identity-provider mirror table.
-- Required by: services/auth-service/src/domain/identity/keycloak-login.service.ts
--              services/auth-service/src/domain/identity/keycloak-identity.adapter.ts
-- Used for: resolving Keycloak `sub` -> DAuth principal during login and
-- during DAUTH_KEYCLOAK_ENFORCE=true runtime authentication.
--
-- Run as migrator role (not dos_auth):
--   set -a; . ops/env/migrator.env; set +a
--   psql "$MIGRATOR_DATABASE_URL" -f migration/059_iam_identities.sql
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.iam_identities (
    id                BIGSERIAL PRIMARY KEY,
    user_id           UUID NOT NULL,
    provider          TEXT NOT NULL,              -- 'keycloak', 'okta', 'azure-ad', ...
    external_subject  TEXT NOT NULL,              -- IdP `sub`
    realm             TEXT,                       -- Keycloak realm (nullable for other IdPs)
    external_username TEXT,
    external_email    TEXT,
    attributes        JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','disabled','deleted')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT iam_identities_provider_subject_realm_uk
        UNIQUE (provider, external_subject, realm)
);

CREATE INDEX IF NOT EXISTS iam_identities_user_id_idx
    ON public.iam_identities(user_id);
CREATE INDEX IF NOT EXISTS iam_identities_provider_subject_idx
    ON public.iam_identities(provider, external_subject);
CREATE INDEX IF NOT EXISTS iam_identities_status_idx
    ON public.iam_identities(status)
    WHERE status <> 'active';

CREATE OR REPLACE FUNCTION public.iam_identities_touch() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS iam_identities_touch_trg ON public.iam_identities;
CREATE TRIGGER iam_identities_touch_trg
    BEFORE UPDATE ON public.iam_identities
    FOR EACH ROW EXECUTE FUNCTION public.iam_identities_touch();

-- Grant reads to runtime service roles; writes only via migrator/app-privileged layer.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.iam_identities TO dos_auth';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.iam_identities_id_seq TO dos_auth';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_verifier') THEN
        EXECUTE 'GRANT SELECT ON public.iam_identities TO dos_verifier';
    END IF;
END $$;

COMMIT;
