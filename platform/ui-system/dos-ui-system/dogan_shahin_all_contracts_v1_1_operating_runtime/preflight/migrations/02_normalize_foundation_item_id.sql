-- =====================================================================
-- v1.1 Operating Runtime Pack — Preflight Blocker B2
-- Foundation item_id hyphen/underscore drift normalization
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration is shipped as ready-for-review SQL inside the v1.1
-- contract pack. It MUST NOT be auto-executed by the migrator pipeline.
-- Execution is gated on human review + lockstep CI guard.
--
-- Defect:
--   20260514_0400_workspace_canonical_module_page_order.sql writes
--   Foundation page item_ids using hyphenated names (e.g.
--   foundation.business-units, foundation.access-review,
--   foundation.ownership-mapping, foundation.hierarchy-viz,
--   foundation.user-lifecycle). Other migrations and downstream
--   contracts use underscored canonical ids (e.g.
--   foundation.business_units). This drift causes UPDATE ... WHERE
--   item_id = 'foundation.business_units' to silently miss rows whose
--   item_id is 'foundation.business-units' and vice versa.
--
-- Fix mode (CORRECTED per plan):
--   DO NOT use generic replace(item_id, '-', '.') / replace('_', '.').
--   That would corrupt 'foundation.business-units' into
--   'foundation.business.units'. Normalization MUST use an explicit
--   canonical mapping table authored in lockstep with
--   preflight/blockers.contract.v1-1.json (foundation_item_id_map).
--
-- Idempotent:  yes (UPDATE only flips rows where current <> canonical)
-- Destructive: no schema change; updates rows in place
-- Review required: yes (touches existing rows; aliases must be
--                    confirmed by Foundation owner before apply)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Canonical map (legacy_id -> canonical_id) for the 24 Foundation
--    pages. Both hyphenated and already-underscored variants are
--    listed so the migration is fully idempotent.
-- ---------------------------------------------------------------------
WITH foundation_item_id_map(legacy_id, canonical_id) AS (
  VALUES
    -- single-token ids (no change, listed for explicit coverage)
    ('foundation.overview',           'foundation.overview'),
    ('foundation.organization',       'foundation.organization'),
    ('foundation.departments',        'foundation.departments'),
    ('foundation.positions',          'foundation.positions'),
    ('foundation.users',              'foundation.users'),
    ('foundation.teams',              'foundation.teams'),
    ('foundation.roles',              'foundation.roles'),
    ('foundation.locations',          'foundation.locations'),
    ('foundation.committees',         'foundation.committees'),
    ('foundation.delegations',        'foundation.delegations'),
    ('foundation.policies',           'foundation.policies'),
    ('foundation.audit',              'foundation.audit'),
    ('foundation.settings',           'foundation.settings'),
    ('foundation.permissions',        'foundation.permissions'),
    ('foundation.ownership',          'foundation.ownership'),
    ('foundation.sod',                'foundation.sod'),
    ('foundation.diagnostics',        'foundation.diagnostics'),

    -- compound ids: hyphen variants -> underscore canonical
    ('foundation.business-units',     'foundation.business_units'),
    ('foundation.business_units',     'foundation.business_units'),

    ('foundation.access-review',      'foundation.access_review'),
    ('foundation.access_review',      'foundation.access_review'),

    ('foundation.data-processing',    'foundation.data_processing'),
    ('foundation.data_processing',    'foundation.data_processing'),

    ('foundation.reference-data',     'foundation.reference_data'),
    ('foundation.reference_data',     'foundation.reference_data'),

    ('foundation.hierarchy-viz',      'foundation.hierarchy_viz'),
    ('foundation.hierarchy_viz',      'foundation.hierarchy_viz'),

    ('foundation.user-lifecycle',     'foundation.user_lifecycle'),
    ('foundation.user_lifecycle',     'foundation.user_lifecycle'),

    -- ownership-mapping is a separate canonical id (matrix alias).
    -- Per v1 contract, /foundation/ownership has alias
    -- /foundation/ownership-mapping. The migration list keeps both
    -- as distinct nav items; we normalize the hyphenated form to
    -- the underscored canonical id, while the standalone
    -- 'foundation.ownership' item is kept as-is.
    ('foundation.ownership-mapping',  'foundation.ownership_mapping'),
    ('foundation.ownership_mapping',  'foundation.ownership_mapping')
)
UPDATE dos.ui_module_nav_item i
   SET item_id    = m.canonical_id,
       updated_at = now()
  FROM foundation_item_id_map m
 WHERE i.module_code = 'foundation'
   AND i.item_id     = m.legacy_id
   AND i.item_id    <> m.canonical_id;

-- ---------------------------------------------------------------------
-- 2. Post-condition assertion: every Foundation row must now have a
--    canonical id from the map, and zero rows may carry hyphenated
--    compound ids. Fail loudly if drift remains.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  hyphen_residue INT;
  uncanonical_count INT;
BEGIN
  SELECT count(*) INTO hyphen_residue
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation'
     AND item_id IN (
       'foundation.business-units','foundation.access-review',
       'foundation.data-processing','foundation.reference-data',
       'foundation.hierarchy-viz','foundation.user-lifecycle',
       'foundation.ownership-mapping'
     );
  IF hyphen_residue > 0 THEN
    RAISE EXCEPTION 'B2 post-condition failed: % hyphenated Foundation item_ids remain', hyphen_residue;
  END IF;

  SELECT count(*) INTO uncanonical_count
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation'
     AND item_id NOT IN (
       'foundation.overview','foundation.organization','foundation.business_units',
       'foundation.departments','foundation.positions','foundation.users',
       'foundation.teams','foundation.roles','foundation.locations',
       'foundation.committees','foundation.delegations','foundation.ownership_mapping',
       'foundation.access_review','foundation.policies','foundation.data_processing',
       'foundation.reference_data','foundation.audit','foundation.settings',
       'foundation.permissions','foundation.ownership','foundation.sod',
       'foundation.hierarchy_viz','foundation.user_lifecycle','foundation.diagnostics'
     );
  IF uncanonical_count > 0 THEN
    RAISE WARNING 'B2 advisory: % Foundation rows carry ids outside the canonical 24 (kept as deprecated tail; review_required)', uncanonical_count;
  END IF;

  RAISE NOTICE 'B2 OK: Foundation item_id drift normalized via explicit map (no generic replace).';
END $$;

COMMIT;
