-- =====================================================================
-- Wave 21 — dos.delegations view: expose all underlying columns
--
-- Root cause:
--   user-service delegation router selects d.permissions, d.reason, d.status,
--   d.approved_by, d.approved_at, d.rejected_reason, d.created_by, d.updated_at
--   from dos.delegations. The current view exposes only delegator/delegate ids,
--   scope, valid_*, created_at + nullified deleted_at/updated_at — every other
--   column the application reads is silently dropped, producing the runtime
--   error "column d.permissions does not exist" on /api/delegations.
--
-- Doctrine fix:
--   Recreate dos.delegations as a 1:1 read-through view over the underlying
--   platform_dauth.delegations table, keeping the legacy `delegator_id`/
--   `delegate_id` aliases for callers that still use them. INSTEAD OF triggers
--   already exist on the view (writers go through ensureWritePath); rebuilding
--   the view via CREATE OR REPLACE preserves the trigger linkage.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- CREATE OR REPLACE VIEW preserves existing column order; new columns
-- must be appended after the existing ones.
CREATE OR REPLACE VIEW dos.delegations AS
SELECT
  d.delegation_id,
  d.from_user_id           AS delegator_id,
  d.to_user_id             AS delegate_id,
  d.from_user_id,
  d.to_user_id,
  d.tenant_id,
  d.scope,
  d.valid_from,
  d.valid_until,
  d.created_at,
  d.deleted_at,
  d.updated_at,
  -- new appended columns (Wave 21):
  d.permissions,
  d.reason,
  d.status,
  d.approved_by,
  d.approved_at,
  d.rejected_reason,
  d.created_by
  FROM platform_dauth.delegations d;

DO $$
DECLARE missing INT;
BEGIN
  SELECT count(*) INTO missing
    FROM (VALUES ('permissions'),('reason'),('status'),('approved_by'),
                 ('approved_at'),('rejected_reason'),('created_by'),
                 ('updated_at'),('deleted_at')) AS r(col)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema='dos' AND table_name='delegations'
        AND column_name=r.col);
  IF missing > 0 THEN
    RAISE EXCEPTION 'wave21: dos.delegations view still missing % columns', missing;
  END IF;
  RAISE NOTICE 'wave21 proof: dos.delegations exposes all underlying columns';
END$$;

COMMIT;
