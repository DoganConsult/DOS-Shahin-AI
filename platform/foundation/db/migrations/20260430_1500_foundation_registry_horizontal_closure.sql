-- ═══════════════════════════════════════════════════════════════════
-- Foundation Horizontal Closure — DOS registry + tenant activation
--
-- Seeds dos.product_registry, dos.module_registry, dos.tenant_product_activation
-- with the canonical Foundation rows so /api/access/my-permissions and
-- /api/entitlements return modules:['foundation'] for every entitled tenant
-- without relying on live DB state.
--
-- Also reconciles the live runtime contract drift between:
--   * canonical schema (code, product_code, name_en) defined in
--     platform/dauth/migrations/public/004_dos_dauth_platform_layer.sql
--   * runtime queries in services/tenant-service/src/server.ts that read
--     module_code / product_key / display_name on the same tables.
-- We keep BOTH column sets in sync via additive nullable columns + a
-- BEFORE INSERT/UPDATE trigger so writers from either side converge.
--
-- Idempotent. Repo-reproducible. Re-runs only update aliases + bump
-- updated_at; existing rows are not duplicated.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Reconcile dos.product_registry column shape ────────────────────
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS product_key   TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS display_name  TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS code          TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS name_en       TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS name_ar       TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS version       TEXT;
ALTER TABLE dos.product_registry ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
UPDATE dos.product_registry
   SET product_key  = COALESCE(product_key,  code),
       display_name = COALESCE(display_name, name_en),
       code         = COALESCE(code,         product_key),
       name_en      = COALESCE(name_en,      display_name)
 WHERE product_key IS NULL OR display_name IS NULL OR code IS NULL OR name_en IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_registry_product_key
  ON dos.product_registry(product_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_registry_code
  ON dos.product_registry(code);

CREATE OR REPLACE FUNCTION dos.product_registry_alias_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL AND NEW.product_key IS NOT NULL THEN NEW.code := NEW.product_key; END IF;
  IF NEW.product_key IS NULL AND NEW.code IS NOT NULL THEN NEW.product_key := NEW.code; END IF;
  IF NEW.display_name IS NULL AND NEW.name_en IS NOT NULL THEN NEW.display_name := NEW.name_en; END IF;
  IF NEW.name_en IS NULL AND NEW.display_name IS NOT NULL THEN NEW.name_en := NEW.display_name; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_product_registry_alias_sync ON dos.product_registry;
CREATE TRIGGER trg_product_registry_alias_sync
  BEFORE INSERT OR UPDATE ON dos.product_registry
  FOR EACH ROW EXECUTE FUNCTION dos.product_registry_alias_sync();

-- ── 2. Reconcile dos.module_registry column shape ─────────────────────
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS module_code   TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS product_key   TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS display_name  TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS code          TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS product_code  TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS name_en       TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS name_ar       TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS tier          TEXT;
ALTER TABLE dos.module_registry ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
UPDATE dos.module_registry
   SET module_code  = COALESCE(module_code,  code),
       product_key  = COALESCE(product_key,  product_code),
       display_name = COALESCE(display_name, name_en),
       code         = COALESCE(code,         module_code),
       product_code = COALESCE(product_code, product_key),
       name_en      = COALESCE(name_en,      display_name)
 WHERE module_code IS NULL OR product_key IS NULL OR display_name IS NULL OR code IS NULL OR product_code IS NULL OR name_en IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_registry_module_code
  ON dos.module_registry(module_code);
CREATE INDEX IF NOT EXISTS ix_module_registry_product_key
  ON dos.module_registry(product_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_registry_code
  ON dos.module_registry(code);

CREATE OR REPLACE FUNCTION dos.module_registry_alias_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL AND NEW.module_code IS NOT NULL THEN NEW.code := NEW.module_code; END IF;
  IF NEW.module_code IS NULL AND NEW.code IS NOT NULL THEN NEW.module_code := NEW.code; END IF;
  IF NEW.product_code IS NULL AND NEW.product_key IS NOT NULL THEN NEW.product_code := NEW.product_key; END IF;
  IF NEW.product_key IS NULL AND NEW.product_code IS NOT NULL THEN NEW.product_key := NEW.product_code; END IF;
  IF NEW.display_name IS NULL AND NEW.name_en IS NOT NULL THEN NEW.display_name := NEW.name_en; END IF;
  IF NEW.name_en IS NULL AND NEW.display_name IS NOT NULL THEN NEW.name_en := NEW.display_name; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_module_registry_alias_sync ON dos.module_registry;
CREATE TRIGGER trg_module_registry_alias_sync
  BEFORE INSERT OR UPDATE ON dos.module_registry
  FOR EACH ROW EXECUTE FUNCTION dos.module_registry_alias_sync();

-- ── 3. Reconcile dos.tenant_product_activation column shape ───────────
ALTER TABLE dos.tenant_product_activation
  ADD COLUMN IF NOT EXISTS product_key  TEXT;
ALTER TABLE dos.tenant_product_activation
  ADD COLUMN IF NOT EXISTS product_code TEXT;
UPDATE dos.tenant_product_activation
   SET product_key  = COALESCE(product_key,  product_code),
       product_code = COALESCE(product_code, product_key)
 WHERE product_key IS NULL OR product_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_product_activation_tpc
  ON dos.tenant_product_activation(tenant_id, product_code);

CREATE OR REPLACE FUNCTION dos.tpa_alias_sync()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.product_code IS NULL AND NEW.product_key IS NOT NULL THEN NEW.product_code := NEW.product_key; END IF;
  IF NEW.product_key IS NULL AND NEW.product_code IS NOT NULL THEN NEW.product_key := NEW.product_code; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tpa_alias_sync ON dos.tenant_product_activation;
CREATE TRIGGER trg_tpa_alias_sync
  BEFORE INSERT OR UPDATE ON dos.tenant_product_activation
  FOR EACH ROW EXECUTE FUNCTION dos.tpa_alias_sync();

-- ── 4. Seed canonical product registry rows (idempotent) ──────────────
INSERT INTO dos.product_registry (code, name_en, name_ar, description, version, status)
VALUES
  ('foundation', 'DOS Foundation',     'الأساس',                 'Foundation product (always-on platform layer; org/users/roles/audit).', '1.0.0', 'enabled'),
  ('agrc',       'Shahin AI GRC',      'شاهين للحوكمة والامتثال', 'Shahin AI Governance / Risk / Compliance product.',                      '1.0.0', 'enabled')
ON CONFLICT (code) DO UPDATE
  SET name_en      = EXCLUDED.name_en,
      name_ar      = EXCLUDED.name_ar,
      description  = EXCLUDED.description,
      version      = EXCLUDED.version,
      status       = 'enabled',
      updated_at   = NOW();

-- ── 5. Seed canonical module registry rows (idempotent) ───────────────
-- Foundation is the only module promoted to GREEN_WORKING in this batch.
-- Other modules are intentionally NOT seeded here; they enter the registry
-- when their own vertical-slice closure migration runs.
INSERT INTO dos.module_registry (code, product_code, name_en, name_ar, description, tier, status)
VALUES
  ('foundation', 'foundation', 'Foundation', 'الأساس',
   'Foundation module — organization, business units, departments, teams, users, roles, permissions, audit trail, SoD.',
   'standard', 'enabled')
ON CONFLICT (code) DO UPDATE
  SET product_code = EXCLUDED.product_code,
      name_en      = EXCLUDED.name_en,
      name_ar      = EXCLUDED.name_ar,
      description  = EXCLUDED.description,
      tier         = EXCLUDED.tier,
      status       = 'enabled',
      updated_at   = NOW();

-- ── 6. Seed tenant_product_activation for active/onboarding tenants ───
-- Only tenants whose tenant_id is a valid UUID are activated here; the
-- canonical schema declares tenant_id UUID NOT NULL. Non-UUID identifiers
-- (e.g. legacy 'platform_admin') are intentionally excluded.
DO $seed$
DECLARE
  has_public_tenants  BOOLEAN;
  has_dos_tenants     BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'tenants'
  ) INTO has_public_tenants;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'tenants'
  ) INTO has_dos_tenants;

  IF has_public_tenants THEN
    INSERT INTO dos.tenant_product_activation (tenant_id, product_code, status)
    SELECT (t.tenant_id::text)::uuid, 'foundation', 'active'
      FROM public.tenants t
     WHERE t.status IN (
             'registered','email_pending','verified','onboarding',
             'provisioning','onboarding_ready','active'
           )
       AND t.tenant_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ON CONFLICT (tenant_id, product_code) DO UPDATE
      SET status = 'active';
  END IF;

  IF has_dos_tenants THEN
    INSERT INTO dos.tenant_product_activation (tenant_id, product_code, status)
    SELECT (dt.tenant_id::text)::uuid, 'foundation', 'active'
      FROM dos.tenants dt
     WHERE dt.status = 'active'
       AND dt.tenant_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ON CONFLICT (tenant_id, product_code) DO UPDATE
      SET status = 'active';
  END IF;
END;
$seed$;

COMMIT;
