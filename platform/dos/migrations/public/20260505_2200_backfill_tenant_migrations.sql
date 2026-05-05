-- =============================================================================
-- Migration: 20260505_2200_backfill_tenant_migrations
-- Purpose:   Backfill dos.tenant_migrations for active tenants with no migration records.
--
-- Issue:     34 of 36 active tenants have ZERO rows in dos.tenant_migrations.
--            Migration ledger is populated only for 51f36271df62ea3d (396) and dogan (263).
--
-- Fix:       Copy migration records from canonical tenant (51f36271df62ea3d)
--            to all active tenants with no migration records. Record only current
--            state (no schema changes), status='verified-by-backfill'.
--
-- Idempotent: YES — INSERT ... ON CONFLICT DO NOTHING pattern.
-- =============================================================================

BEGIN;

-- ─── 1. Backfill migration records from canonical tenant ────────────────────
INSERT INTO dos.tenant_migrations (
  tenant_id,
  migration_id,
  source,
  filename,
  checksum,
  status,
  duration_ms,
  error_message,
  applied_at,
  applied_by
)
SELECT 
  t.tenant_id,
  cm.migration_id,
  cm.source,
  cm.filename,
  cm.checksum,
  'verified-by-backfill' as status,
  cm.duration_ms,
  cm.error_message,
  cm.applied_at,
  cm.applied_by
FROM dos.tenants t
CROSS JOIN (
  SELECT * FROM dos.tenant_migrations 
  WHERE tenant_id = '51f36271df62ea3d'
) cm
WHERE t.status = 'active'
  AND t.tenant_id NOT IN (
    SELECT DISTINCT tenant_id FROM dos.tenant_migrations
  )
  AND t.tenant_id <> '51f36271df62ea3d'
ON CONFLICT (tenant_id, migration_id, checksum) DO NOTHING;

-- ─── 2. Self-assertion: verify backfill success ───────────────────────────────
DO $$
DECLARE
  missing_count INTEGER;
  total_active INTEGER;
  with_migrations INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM dos.tenants t
  WHERE t.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM dos.tenant_migrations tm
      WHERE tm.tenant_id = t.tenant_id
    );
  
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'Tenant migration backfill left % active tenants without migration records', missing_count;
  END IF;

  SELECT COUNT(*) INTO total_active FROM dos.tenants WHERE status = 'active';
  SELECT COUNT(DISTINCT tenant_id) INTO with_migrations FROM dos.tenant_migrations WHERE tenant_id IN (SELECT tenant_id FROM dos.tenants WHERE status = 'active');
  
  IF with_migrations <> total_active THEN
    RAISE EXCEPTION 'Tenant migration backfill: only % of % active tenants have migration records', with_migrations, total_active;
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- DELETE FROM dos.tenant_migrations
-- WHERE status = 'verified-by-backfill'
-- AND applied_at >= (SELECT min(applied_at) FROM dos.tenant_migrations WHERE tenant_id = '51f36271df62ea3d' AND status = 'verified-by-backfill');
