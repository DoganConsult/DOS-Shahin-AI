-- 132_sod_waivers.sql
-- Per-tenant SoD waiver ledger. Applies to every tenant schema alongside sod_rules.
--
-- Run as migrator role AFTER 131_sod_rules.sql:
--   set -a; . ops/env/migrator.env; set +a
--   for s in $(psql "$MIGRATOR_DATABASE_URL" -tAc \
--        "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'"); do
--     psql "$MIGRATOR_DATABASE_URL" -c "SET LOCAL dauth.target_schema = '$s';" -f migration/132_sod_waivers.sql
--   done
--
-- Idempotent.

\set ON_ERROR_STOP on

BEGIN;

DO $outer$
DECLARE
    target_schema TEXT := current_setting('dauth.target_schema', true);
BEGIN
    IF target_schema IS NULL OR target_schema = '' THEN
        RAISE EXCEPTION 'dauth.target_schema GUC is required';
    END IF;

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.sod_waivers (
            id            BIGSERIAL PRIMARY KEY,
            tenant_id     UUID NOT NULL,
            rule_id       BIGINT NOT NULL REFERENCES %I.sod_rules(id) ON DELETE CASCADE,
            user_id       UUID NOT NULL,
            reason        TEXT NOT NULL,
            granted_by    UUID NOT NULL,
            granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at    TIMESTAMPTZ,
            revoked_at    TIMESTAMPTZ,
            revoked_by    UUID,
            state         TEXT NOT NULL DEFAULT 'active'
                          CHECK (state IN ('active','expired','revoked')),
            metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS sod_waivers_tenant_user_idx
            ON %I.sod_waivers(tenant_id, user_id);
        CREATE INDEX IF NOT EXISTS sod_waivers_rule_idx
            ON %I.sod_waivers(rule_id);
        CREATE INDEX IF NOT EXISTS sod_waivers_state_idx
            ON %I.sod_waivers(state) WHERE state='active';
    $f$, target_schema, target_schema, target_schema, target_schema, target_schema);

    EXECUTE format($f$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
                EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.sod_waivers TO dos_auth';
                EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE %I.sod_waivers_id_seq TO dos_auth';
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_verifier') THEN
                EXECUTE 'GRANT SELECT ON %I.sod_waivers TO dos_verifier';
            END IF;
        END
        $inner$;
    $f$, target_schema, target_schema, target_schema);
END
$outer$;

COMMIT;
