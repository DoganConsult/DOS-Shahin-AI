-- ============================================================================
-- 107_incident_r1_structural_hardening.sql
-- Ported from monolith: backend/src/migrations/tenant/187_incident_r1_structural_hardening.sql
-- Runs in per-tenant schema. run-tenant-migrations.sh sets search_path.
-- ============================================================================
-- ============================================
-- Migration 187 — Incident R1 Structural Hardening
-- A. Safe DB CHECK constraint on incidents.status
-- B. Normalize any invalid status values (open → reported)
-- C. Seed missing incident nav items (8 children)
-- D. Ensure owner_user_id column is present
-- ============================================

BEGIN;

-- ═══ A. Normalize existing invalid status values before adding constraint ═══

UPDATE incidents SET status = 'reported'
  WHERE status NOT IN ('reported','investigating','contained','resolved','closed')
    AND status IS NOT NULL;

UPDATE incidents SET status = 'reported' WHERE status IS NULL;

-- ═══ B. Add CHECK constraint on incidents.status (safe — drops if exists first) ═══

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_incidents_status'
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT chk_incidents_status
      CHECK (status IN ('reported','investigating','contained','resolved','closed'));
  END IF;
END $$;

-- ═══ C. Navigation — seed missing incident child items ═══
-- Phase 3A: navigation_registry is platform-scope (dos.navigation_registry)
-- and does not match this legacy nav_key schema shape. Guard exactly as 106/A.
DO $$
BEGIN
  IF to_regclass('navigation_registry') IS NULL THEN
    RAISE NOTICE 'skip 107/C: navigation_registry not on search_path (platform-scope seed not applied per-tenant)';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_registry' AND column_name = 'nav_key'
  ) THEN
    RAISE NOTICE 'skip 107/C: modern navigation_registry uses code/parent_code; platform bootstrap owns the seed';
    RETURN;
  END IF;

  INSERT INTO navigation_registry
    (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
  VALUES
    ('incidents-investigation', 'incidents', 'Investigation',         'التحقيق',               '/incidents/investigation', null, 'incident', 'link', 653, true, true),
    ('incidents-war-room',      'incidents', 'War Room',              'غرفة العمليات',          '/incidents/war-room',      null, 'incident', 'link', 654, true, true),
    ('incidents-near-miss',     'incidents', 'Near-Miss',             'الحوادث الوشيكة',        '/incidents/near-miss',     null, 'incident', 'link', 655, true, true),
    ('incidents-pir',           'incidents', 'Post-Incident Review',  'مراجعة ما بعد الحادث',   '/incidents/pir',           null, 'incident', 'link', 656, true, true),
    ('incidents-trends',        'incidents', 'Trends & Analytics',    'الاتجاهات والتحليلات',   '/incidents/trends',        null, 'incident', 'link', 657, true, true),
    ('incidents-regulatory',    'incidents', 'Regulatory Reporting',  'الإبلاغ التنظيمي',       '/incidents/regulatory',    null, 'incident', 'link', 658, true, true),
    ('incidents-taxonomy',      'incidents', 'Taxonomy',              'التصنيف',                 '/incidents/taxonomy',      null, 'incident', 'link', 659, true, true),
    ('incidents-lessons',       'incidents', 'Lessons Learned',       'الدروس المستفادة',       '/incidents/lessons',       null, 'incident', 'link', 660, true, true)
  ON CONFLICT (nav_key) DO UPDATE SET
    parent_nav_key = EXCLUDED.parent_nav_key,
    label_en       = EXCLUDED.label_en,
    label_ar       = EXCLUDED.label_ar,
    route          = EXCLUDED.route,
    module_code    = EXCLUDED.module_code,
    sort_order     = EXCLUDED.sort_order,
    is_active      = true;
END $$;

-- ═══ D. Ensure owner_user_id column exists (idempotent) ═══

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_incidents_owner_user ON incidents(owner_user_id) WHERE owner_user_id IS NOT NULL;

COMMIT;
