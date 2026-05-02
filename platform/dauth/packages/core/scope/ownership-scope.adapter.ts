/**
 * DAuth Ownership Scope Adapter — resolves entity ownership from DOS foundation tables.
 * Queries: grc_ownership_matrix view (union of control_owners, risk_owners, evidence_owners, etc.)
 * and domain-specific owner tables for write operations.
 *
 * The grc_ownership_matrix view provides a unified read surface across all
 * GRC entity types (control, risk, evidence, policy, etc.).
 */
import { safeQuery, tenantSchema } from '@dos/db';

/** Ownership record returned from the ownership matrix. */
export interface OwnershipRecord {
  entityType: string;
  entityId: string;
  userId: string;
  ownershipType: string;
  isPrimary: boolean;
  primaryTeamId: string | null;
  deptId: string | null;
}

/**
 * Resolve all entities owned by a user, optionally filtered by entity type.
 * Reads from grc_ownership_matrix view which unifies all ownership tables.
 */
export async function resolveOwnershipScope(
  tenantId: string,
  userId: string,
  entityType?: string,
): Promise<OwnershipRecord[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [userId];
  let typeFilter = '';
  if (entityType) {
    typeFilter = ' AND entity_type = $2';
    params.push(entityType);
  }

  const { rows } = await safeQuery(
    `SELECT entity_type, entity_id::text, user_id, ownership_type,
            COALESCE(is_primary, FALSE) AS is_primary,
            primary_team_id::text, dept_id::text
     FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1${typeFilter}`,
    params,
  );

  return rows.map((r: any) => ({
    entityType: r.entity_type as string,
    entityId: r.entity_id as string,
    userId: r.user_id as string,
    ownershipType: r.ownership_type as string,
    isPrimary: r.is_primary as boolean,
    primaryTeamId: r.primary_team_id as string | null,
    deptId: r.dept_id as string | null,
  }));
}

/**
 * Check if a user owns a specific entity (any ownership type).
 * Queries the grc_ownership_matrix view for an exact match.
 */
export async function isEntityOwner(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT 1 FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1 AND entity_type = $2 AND entity_id::text = $3
     LIMIT 1`,
    [userId, entityType, entityId],
  );
  return rows.length > 0;
}

/**
 * Check if a user is the PRIMARY owner of a specific entity.
 */
export async function isPrimaryOwner(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT 1 FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1 AND entity_type = $2 AND entity_id::text = $3 AND is_primary = TRUE
     LIMIT 1`,
    [userId, entityType, entityId],
  );
  return rows.length > 0;
}

/**
 * Get all owners for a specific entity.
 * Returns user IDs with their ownership type and primary flag.
 */
export async function getEntityOwners(
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<{ userId: string; ownershipType: string; isPrimary: boolean }[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT user_id, ownership_type, COALESCE(is_primary, FALSE) AS is_primary
     FROM "${schema}".grc_ownership_matrix
     WHERE entity_type = $1 AND entity_id::text = $2`,
    [entityType, entityId],
  );
  return rows.map((r: any) => ({
    userId: r.user_id as string,
    ownershipType: r.ownership_type as string,
    isPrimary: r.is_primary as boolean,
  }));
}

/**
 * Get all entity IDs owned by a user for a specific entity type.
 * Convenience wrapper returning just the IDs.
 */
export async function getOwnedEntityIds(
  tenantId: string,
  userId: string,
  entityType: string,
): Promise<string[]> {
  const records = await resolveOwnershipScope(tenantId, userId, entityType);
  return records.map(r => r.entityId);
}

/**
 * Assign ownership for a control entity.
 * Uses the control_owners table directly for write operations.
 */
export async function assignControlOwnership(
  tenantId: string,
  userId: string,
  controlId: string,
  ownershipType: string,
  isPrimary: boolean,
  assignedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".control_owners (control_id, user_id, ownership_type, is_primary, assigned_by, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (control_id, user_id) DO UPDATE SET
       ownership_type = EXCLUDED.ownership_type,
       is_primary = EXCLUDED.is_primary,
       deleted_at = NULL,
       updated_at = NOW()`,
    [controlId, userId, ownershipType, isPrimary, assignedBy],
  );
}

/**
 * Assign ownership for a risk entity.
 * Uses the risk_owners table directly for write operations.
 */
export async function assignRiskOwnership(
  tenantId: string,
  userId: string,
  riskId: string,
  ownershipType: string,
  isPrimary: boolean,
  assignedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".risk_owners (risk_id, user_id, ownership_type, is_primary, assigned_by, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (risk_id, user_id) DO UPDATE SET
       ownership_type = EXCLUDED.ownership_type,
       is_primary = EXCLUDED.is_primary,
       deleted_at = NULL,
       updated_at = NOW()`,
    [riskId, userId, ownershipType, isPrimary, assignedBy],
  );
}

/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for control_owners table.
 */
export async function revokeControlOwnership(
  tenantId: string,
  userId: string,
  controlId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".control_owners SET deleted_at = NOW(), updated_at = NOW()
     WHERE control_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [controlId, userId],
  );
}

/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for risk_owners table.
 */
export async function revokeRiskOwnership(
  tenantId: string,
  userId: string,
  riskId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".risk_owners SET deleted_at = NOW(), updated_at = NOW()
     WHERE risk_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [riskId, userId],
  );
}
