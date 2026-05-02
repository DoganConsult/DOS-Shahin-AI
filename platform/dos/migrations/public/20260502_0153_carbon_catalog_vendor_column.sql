-- =====================================================================
-- 0153 — Carbon catalog vendor classification + completeness invariants
--
-- Per Hard Execution Order (CLASSIFICATION MODEL): every dos.ui_carbon_components
-- row must declare `vendor: ibm-carbon`. Until now vendor was only on
-- dos.dynamic_ui_component_registry. This migration:
--
--   1. Adds vendor column (NOT NULL DEFAULT 'ibm-carbon', locked by CHECK).
--   2. Backfills every existing row to 'ibm-carbon' (the only allowed value).
--   3. Adds a partial index on (vendor, package_name) for filtered queries.
--   4. Asserts catalog completeness across all phases:
--        Phase 0: 58 carbon-components-angular rows
--        Phase 1: 25 @carbon/charts-angular chart rows
--        Phase 2: 1  @carbon/icons-angular + 1 @carbon/pictograms
--        Phase 3: 28 @carbon/web-components rows (25 spec + 3 AI suite)
--        Phase 4: 96 @carbon/ibm-products + 6 @carbon/ibm-products-web-components
--        Phase 5: 3  @carbon/ai-chat-components rows + 1 ai-label (in Phase 0)
--   5. Asserts no row is missing classification fields.
-- =====================================================================
BEGIN;

-- 1. Vendor column (locked to 'ibm-carbon').
ALTER TABLE dos.ui_carbon_components
  ADD COLUMN IF NOT EXISTS vendor VARCHAR(40) NOT NULL DEFAULT 'ibm-carbon';

ALTER TABLE dos.ui_carbon_components
  DROP CONSTRAINT IF EXISTS ui_carbon_components_vendor_check;
ALTER TABLE dos.ui_carbon_components
  ADD CONSTRAINT ui_carbon_components_vendor_check
  CHECK (vendor = 'ibm-carbon');

-- 2. Backfill (idempotent — DEFAULT already set, but explicit for clarity).
UPDATE dos.ui_carbon_components SET vendor = 'ibm-carbon' WHERE vendor IS NULL OR vendor <> 'ibm-carbon';

-- 2a. Backfill Phase 0 native Angular rows that pre-date 0149 classification
--     columns. source_component_name was added by 0149 with DEFAULT NULL; the
--     58 rows seeded by 0148 never received a value. Derive it deterministically
--     from carbon_key (kebab → PascalCase + 'Module' suffix to match the export
--     name carbon-components-angular ships, e.g. button → ButtonModule).
UPDATE dos.ui_carbon_components
   SET source_component_name = (
     SELECT string_agg(initcap(part), '') FROM unnest(string_to_array(carbon_key, '-')) AS part
   ) || 'Module'
 WHERE package_name = 'carbon-components-angular'
   AND source_component_name IS NULL;

-- 3. Index for vendor+package filtering (gateway/admin pages).
CREATE INDEX IF NOT EXISTS ix_ui_carbon_components_vendor_pkg
  ON dos.ui_carbon_components(vendor, package_name);

-- 4. Catalog completeness invariants — fail loudly if any phase regressed.
DO $$
DECLARE
  n_total          INTEGER;
  n_phase0_native  INTEGER;
  n_phase1_charts  INTEGER;
  n_phase2_icons   INTEGER;
  n_phase2_pict    INTEGER;
  n_phase3_wc      INTEGER;
  n_phase4_react   INTEGER;
  n_phase4_wc      INTEGER;
  n_phase5_ai_chat INTEGER;
  n_missing_class  INTEGER;
  n_non_ibm        INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_total          FROM dos.ui_carbon_components;
  SELECT COUNT(*) INTO n_phase0_native  FROM dos.ui_carbon_components WHERE package_name='carbon-components-angular';
  SELECT COUNT(*) INTO n_phase1_charts  FROM dos.ui_carbon_components WHERE package_name='@carbon/charts-angular';
  SELECT COUNT(*) INTO n_phase2_icons   FROM dos.ui_carbon_components WHERE package_name='@carbon/icons-angular';
  SELECT COUNT(*) INTO n_phase2_pict    FROM dos.ui_carbon_components WHERE package_name='@carbon/pictograms';
  SELECT COUNT(*) INTO n_phase3_wc      FROM dos.ui_carbon_components WHERE package_name='@carbon/web-components';
  SELECT COUNT(*) INTO n_phase4_react   FROM dos.ui_carbon_components WHERE package_name='@carbon/ibm-products';
  SELECT COUNT(*) INTO n_phase4_wc      FROM dos.ui_carbon_components WHERE package_name='@carbon/ibm-products-web-components';
  SELECT COUNT(*) INTO n_phase5_ai_chat FROM dos.ui_carbon_components WHERE package_name='@carbon/ai-chat-components';
  SELECT COUNT(*) INTO n_missing_class  FROM dos.ui_carbon_components
    WHERE vendor IS NULL OR package_name IS NULL OR integration_mode IS NULL
       OR runtime_status IS NULL OR stability IS NULL OR source_component_name IS NULL;
  SELECT COUNT(*) INTO n_non_ibm        FROM dos.ui_carbon_components WHERE vendor <> 'ibm-carbon';

  IF n_phase0_native  <> 58  THEN RAISE EXCEPTION '0153: Phase 0 native count drift (got %, want 58)',  n_phase0_native;  END IF;
  IF n_phase1_charts  <> 25  THEN RAISE EXCEPTION '0153: Phase 1 chart count drift (got %, want 25)',   n_phase1_charts;  END IF;
  IF n_phase2_icons   <> 1   THEN RAISE EXCEPTION '0153: Phase 2 icons count drift (got %, want 1)',    n_phase2_icons;   END IF;
  IF n_phase2_pict    <> 1   THEN RAISE EXCEPTION '0153: Phase 2 pictograms count drift (got %, want 1)', n_phase2_pict;  END IF;
  IF n_phase3_wc      <  25  THEN RAISE EXCEPTION '0153: Phase 3 WC count below 25 (got %)',            n_phase3_wc;      END IF;
  IF n_phase4_react   <  86  THEN RAISE EXCEPTION '0153: Phase 4 IBM Products count below 86 (got %)',  n_phase4_react;   END IF;
  IF n_phase4_wc      <  6   THEN RAISE EXCEPTION '0153: Phase 4 IBM Products WC count below 6 (got %)', n_phase4_wc;     END IF;
  IF n_phase5_ai_chat <  3   THEN RAISE EXCEPTION '0153: Phase 5 AI chat count below 3 (got %)',         n_phase5_ai_chat; END IF;
  IF n_missing_class  <> 0   THEN RAISE EXCEPTION '0153: % rows missing required classification fields', n_missing_class;  END IF;
  IF n_non_ibm        <> 0   THEN RAISE EXCEPTION '0153: % rows with non-IBM vendor (must be ibm-carbon only)', n_non_ibm; END IF;

  RAISE NOTICE 'CATALOG COMPLETE: total=% phase0=% phase1=% phase2_icons=% phase2_pict=% phase3=% phase4_react=% phase4_wc=% phase5=% non_ibm=%',
    n_total, n_phase0_native, n_phase1_charts, n_phase2_icons, n_phase2_pict,
    n_phase3_wc, n_phase4_react, n_phase4_wc, n_phase5_ai_chat, n_non_ibm;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0153_carbon_catalog_vendor_column.sql', 'inline-0153', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0153_carbon_catalog_vendor_column.sql'
 );

COMMIT;
