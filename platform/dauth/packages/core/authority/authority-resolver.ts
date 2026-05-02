/**
 * DAuth AuthorityResolver — resolves decision authority levels.
 * §7.4: approve_low, approve_high, publish_policy, close_finding, override, etc.
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

export async function getUserAuthorityLevel(tenantId: string, userId: string): Promise<{ levelCode: string; rank: number } | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT al.level_code, al.rank FROM "${schema}".authority_levels al
     JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
     WHERE ura.user_id = $1 AND ura.is_active = TRUE ORDER BY al.rank DESC LIMIT 1`,
    [userId],
  );
  const row: any = result.rows[0];
  return row ? { levelCode: row.level_code as string, rank: Number(row.rank) } : null;
}

export async function hasAuthority(tenantId: string, userId: string, requiredLevel: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const user = await getUserAuthorityLevel(tenantId, userId);
  if (!user) return false;
  const required = await safeQuery(
    `SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1`,
    [requiredLevel],
  );
  const reqRow: any = required.rows[0];
  return user.rank >= (reqRow?.rank ?? 999);
}

/**
 * Return ALL authority levels the user holds (not just highest),
 * sorted by rank descending.
 */
export async function getAuthorityChain(
  tenantId: string,
  userId: string,
): Promise<{ levelCode: string; rank: number }[]> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.authority: resolving full authority chain', { tenantId, userId });

  const result = await safeQuery(
    `SELECT DISTINCT al.level_code, al.rank
     FROM "${schema}".authority_levels al
     JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
     ORDER BY al.rank DESC`,
    [userId],
  );

  return result.rows.map((r: any) => ({ levelCode: r.level_code as string, rank: Number(r.rank) }));
}

/**
 * List all defined authority levels for a tenant (for admin UI / configuration).
 * Returns levels sorted by rank descending (highest authority first).
 */
export async function getAuthorityLevels(
  tenantId: string,
): Promise<{ levelCode: string; rank: number; label: string | null }[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT level_code, rank, label
     FROM "${schema}".authority_levels
     ORDER BY rank DESC`,
    [],
  );

  return result.rows.map((r: any) => ({ levelCode: r.level_code as string, rank: Number(r.rank), label: (r.label as string) ?? null }));
}

/**
 * Return all users who hold the required authority level or higher.
 * Useful for building approval chains and escalation paths.
 */
export async function resolveApprovalChain(
  tenantId: string,
  requiredLevel: string,
): Promise<{ userId: string; levelCode: string; rank: number }[]> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.authority: resolving approval chain', { tenantId, requiredLevel });

  const result = await safeQuery(
    `SELECT ura.user_id, al.level_code, al.rank
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".authority_levels al ON ura.authority_level_code = al.level_code
     WHERE ura.is_active = TRUE
       AND al.rank >= (SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1)
     ORDER BY al.rank DESC`,
    [requiredLevel],
  );

  return result.rows.map((r: any) => ({ userId: r.user_id as string, levelCode: r.level_code as string, rank: Number(r.rank) }));
}

/**
 * Check if user holds ANY of the required authority levels.
 * Returns true if at least one match is found.
 */
export async function hasAnyAuthority(
  tenantId: string,
  userId: string,
  requiredLevels: string[],
): Promise<boolean> {
  if (requiredLevels.length === 0) return false;

  const schema = tenantSchema(tenantId);
  const placeholders = requiredLevels.map((_, i) => `$${i + 2}`).join(', ');

  const result = await safeQuery(
    `SELECT 1 FROM "${schema}".user_role_assignments ura
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
       AND ura.authority_level_code IN (${placeholders})
     LIMIT 1`,
    [userId, ...requiredLevels],
  );

  return result.rows.length > 0;
}
