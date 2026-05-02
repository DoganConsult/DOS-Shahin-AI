/**
 * DAuth Position Scope Adapter — resolves position scope from DOS foundation tables.
 * Queries: positions table (reports_to_position_id chain for hierarchy).
 */
import { safeQuery, tenantSchema } from '@dos/db';

/**
 * Resolve which positions a user has direct scope over,
 * from user_role_assignments with scope_type = 'position'.
 */
export async function resolvePositionScope(
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT DISTINCT scope_id FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND scope_type = 'position' AND active = TRUE`,
    [userId],
  );
  return rows.map((r: any) => r.scope_id as string);
}

/**
 * Walk UP the position hierarchy (reports-to chain) from a given position
 * to the top of the reporting line. Returns all ancestor position IDs
 * including the starting position.
 */
export async function getPositionHierarchy(
  tenantId: string,
  positionId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `WITH RECURSIVE chain AS (
       SELECT position_id::text, reports_to_position_id::text
       FROM "${schema}".positions WHERE position_id::text = $1 AND status = 'active'
       UNION ALL
       SELECT p.position_id::text, p.reports_to_position_id::text
       FROM "${schema}".positions p
       JOIN chain c ON p.position_id::text = c.reports_to_position_id
       WHERE p.status = 'active'
     )
     SELECT position_id FROM chain`,
    [positionId],
  );
  return rows.map((r: any) => r.position_id as string);
}

/**
 * Walk DOWN the position hierarchy to find all subordinate positions
 * (direct and indirect reports). Does NOT include the starting position.
 */
export async function getSubordinatePositions(
  tenantId: string,
  positionId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `WITH RECURSIVE subs AS (
       SELECT position_id::text FROM "${schema}".positions
       WHERE reports_to_position_id::text = $1 AND status = 'active'
       UNION ALL
       SELECT p.position_id::text FROM "${schema}".positions p
       JOIN subs s ON p.reports_to_position_id::text = s.position_id
       WHERE p.status = 'active'
     )
     SELECT position_id FROM subs`,
    [positionId],
  );
  return rows.map((r: any) => r.position_id as string);
}

/**
 * Check if a user's position scope includes a target position.
 * A position is "within scope" if:
 *   1. The user has a direct role-assignment for that position, OR
 *   2. The target is a subordinate of any position the user is assigned to.
 */
export async function isWithinPositionScope(
  tenantId: string,
  userId: string,
  targetPositionId: string,
): Promise<boolean> {
  const positions = await resolvePositionScope(tenantId, userId);
  if (positions.includes(targetPositionId)) return true;

  for (const posId of positions) {
    const subs = await getSubordinatePositions(tenantId, posId);
    if (subs.includes(targetPositionId)) return true;
  }
  return false;
}

/**
 * Get the department that a position belongs to.
 * Returns null if the position has no dept_id set.
 */
export async function getPositionDepartment(
  tenantId: string,
  positionId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT dept_id::text FROM "${schema}".positions
     WHERE position_id::text = $1 AND status = 'active'`,
    [positionId],
  );
  return rows.length > 0 ? rows[0].dept_id : null;
}

/**
 * Get all positions within a specific department.
 */
export async function getPositionsByDepartment(
  tenantId: string,
  departmentId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT position_id::text FROM "${schema}".positions
     WHERE dept_id::text = $1 AND status = 'active'`,
    [departmentId],
  );
  return rows.map((r: any) => r.position_id as string);
}

/**
 * Get the direct reports-to position for a given position.
 * Returns null if the position is at the top of the hierarchy.
 */
export async function getReportsToPosition(
  tenantId: string,
  positionId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT reports_to_position_id::text FROM "${schema}".positions
     WHERE position_id::text = $1 AND status = 'active'`,
    [positionId],
  );
  return rows.length > 0 ? rows[0].reports_to_position_id : null;
}
