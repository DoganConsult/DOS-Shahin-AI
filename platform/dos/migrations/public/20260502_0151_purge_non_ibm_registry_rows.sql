-- 0151 — Purge non-IBM rows from dos.dynamic_ui_component_registry.
--
-- Per Hard Execution Order (rules #1, #2): IBM Carbon is the only approved
-- UI ecosystem. The dynamic_ui_component_registry must hold only
-- vendor='ibm-carbon' / approval_status='approved' rows.
--
-- Pre-state (verified before migration):
--   29-30 rows approved/ibm-carbon  (signature widget archetypes)
--   57    rows custom/unapproved     (chart.*, ai.*, asset.*, wc.*, product*
--                                     keys pre-staged 2026-05-01 20:28:37
--                                     before the catalog rows existed)
--
-- Action: DELETE the 57 custom/unapproved rows. They are NOT routes — only
-- placeholder registry entries. The matching catalog rows in
-- dos.ui_carbon_components are retained (they are 100% IBM Carbon).
--
-- Post-state:
--   ~30 rows total, all vendor='ibm-carbon' / approval_status='approved'
--   0   rows vendor='custom'
--   0   rows approval_status='unapproved'
--
-- Idempotent: WHERE vendor<>'ibm-carbon' deletes only non-IBM rows; if run
-- twice, the second run deletes nothing.
-- =====================================================================
BEGIN;

-- 1. Capture pre-delete snapshot for audit (saved as a comment in NOTICE).
DO $$
DECLARE
  n_before_total      INTEGER;
  n_before_approved   INTEGER;
  n_before_custom     INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_before_total    FROM dos.dynamic_ui_component_registry;
  SELECT COUNT(*) INTO n_before_approved FROM dos.dynamic_ui_component_registry WHERE vendor='ibm-carbon' AND approval_status='approved';
  SELECT COUNT(*) INTO n_before_custom   FROM dos.dynamic_ui_component_registry WHERE vendor<>'ibm-carbon' OR approval_status<>'approved';
  RAISE NOTICE 'PRE-DELETE: total=% approved-ibm=% non-ibm-or-unapproved=%',
    n_before_total, n_before_approved, n_before_custom;
END $$;

-- 2. Delete every non-IBM row.
DELETE FROM dos.dynamic_ui_component_registry
 WHERE vendor <> 'ibm-carbon'
    OR approval_status <> 'approved';

-- 3. Post-flight invariants — Dynamic UI registry must now be 100% IBM.
DO $$
DECLARE
  n_after_total       INTEGER;
  n_after_non_ibm     INTEGER;
  n_after_unapproved  INTEGER;
  n_after_routes_blocked INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_after_total      FROM dos.dynamic_ui_component_registry;
  SELECT COUNT(*) INTO n_after_non_ibm    FROM dos.dynamic_ui_component_registry WHERE vendor<>'ibm-carbon';
  SELECT COUNT(*) INTO n_after_unapproved FROM dos.dynamic_ui_component_registry WHERE approval_status<>'approved';
  SELECT COUNT(*) INTO n_after_routes_blocked
    FROM dos.dynamic_ui_component_registry r
    JOIN dos.ui_carbon_components c USING (carbon_key)
   WHERE c.runtime_status = 'blocked-react-only';

  IF n_after_non_ibm    <> 0 THEN RAISE EXCEPTION '0151: non-IBM rows remain (% rows)', n_after_non_ibm; END IF;
  IF n_after_unapproved <> 0 THEN RAISE EXCEPTION '0151: unapproved rows remain (% rows)', n_after_unapproved; END IF;
  IF n_after_routes_blocked <> 0 THEN RAISE EXCEPTION '0151: registry routes to blocked-react-only (% rows)', n_after_routes_blocked; END IF;

  RAISE NOTICE 'POST-DELETE: total=% non_ibm=% unapproved=% routes_to_blocked=%',
    n_after_total, n_after_non_ibm, n_after_unapproved, n_after_routes_blocked;
END $$;

-- 4. Tracking — record this migration in the ledger.
INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0151_purge_non_ibm_registry_rows.sql', 'inline-0151', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0151_purge_non_ibm_registry_rows.sql'
 );

COMMIT;
