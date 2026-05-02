/**
 * DAuth IAM Integration — manages external IAM connections and sync.
 * Tables: iam_connections, iam_identities, iam_access_reviews, iam_sync_history,
 *         external_user_scopes
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── iam_connections ──

export async function listIamConnections(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".iam_connections WHERE is_active = TRUE ORDER BY provider_name`, []);
  return result.rows;
}

export async function getIamConnection(tenantId: string, connectionId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".iam_connections WHERE connection_id = $1`, [connectionId]);
  return getFirstRow(result);
}

export async function createIamConnection(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".iam_connections (provider_name, provider_type, config, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4) RETURNING *`,
    [data.provider_name, data.provider_type, JSON.stringify(data.config || {}), data.created_by],
  );
  return getFirstRow(result);
}

export async function updateIamConnectionStatus(tenantId: string, connectionId: string, isActive: boolean): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".iam_connections SET is_active = $2, updated_at = NOW() WHERE connection_id = $1 RETURNING *`,
    [connectionId, isActive],
  );
  return getFirstRow(result);
}

// ── iam_identities ──

export async function listIamIdentities(tenantId: string, connectionId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".iam_identities WHERE connection_id = $1 ORDER BY external_username`, [connectionId]);
  return result.rows;
}

export async function linkIamIdentity(
  tenantId: string, connectionId: string, userId: string, externalId: string, externalUsername: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".iam_identities (connection_id, user_id, external_id, external_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (connection_id, user_id) DO UPDATE SET external_id = $3, external_username = $4, updated_at = NOW()
     RETURNING *`,
    [connectionId, userId, externalId, externalUsername],
  );
  return getFirstRow(result);
}

// ── iam_access_reviews ──

export async function listIamAccessReviews(tenantId: string, connectionId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".iam_access_reviews WHERE connection_id = $1 ORDER BY created_at DESC`, [connectionId]);
  return result.rows;
}

// ── iam_sync_history ──

export async function logIamSync(
  tenantId: string, connectionId: string, status: string, usersProcessed: number, errors: unknown[] = [],
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".iam_sync_history (connection_id, status, users_processed, errors)
     VALUES ($1, $2, $3, $4)`,
    [connectionId, status, usersProcessed, JSON.stringify(errors)],
  );
}

export async function getIamSyncHistory(tenantId: string, connectionId: string, limit = 20): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".iam_sync_history WHERE connection_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [connectionId, limit],
  );
  return result.rows;
}
