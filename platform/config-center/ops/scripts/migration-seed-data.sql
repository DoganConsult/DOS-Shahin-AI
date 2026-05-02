-- Baseline seed data for migration data-safety validation.
-- These rows must survive any new migration applied on top of the existing schema.
-- If a migration needs to restructure these tables, it MUST migrate the data — not drop it.
--
-- INTENDED TARGET: a disposable migration-validation database only. Never run
-- this seed against production. The companion probe
-- (ops/scripts/verify-migration-data-safety.mjs) enforces a non-production
-- guard before reading these rows.

-- Tenant seed
INSERT INTO public.tenants (tenant_id, org_name, industry, org_size, plan, status, tenant_code, tenant_name_en, schema_name)
VALUES ('SEED_T001', 'Migration Test Org', 'technology', '1-50', 'enterprise', 'active', 'seed-org', 'Migration Test Org', 'tenant_seed_t001')
ON CONFLICT (tenant_id) DO NOTHING;

-- User seed (depends on public.users existing).
-- Schema source-of-truth: ops/migrations/000_create_dos_schema.sql §USERS
-- (user_id PK, email NOT NULL, password_hash NOT NULL, name NOT NULL,
-- full_name NOT NULL, tenant_id FK, role default 'owner', status default
-- 'active'). Older drafts of this fixture used `id`/`display_name` columns
-- that never existed on public.users — those references were stale and have
-- been corrected to match the canonical baseline.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    INSERT INTO public.users (user_id, email, password_hash, name, full_name, tenant_id, role, status, created_at, updated_at)
    VALUES ('seed-user-001', 'seed@migration-test.dos', 'x-not-a-real-hash', 'Seed User', 'Seed User', 'SEED_T001', 'admin', 'active', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Config seed (depends on dos.config_definitions existing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dos' AND table_name = 'config_definitions') THEN
    INSERT INTO dos.config_definitions (config_key, default_value, description, scope)
    VALUES ('migration.seed.marker', 'true', 'Marker row for migration data-safety test', 'platform')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
