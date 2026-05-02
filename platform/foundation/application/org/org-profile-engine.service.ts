import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

export async function getOrgProfile(tenantId: string) {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".workspace_profile LIMIT 1`);
    return rows[0] ?? null;
  } catch {
    logger.warn(`[OrgProfileEngine] workspace_profile not available for tenant ${tenantId}`);
    return null;
  }
}

export async function updateOrgProfile(tenantId: string, updates: Record<string, unknown>) {
  const schema = tenantSchema(tenantId);
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const { rows } = await safeQuery(`UPDATE "${schema}".workspace_profile SET ${sets}, updated_at = NOW() RETURNING *`, Object.values(updates));
  return rows[0] ?? null;
}
