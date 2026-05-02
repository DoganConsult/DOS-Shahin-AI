-- =====================================================================
-- 0002 — Idempotent Carbon registry backfill for legacy / drifted rows.
--
-- Re-applies 0148-style classification so every DNA archetype row ends with:
--   vendor = ibm-carbon, approval_status = approved, carbon_key FK valid,
--   and catalog.runtime_status is runtime-eligible (0400 trigger).
--
-- Safe to re-run: only updates rows that still mismatch.
-- =====================================================================

BEGIN;

-- 1) Direct match: component_key equals a catalog carbon_key.
UPDATE dos.dynamic_ui_component_registry r
SET vendor = 'ibm-carbon',
    approval_status = 'approved',
    approved_at = COALESCE(r.approved_at, NOW()),
    carbon_key = c.carbon_key
FROM dos.ui_carbon_components c
WHERE r.component_key = c.carbon_key
  AND c.vendor = 'ibm-carbon'
  AND (
    c.runtime_status IS NULL
    OR c.runtime_status NOT IN (
      'blocked-react-only',
      'missing-upstream-angular-binding',
      'catalog-only'
    )
  )
  AND (
    r.vendor IS DISTINCT FROM 'ibm-carbon'
    OR r.approval_status IS DISTINCT FROM 'approved'
    OR r.carbon_key IS DISTINCT FROM c.carbon_key
  );

-- 2) Archetype prefixes → Carbon backing module (same CASE as 0148).
UPDATE dos.dynamic_ui_component_registry r
SET vendor = 'ibm-carbon',
    approval_status = 'approved',
    approved_at = COALESCE(r.approved_at, NOW()),
    carbon_key = m.ck
FROM (
  SELECT
    component_key,
    CASE
      WHEN component_key LIKE 'command-center.%' THEN 'tiles'
      WHEN component_key LIKE 'smart-grid.%' THEN 'table'
      WHEN component_key LIKE 'audit-timeline.%' THEN 'structured-list'
      WHEN component_key LIKE 'matrix.%' THEN 'table'
      WHEN component_key LIKE 'context-rail.%' THEN 'tiles'
      WHEN component_key LIKE 'recommendation-card.%' THEN 'tiles'
      WHEN component_key LIKE 'page-masthead%' THEN 'breadcrumb'
    END AS ck
  FROM dos.dynamic_ui_component_registry
) m
INNER JOIN dos.ui_carbon_components c
  ON c.carbon_key = m.ck
 AND c.vendor = 'ibm-carbon'
 AND (
   c.runtime_status IS NULL
   OR c.runtime_status NOT IN (
     'blocked-react-only',
     'missing-upstream-angular-binding',
     'catalog-only'
   )
 )
WHERE r.component_key = m.component_key
  AND m.ck IS NOT NULL
  AND (
    r.vendor IS DISTINCT FROM 'ibm-carbon'
    OR r.approval_status IS DISTINCT FROM 'approved'
    OR r.carbon_key IS DISTINCT FROM m.ck
  );

COMMIT;
