-- tenant_dogan SoD reconciliation.
-- Pre-existing tenant_dogan.sod_rules / .sod_waivers use a legacy shape that
-- differs from canonical 131/132. Rename legacy tables, apply canonical
-- shape, and port the 1 rule + 2 waivers forward preserving all data.
--
-- Run as migrator:
--   set -a; . ops/env/migrator.env; set +a
--   psql "$DATABASE_URL" -f migration/133_sod_tenant_dogan_reconcile.sql
--
-- Idempotent.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_tenant_uuid UUID := (substr(md5('DOGAN'),1,8)||'-'||substr(md5('DOGAN'),9,4)||'-'||substr(md5('DOGAN'),13,4)||'-'||substr(md5('DOGAN'),17,4)||'-'||substr(md5('DOGAN'),21,12))::uuid;
BEGIN
    -- only rename if legacy shape is present and canonical not yet applied
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tenant_dogan' AND table_name='sod_rules' AND column_name='policy_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tenant_dogan' AND table_name='sod_rules' AND column_name='conflict_a') THEN
        EXECUTE 'ALTER TABLE tenant_dogan.sod_rules RENAME TO sod_rules_legacy';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tenant_dogan' AND table_name='sod_waivers' AND column_name='waiver_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='tenant_dogan' AND table_name='sod_waivers' AND column_name='rule_id') THEN
        EXECUTE 'ALTER TABLE tenant_dogan.sod_waivers RENAME TO sod_waivers_legacy';
    END IF;

    CREATE TABLE IF NOT EXISTS tenant_dogan.sod_rules (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     UUID NOT NULL,
        rule_code     TEXT NOT NULL,
        rule_name     TEXT NOT NULL,
        description   TEXT,
        severity      TEXT NOT NULL DEFAULT 'high'
                      CHECK (severity IN ('low','medium','high','critical')),
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
        ON tenant_dogan.sod_rules(tenant_id, enabled);

    CREATE TABLE IF NOT EXISTS tenant_dogan.sod_waivers (
        id            BIGSERIAL PRIMARY KEY,
        tenant_id     UUID NOT NULL,
        rule_id       BIGINT NOT NULL REFERENCES tenant_dogan.sod_rules(id) ON DELETE CASCADE,
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
        ON tenant_dogan.sod_waivers(tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS sod_waivers_rule_idx
        ON tenant_dogan.sod_waivers(rule_id);

    -- Port legacy rules forward. Data preserved + metadata carries legacy ids.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='tenant_dogan' AND table_name='sod_rules_legacy') THEN
        INSERT INTO tenant_dogan.sod_rules
            (tenant_id, rule_code, rule_name, description, severity,
             conflict_a, conflict_b, scope, scope_value, action, enabled, metadata)
        SELECT
            v_tenant_uuid,
            l.rule_code,
            COALESCE(l.description, l.rule_code),
            l.description,
            CASE WHEN l.conflict_level IN ('block','escalate') THEN 'critical'
                 WHEN l.conflict_level = 'warn' THEN 'medium'
                 ELSE 'high' END,
            ARRAY[l.role_code_a]::text[],
            ARRAY[l.role_code_b]::text[],
            CASE WHEN l.module_code IS NOT NULL THEN 'module' ELSE 'tenant' END,
            l.module_code,
            CASE WHEN l.enforcement = 'block' THEN 'block'
                 WHEN l.enforcement = 'warn' THEN 'warn'
                 ELSE 'audit' END,
            l.is_active,
            jsonb_build_object(
                'legacy_policy_id', l.policy_id,
                'legacy_conflict_level', l.conflict_level,
                'legacy_enforcement', l.enforcement,
                'temporary_waiver_allowed', l.temporary_waiver_allowed,
                'waiver_max_days', l.waiver_max_days
            )
        FROM tenant_dogan.sod_rules_legacy l
        ON CONFLICT (tenant_id, rule_code) DO NOTHING;
    END IF;

    -- Port legacy waivers forward. user_id was TEXT in legacy; cast when UUID-shaped,
    -- otherwise record the raw value in metadata and use a stable sentinel UUID.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='tenant_dogan' AND table_name='sod_waivers_legacy') THEN
        INSERT INTO tenant_dogan.sod_waivers
            (tenant_id, rule_id, user_id, reason, granted_by, granted_at, expires_at, revoked_at, revoked_by, state, metadata)
        SELECT
            v_tenant_uuid,
            r.id,
            COALESCE(
                (CASE WHEN w.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN w.user_id::uuid END),
                '00000000-0000-0000-0000-000000000000'::uuid
            ),
            COALESCE(w.reason, 'legacy waiver import'),
            COALESCE(
                (CASE WHEN w.granted_by ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN w.granted_by::uuid END),
                '00000000-0000-0000-0000-000000000000'::uuid
            ),
            w.granted_at,
            w.expires_at,
            w.revoked_at,
            COALESCE(
                (CASE WHEN w.revoked_by ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN w.revoked_by::uuid END),
                NULL
            ),
            CASE WHEN w.revoked_at IS NOT NULL THEN 'revoked'
                 WHEN w.expires_at < now() THEN 'expired'
                 WHEN w.is_active THEN 'active'
                 ELSE 'revoked' END,
            jsonb_build_object(
                'legacy_waiver_id', w.waiver_id,
                'legacy_user_id_raw', w.user_id,
                'legacy_granted_by_raw', w.granted_by,
                'legacy_rule_code', w.rule_code,
                'legacy_revoke_reason', w.revoke_reason
            )
        FROM tenant_dogan.sod_waivers_legacy w
        JOIN tenant_dogan.sod_rules r
            ON r.tenant_id = v_tenant_uuid AND r.rule_code = w.rule_code;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_dogan.sod_rules TO dos_auth';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_dogan.sod_waivers TO dos_auth';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE tenant_dogan.sod_rules_id_seq TO dos_auth';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE tenant_dogan.sod_waivers_id_seq TO dos_auth';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_verifier') THEN
        EXECUTE 'GRANT SELECT ON tenant_dogan.sod_rules TO dos_verifier';
        EXECUTE 'GRANT SELECT ON tenant_dogan.sod_waivers TO dos_verifier';
    END IF;
END
$$;

COMMIT;
