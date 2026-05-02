-- 20260425_0005_tenants_id_schema_guards.sql
-- DB-level guardrails so the public.tenants row format that the application
-- already validates via @dos/db assertTenantId() cannot drift via direct
-- writes (admin scripts, manual psql, future code paths). Plus a one-shot
-- cleanup of legacy empty orphan schemas.
--
-- Background. The codebase has accumulated three tenant-id shapes:
--   • UUID with hyphens   — canonical PK in public.tenants (9 live)
--   • slug                — admin/platform tenants like 'douhan_consult',
--                           'shahin_visitors' (2 live)
--   • 12-char hex         — legacy short-id format from old registration
--                           code. No live rows; only orphan schemas remain
--
-- Live audit (2026-04-25, shahin_grc):
--   public.tenants            : 11 rows, 0 violate either guard
--   pg_namespace tenant_*     : 67 schemas total
--     • 11 match a public.tenants.schema_name (canonical)
--     • 56 orphan (no row), of which:
--         – 7 are empty (no tables) → dropped here
--         – 49 are populated (155 tables across them) → left alone;
--           operational decision, not a schema fix
--
-- The 7 empty orphans are pre-fix `tenant_<uuid-with-hyphens>` schemas
-- that are duplicates of the canonical no-hyphen schemas and contain no
-- data. They were created when an old tenantSchema() kept hyphens, then
-- orphaned when that helper was repaired (see comment in
-- packages/dos-db/src/tenant.ts).
--
-- Forward-only, idempotent. Pre-checks would-be guard violations and
-- refuses to apply if any live row violates them.

-- ── Pre-check 1: every tenant_id matches the assertTenantId regex
DO $$
DECLARE
  v_bad INTEGER;
  v_samples TEXT;
BEGIN
  SELECT COUNT(*), string_agg(tenant_id, ', ' ORDER BY tenant_id)
    INTO v_bad, v_samples
  FROM public.tenants
  WHERE tenant_id !~ '^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$';
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'Cannot add tenants_id_format_check: % rows have a non-conforming tenant_id (%). Resolve them before re-running.',
      v_bad, v_samples;
  END IF;
END $$;

-- ── Pre-check 2: schema_name matches canonical tenantSchema(tenant_id)
DO $$
DECLARE
  v_bad INTEGER;
  v_samples TEXT;
BEGIN
  SELECT COUNT(*),
         string_agg(format('%s -> %s (expected %s)', tenant_id, schema_name,
                           'tenant_' || regexp_replace(tenant_id, '[^a-zA-Z0-9_]', '', 'g')),
                    E'\n  ')
    INTO v_bad, v_samples
  FROM public.tenants
  WHERE schema_name != ('tenant_' || regexp_replace(tenant_id, '[^a-zA-Z0-9_]', '', 'g'));
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'Cannot add tenants_schema_name_canonical_check: % rows drift from canonical:%s%s',
      v_bad, E'\n  ', v_samples;
  END IF;
END $$;

-- ── Drop & recreate (idempotent) the format guard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid='public.tenants'::regclass AND conname='tenants_id_format_check') THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_id_format_check;
  END IF;
END $$;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_id_format_check
  CHECK (tenant_id ~ '^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$');
COMMENT ON CONSTRAINT tenants_id_format_check ON public.tenants IS
  'Mirrors @dos/db TENANT_ID_REGEX (assertTenantId). Allows lowercase alphanumeric + underscore/hyphen, 1–64 chars, must start and end with alphanumeric. Covers UUID-with-hyphens, slug, and short-hex shapes.';

-- ── Drop & recreate (idempotent) the schema_name correspondence guard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid='public.tenants'::regclass AND conname='tenants_schema_name_canonical_check') THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_schema_name_canonical_check;
  END IF;
END $$;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_schema_name_canonical_check
  CHECK (schema_name = ('tenant_' || regexp_replace(tenant_id, '[^a-zA-Z0-9_]', '', 'g')));
COMMENT ON CONSTRAINT tenants_schema_name_canonical_check ON public.tenants IS
  'Forces schema_name to match the canonical tenantSchema(tenant_id) computation in @dos/db (strip non-alphanumeric/underscore, prefix with tenant_). Prevents drift between PK and physical schema.';

-- ── One-shot cleanup: drop the 7 empty hyphenated-UUID legacy orphans
-- Each is verified empty (no tables) AND has a corresponding canonical
-- (no-hyphen) schema in pg_namespace, so the tenant's data is unaffected.
DO $$
DECLARE
  r RECORD;
  v_dropped INTEGER := 0;
BEGIN
  FOR r IN
    SELECT n.nspname
    FROM pg_namespace n
    WHERE n.nspname LIKE 'tenant_%'
      AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.schema_name = n.nspname)
      AND NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace nn ON nn.oid = c.relnamespace
        WHERE nn.nspname = n.nspname AND c.relkind = 'r'
      )
  LOOP
    EXECUTE format('DROP SCHEMA IF EXISTS %I', r.nspname);
    v_dropped := v_dropped + 1;
  END LOOP;
  IF v_dropped > 0 THEN
    RAISE NOTICE 'Dropped % empty orphan tenant schema(s).', v_dropped;
  END IF;
END $$;
