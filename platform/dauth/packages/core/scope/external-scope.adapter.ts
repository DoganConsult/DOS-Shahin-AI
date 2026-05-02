/**
 * DAuth External Scope Adapter — resolves scope for external/federated users.
 * Queries: external_user_scopes table (migration 011).
 *
 * External users (auditors, vendors, regulators) have limited scope defined
 * by explicit grants in external_user_scopes rather than role assignments
 * in the foundation hierarchy.
 *
 * Spec: Patch 3 §2.9.3
 */
import { safeQuery, tenantSchema } from '@dos/db';

export interface ExternalScope {
  scopeId: string;
  userId: string;
  role: string;
  entityType: string;
  entityId: string;
  permissions: string[];
}

/**
 * Resolve all external scope grants for a user.
 * Returns the list of entities and permissions the external user can access.
 */
export async function resolveExternalScope(
  tenantId: string,
  userId: string,
): Promise<ExternalScope[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT scope_id, user_id, role, entity_type, entity_id, permissions
     FROM "${schema}".external_user_scopes
     WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r: Record<string, unknown>) => {
    const row = r as {
      scope_id: string;
      user_id: string;
      role: string;
      entity_type: string;
      entity_id: string;
      permissions?: string[];
    };
    return {
      scopeId: row.scope_id,
      userId: row.user_id,
      role: row.role,
      entityType: row.entity_type,
      entityId: row.entity_id,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    };
  });
}

/**
 * Check if an external user has scope over a specific entity.
 */
export async function isWithinExternalScope(
  tenantId: string,
  userId: string,
  targetEntityType: string,
  targetEntityId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT 1 FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
     LIMIT 1`,
    [userId, targetEntityType, targetEntityId],
  );
  return rows.length > 0;
}

/**
 * Check if an external user has a specific permission on a specific entity.
 */
export async function hasExternalPermission(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
  permission: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT permissions FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
     LIMIT 1`,
    [userId, entityType, entityId],
  );
  if (rows.length === 0) return false;
  const perms: string[] = Array.isArray(rows[0].permissions) ? rows[0].permissions : [];
  return perms.includes(permission);
}

/**
 * Get all entity IDs of a given type that an external user can access.
 */
export async function getExternalEntityIds(
  tenantId: string,
  userId: string,
  entityType: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT entity_id FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2`,
    [userId, entityType],
  );
  return rows.map((r) => (r as Record<string, unknown>).entity_id as string);
}
