-- 131_sod_rules.sql
-- Per-tenant Segregation-of-Duties rule catalog. Applies to every tenant schema.
--
-- Run as migrator role:
--   set -a; . ops/env/migrator.env; set +a
--   for s in $(psql "$MIGRATOR_DATABASE_URL" -tAc \
--        "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'"); do
--     TENANT_SCHEMA=$s envsubst < migration/131_sod_rules.sql | psql "$MIGRATOR_DATABASE_URL"
--   done
--
-- Idempotent. Pass the target schema via the psql variable :schema.

\set ON_ERROR_STOP on

BEGIN;

DO $outer$
DECLARE
    target_schema TEXT := current_setting('dauth.target_schema', true);
BEGIN
    IF target_schema IS NULL OR target_schema = '' THEN
        RAISE EXCEPTION 'dauth.target_schema GUC is required (e.g. SET LOCAL dauth.target_schema = ''tenant_abc'')';
    END IF;

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.sod_rules (
            id            BIGSERIAL PRIMARY KEY,
            tenant_id     UUID NOT NULL,
            rule_code     TEXT NOT NULL,
            rule_name     TEXT NOT NULL,
            description   TEXT,
            severity      TEXT NOT NULL DEFAULT 'high'
                          CHECK (severity IN ('low','medium','high','critical')),
            -- Two incompatible permission/role sets. Holding any from set A AND any from set B -> conflict.
            conflict_a    TEXT[] NOT NULL,
            conflict_b    TEXT[] NOT NULL,
            scope         TEXT NOT NULL DEFAULT 'tenant'
                          CHECK (scope IN ('tenant','workspace','module')),
            scope_value   TEXT,
            action        TEXT NOT NULL DEFAULT 'block'
                          CHECK (action IN ('block','warn','audit')),
            enabled       BOOLEAN NOT NULL DEFAULT true,
            metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT sod_rules_tenant_code_uk UNIQUE (tenant_id, rule_code)
        );
        CREATE INDEX IF NOT EXISTS sod_rules_tenant_enabled_idx
            ON %I.sod_rules(tenant_id, enabled);
    $f$, target_schema, target_schema);

    EXECUTE format($f$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
                EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.sod_rules TO dos_auth';
                EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE %I.sod_rules_id_seq TO dos_auth';
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_verifier') THEN
                EXECUTE 'GRANT SELECT ON %I.sod_rules TO dos_verifier';
            END IF;
        END
        $inner$;
    $f$, target_schema, target_schema, target_schema);
END
$outer$;

COMMIT;
