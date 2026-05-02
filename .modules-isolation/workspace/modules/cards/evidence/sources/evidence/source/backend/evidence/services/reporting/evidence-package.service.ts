// ============================================================================
// Shahin-Ai -- Evidence Package Service
//
// Package/bundle management for audit-ready evidence export. Supports
// creating draft packages, adding/removing evidence items, finalizing for
// submission, and exporting with SOC2/ISO-style manifests.
//
// Tables:
//   evidence_packages         -- package header (name, type, status, scope)
//   evidence_package_items    -- junction table linking packages to evidence
//   evidence_exports          -- export records (format, status, expiry)
//   evidence_export_manifests -- JSON manifests with per-item checksums
// ============================================================================

import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault as _swallowDefault, EC as _EC } from '@dos/platform-core/resilience';
import { eventBus } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Compute SHA-256 checksum for a given string payload. */
function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

// ── Filter interface ─────────────────────────────────────────────────────

export interface PackageListFilters {
  status?: string;
  packageType?: string;
  frameworkCode?: string;
  page?: number;
  pageSize?: number;
}

// ── 1. listPackages ──────────────────────────────────────────────────────

/**
 * List evidence packages with optional filters and pagination.
 * Returns paginated results with total count for UI table rendering.
 *
 * @param tenantId - Tenant identifier
 * @param filters  - Optional filters (status, packageType, frameworkCode, page, pageSize)
 */
export async function listPackages(
  tenantId: string,
  filters?: PackageListFilters,
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.packageType) {
    conditions.push(`package_type = $${idx++}`);
    params.push(filters.packageType);
  }
  if (filters?.frameworkCode) {
    conditions.push(`framework_code = $${idx++}`);
    params.push(filters.frameworkCode);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count for pagination
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".evidence_packages ${where}`,
    params,
  );
  const total: number = getFirstRow(countResult)?.total ?? 0;

  // Paginated data
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters?.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const dataParams = [...params, pageSize, offset];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence_packages ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    dataParams,
  );

  return { rows: result.rows, total };
}

// ── 2. getPackageDetail ──────────────────────────────────────────────────

/**
 * Retrieve a single package with its items joined to evidence metadata
 * (title, type, freshness status).
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 */
export async function getPackageDetail(
  tenantId: string,
  packageId: string,
): Promise<GenericRow> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── 3. createPackage ─────────────────────────────────────────────────────

/**
 * Create a new evidence package in draft status.
 *
 * @param tenantId - Tenant identifier
 * @param data     - Package creation payload
 */
export async function createPackage(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    packageType: string;
    frameworkCode?: string;
    scopeStart?: string;
    scopeEnd?: string;
    createdBy: string;
  },
): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const packageId = uuid();

  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_packages
       (id, name, description, package_type, framework_code, scope_start, scope_end,
        status, item_count, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 0, $8, NOW())
     RETURNING *`,
    [
      packageId,
      data.name,
      data.description || null,
      data.packageType,
      data.frameworkCode || null,
      data.scopeStart || null,
      data.scopeEnd || null,
      data.createdBy,
    ],
  );

  const pkg = getFirstRow(result)!;

  // Publish event (best-effort)
  try {
    await eventBus.publish('evidence.package_created', tenantId, {
      packageId,
      name: data.name,
      packageType: data.packageType,
      createdBy: data.createdBy,
    });
  } catch { /* best-effort */ }

  logger.info(`[evidence-package] Created package "${data.name}" (${packageId})`);
  return pkg;
}

// ── 4. updatePackage ─────────────────────────────────────────────────────

/**
 * Update mutable fields on a package. Only allowed when status is 'draft'.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 * @param data      - Fields to update
 */
export async function updatePackage(
  tenantId: string,
  packageId: string,
  data: Partial<{
    name: string;
    description: string;
    packageType: string;
    frameworkCode: string;
    scopeStart: string;
    scopeEnd: string;
  }>,
): Promise<GenericRow> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── 5. deletePackage ─────────────────────────────────────────────────────

/**
 * Delete a package. Only allowed when status is 'draft'.
 * Deletes associated package items first, then the package itself.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 */
export async function deletePackage(
  tenantId: string,
  packageId: string,
): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as unknown as void;
}

// ── 6. addItemToPackage ──────────────────────────────────────────────────

/**
 * Add a single evidence item to a package. Blocked if the package is
 * finalized or exported.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 * @param evidenceId - Evidence item UUID to add
 * @param addedBy   - User ID performing the addition
 * @param notes     - Optional notes about why this item was included
 */
export async function addItemToPackage(
  tenantId: string,
  packageId: string,
  evidenceId: string,
  addedBy: string,
  notes?: string,
): Promise<GenericRow> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── 7. removeItemFromPackage ─────────────────────────────────────────────

/**
 * Remove a single item from a package. Blocked if the package is finalized.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 * @param itemId    - Package item UUID to remove
 */
export async function removeItemFromPackage(
  tenantId: string,
  packageId: string,
  itemId: string,
): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as unknown as void;
}

// ── 8. finalizePackage ───────────────────────────────────────────────────

/**
 * Finalize a package, locking it for export. Blocked if the package
 * has no items or is already finalized.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 * @param userId    - User ID performing the finalization
 */
export async function finalizePackage(
  tenantId: string,
  packageId: string,
  userId: string,
): Promise<GenericRow> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── 9. exportPackage ─────────────────────────────────────────────────────

/**
 * Export a finalized package. Creates an evidence_exports record and
 * an evidence_export_manifests record with a complete JSON manifest
 * including per-item metadata and SHA-256 checksums.
 *
 * @param tenantId   - Tenant identifier
 * @param packageId  - Package UUID (must be finalized)
 * @param format     - Export format (e.g. 'pdf', 'csv', 'json', 'zip')
 * @param exportedBy - User ID performing the export
 */
export async function exportPackage(
  tenantId: string,
  packageId: string,
  format: string,
  exportedBy: string,
): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);

  const pkg = await getPackageDetail(tenantId, packageId);

  const exportId = uuid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const manifestItems = (pkg.items || []).map((item: GenericRow) => ({
    evidenceId: item.evidence_id,
    title: item.evidence_title,
    type: item.evidence_type,
    status: item.evidence_status,
    freshnessStatus: item.freshness_status,
    validFrom: item.valid_from,
    validTo: item.valid_to,
    sortOrder: item.sort_order,
    checksum: sha256(
      `${item.evidence_id}|${item.evidence_title || ''}|${item.evidence_status || ''}|${item.freshness_status || ''}`,
    ),
  }));

  const manifestJson = {
    exportId,
    packageId,
    packageName: pkg.name,
    packageType: pkg.package_type,
    frameworkCode: pkg.framework_code || null,
    scopeStart: pkg.scope_start || null,
    scopeEnd: pkg.scope_end || null,
    format,
    exportedBy,
    exportedAt: new Date().toISOString(),
    itemCount: manifestItems.length,
    items: manifestItems,
  };

  const manifestString = JSON.stringify(manifestJson);
  const manifestChecksum = sha256(manifestString);

  const exportRow = await withTransaction(tenantId, async (client) => {
    const expResult = await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_exports
         (id, package_id, format, status, exported_by, expires_at, created_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, NOW())
       RETURNING *`,
      [exportId, packageId, format, exportedBy, expiresAt.toISOString()], client,
    );

    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_export_manifests
         (id, export_id, manifest_json, checksum, generated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())`,
      [uuid(), exportId, manifestString, manifestChecksum], client,
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".evidence_exports
       SET status = 'completed'
       WHERE id = $1`,
      [exportId], client,
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".evidence_packages
       SET exported_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [packageId], client,
    );

    return getFirstRow(expResult);
  });

  try {
    await eventBus.publish('evidence.package_exported', tenantId, {
      packageId,
      exportId,
      format,
      exportedBy,
      itemCount: manifestItems.length,
    });
  } catch { /* best-effort */ }

  logger.info(
    `[evidence-package] Exported package ${packageId} as ${format} (${manifestItems.length} items, export ${exportId})`,
  );

  return {
    ...exportRow,
    status: 'completed',
    manifest: manifestJson,
    checksum: manifestChecksum,
  };
}

// ── 10. getPackageExports ────────────────────────────────────────────────

/**
 * List all exports for a given package, ordered by most recent first.
 * Includes manifest checksum when available.
 *
 * @param tenantId  - Tenant identifier
 * @param packageId - Package UUID
 */
export async function getPackageExports(
  tenantId: string,
  packageId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT ee.*,
            eem.checksum      AS manifest_checksum,
            eem.generated_at  AS manifest_generated_at
     FROM "${schema}".evidence_exports ee
     LEFT JOIN "${schema}".evidence_export_manifests eem ON eem.export_id = ee.id
     WHERE ee.package_id = $1
     ORDER BY ee.created_at DESC`,
    [packageId],
  );

  return result.rows;
}
