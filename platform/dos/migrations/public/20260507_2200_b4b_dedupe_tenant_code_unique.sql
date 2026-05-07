-- =====================================================================
-- v1.1 Operating Runtime Pack — B4b followup
-- Dedupe duplicate dos.tenants.tenant_code rows + promote to UNIQUE.
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- The B4 canonical-DDL migration could not promote tenant_code to a
-- unique key because the live test DB had 10 duplicate rows seeded from
-- email-derived test signups. The user has confirmed (server in
-- maintenance window, all tenants are test data) that the duplicates
-- can be deduplicated by suffixing later rows with -2, -3, -4 etc.
-- The earliest row per tenant_code (by created_at ASC) keeps the
-- canonical code; each subsequent row gets a numeric suffix.
--
-- Idempotent:    yes (no-op on second run; suffixed rows already have
--                unique codes; the unique index uses IF NOT EXISTS).
-- Destructive:   no schema drop; only column UPDATE on duplicates.
--                tenant_id (the canonical key with 7 FK dependants) is
--                NOT changed; only the secondary tenant_code column.
-- Tenant scope:  global (operates across all tenants).
-- Review:        already approved during maintenance window (see Phase
--                A B4 lockstep proof).
-- =====================================================================

BEGIN;

-- 1. Suffix duplicates: keep earliest row's tenant_code; later rows
--    receive '<code>-<N>' starting at -2.
WITH ranked AS (
  SELECT
    tenant_id,
    tenant_code,
    row_number() OVER (PARTITION BY tenant_code ORDER BY created_at ASC, tenant_id ASC) AS rn
  FROM dos.tenants
)
UPDATE dos.tenants t
   SET tenant_code = ranked.tenant_code || '-' || ranked.rn,
       updated_at  = now()
  FROM ranked
 WHERE t.tenant_id = ranked.tenant_id
   AND ranked.rn   > 1;

-- 2. Sanity assertion: no remaining duplicates.
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT tenant_code FROM dos.tenants GROUP BY tenant_code HAVING count(*) > 1
  ) x;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'B4b post-condition failed: % tenant_code duplicates remain', dup_count;
  END IF;
  RAISE NOTICE 'B4b OK: dos.tenants.tenant_code is now unique-ready.';
END $$;

-- 3. Drop the relaxed non-unique B-tree index (added in B4 fallback)
--    and create the canonical UNIQUE index.
DROP INDEX IF EXISTS dos.ix_dos_tenants_tenant_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dos_tenants_tenant_code
  ON dos.tenants (tenant_code);

COMMIT;
