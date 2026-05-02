// ============================================
// Asset Reports Service
// Coverage, aging, unlinked, orphan detection
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getCoverageReport(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      a.asset_id, a.name, a.type, a.criticality, a.lifecycle_stage,
      (SELECT COUNT(*)::int FROM "${ts}".control_asset_links cal WHERE cal.asset_id = a.asset_id) AS control_count,
      (SELECT COUNT(*)::int FROM "${ts}".risk_asset_links ral WHERE ral.asset_id = a.asset_id) AS risk_count,
      (SELECT COUNT(*)::int FROM "${ts}".asset_vendor_links avl WHERE avl.asset_id = a.asset_id) AS vendor_count,
      (SELECT COUNT(*)::int FROM "${ts}".asset_evidence_links ael WHERE ael.asset_id = a.asset_id) AS evidence_count,
      EXISTS(SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.revoked_at IS NULL) AS has_owner,
      a.data_classification_id IS NOT NULL AS has_classification
    FROM "${ts}".assets a WHERE a.deleted_at IS NULL
    ORDER BY a.criticality DESC, a.name
  `);
  return rows;
}

export async function getAgingReport(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      a.asset_id, a.name, a.type, a.criticality,
      a.acquisition_date,
      a.last_scan_at,
      EXTRACT(DAYS FROM NOW() - a.created_at)::int AS age_days,
      CASE
        WHEN a.last_scan_at IS NULL THEN 'never_scanned'
        WHEN a.last_scan_at < NOW() - INTERVAL '90 days' THEN 'overdue'
        WHEN a.last_scan_at < NOW() - INTERVAL '30 days' THEN 'due_soon'
        ELSE 'current'
      END AS scan_status
    FROM "${ts}".assets a WHERE a.deleted_at IS NULL
    ORDER BY a.last_scan_at ASC NULLS FIRST
  `);
  return rows;
}

export async function getOrphanReport(tenantId: string) {
  const ts = tenantSchema(tenantId);

  // Assets with no controls, no risks, no owner
  const { rows: orphanAssets } = await safeQuery(`
    SELECT a.asset_id, a.name, a.type, a.criticality, 'asset' AS entity_type
    FROM "${ts}".assets a
    WHERE a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM "${ts}".control_asset_links cal WHERE cal.asset_id = a.asset_id)
      AND NOT EXISTS (SELECT 1 FROM "${ts}".risk_asset_links ral WHERE ral.asset_id = a.asset_id)
      AND NOT EXISTS (SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.revoked_at IS NULL)
    ORDER BY a.criticality DESC, a.name
  `);

  // Applications with no linked assets
  const { rows: orphanApps } = await safeQuery(`
    SELECT application_id AS entity_id, name, app_type AS type, criticality, 'application' AS entity_type
    FROM "${ts}".applications
    WHERE deleted_at IS NULL AND (linked_asset_ids IS NULL OR linked_asset_ids = '{}')
    ORDER BY criticality DESC, name
  `);

  return {
    orphanAssets,
    orphanApplications: orphanApps,
    summary: {
      orphanAssetCount: orphanAssets.length,
      orphanAppCount: orphanApps.length,
    },
  };
}

export async function getClassificationReport(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COALESCE(c.name_en, 'Unclassified') AS classification,
      COALESCE(c.level, 0) AS level,
      COALESCE(c.color, '#9ca3af') AS color,
      COUNT(a.asset_id)::int AS count,
      COUNT(*) FILTER (WHERE a.criticality IN ('critical','high'))::int AS critical_high
    FROM "${ts}".assets a
    LEFT JOIN "${ts}".asset_classifications c ON c.classification_id = a.data_classification_id
    WHERE a.deleted_at IS NULL
    GROUP BY c.name_en, c.level, c.color
    ORDER BY COALESCE(c.level, 0)
  `);
  return rows;
}

export async function getDashboardSummary(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL) AS total_assets,
      (SELECT COUNT(*)::int FROM "${ts}".applications WHERE deleted_at IS NULL) AS total_applications,
      (SELECT COUNT(*)::int FROM "${ts}".business_services WHERE deleted_at IS NULL) AS total_services,
      (SELECT COUNT(*)::int FROM "${ts}".asset_dependencies WHERE deleted_at IS NULL) AS total_dependencies,
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL AND criticality IN ('critical','high')) AS critical_assets,
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL AND external_exposure = true) AS exposed_assets,
      (SELECT COUNT(*)::int FROM "${ts}".assets WHERE deleted_at IS NULL AND data_classification_id IS NULL) AS unclassified_assets,
      (SELECT COUNT(DISTINCT entity_id)::int FROM "${ts}".asset_owners WHERE entity_type = 'asset' AND revoked_at IS NULL) AS owned_assets
  `);
  return rows[0];
}
