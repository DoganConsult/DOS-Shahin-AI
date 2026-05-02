// ============================================
// Asset Ownership Service
// Ownership assignment, transfer, history
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface AssignOwnerInput {
  entity_type: string;
  entity_id: string;
  owner_type: string;
  owner_user_id: string;
  notes?: string;
}

export async function getOwners(tenantId: string, entityType: string, entityId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT * FROM "${ts}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2 AND revoked_at IS NULL
    ORDER BY owner_type
  `, [entityType, entityId]);
  return rows;
}

export async function getOwnerHistory(tenantId: string, entityType: string, entityId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT * FROM "${ts}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
  `, [entityType, entityId]);
  return rows;
}

export async function assignOwner(tenantId: string, userId: string, input: AssignOwnerInput) {
  const ts = tenantSchema(tenantId);

  // Revoke previous active owner of same type
  await safeQuery(`
    UPDATE "${ts}".asset_owners
    SET revoked_at = NOW()
    WHERE entity_type = $1 AND entity_id = $2 AND owner_type = $3 AND revoked_at IS NULL
  `, [input.entity_type, input.entity_id, input.owner_type]);

  // Insert new ownership
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".asset_owners (entity_type, entity_id, owner_type, owner_user_id, assigned_by, notes)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [input.entity_type, input.entity_id, input.owner_type, input.owner_user_id, userId, input.notes || '']);

  emitEvent(({
      tenantId, userId, module: 'asset', event: 'owner_assigned',
      entityType: input.entity_type, entityId: input.entity_id,
      data: { ownerType: input.owner_type, ownerUserId: input.owner_user_id },
    } as any)).catch(catchHandler(EC.EVENT_BUS));

  return rows[0];
}

export async function revokeOwner(tenantId: string, userId: string, ownershipId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    UPDATE "${ts}".asset_owners SET revoked_at = NOW()
    WHERE ownership_id = $1 AND revoked_at IS NULL RETURNING *
  `, [ownershipId]);
  if (rows[0]) {
    emitEvent(({
          tenantId, userId, module: 'asset', event: 'owner_revoked',
          entityType: rows[0].entity_type, entityId: rows[0].entity_id,
          data: { ownerType: rows[0].owner_type, ownerUserId: rows[0].owner_user_id },
        } as any)).catch(catchHandler(EC.EVENT_BUS));
  }
  return rows[0] || null;
}

export async function transferOwner(tenantId: string, userId: string, entityType: string, entityId: string, ownerType: string, newOwnerId: string, notes?: string) {
  return assignOwner(tenantId, userId, { entity_type: entityType, entity_id: entityId, owner_type: ownerType, owner_user_id: newOwnerId, notes });
}

export async function getUnownedEntities(tenantId: string, entityType: string, page = 1, pageSize = 25) {
  const ts = tenantSchema(tenantId);
  const offset = (page - 1) * pageSize;
  const table = entityType === 'application' ? 'applications' : entityType === 'business_service' ? 'business_services' : 'assets';
  const idCol = entityType === 'application' ? 'application_id' : entityType === 'business_service' ? 'service_id' : 'asset_id';

  const countR = await safeQuery(`
    SELECT COUNT(*)::int AS total FROM "${ts}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
  `, [entityType]);
  const total = countR.rows[0]?.total || 0;

  const { rows } = await safeQuery(`
    SELECT e.* FROM "${ts}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
    ORDER BY e.created_at DESC LIMIT $2 OFFSET $3
  `, [entityType, pageSize, offset]);

  return { data: rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getOwnershipStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COUNT(DISTINCT CASE WHEN entity_type = 'asset' THEN entity_id END)::int AS owned_assets,
      COUNT(DISTINCT CASE WHEN entity_type = 'application' THEN entity_id END)::int AS owned_applications,
      COUNT(DISTINCT CASE WHEN entity_type = 'business_service' THEN entity_id END)::int AS owned_services,
      COUNT(DISTINCT owner_user_id)::int AS unique_owners
    FROM "${ts}".asset_owners WHERE revoked_at IS NULL
  `);
  return rows[0];
}
