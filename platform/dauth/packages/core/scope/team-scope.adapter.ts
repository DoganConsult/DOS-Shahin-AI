/**
 * DAuth Team Scope Adapter — resolves team scope from DOS foundation tables.
 * Queries: teams, team_members tables for membership and hierarchy.
 */
import { safeQuery, tenantSchema } from '@dos/db';

/**
 * Resolve which teams a user has direct scope over,
 * from user_role_assignments with scope_type = 'team'.
 */
export async function resolveTeamScope(
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT DISTINCT scope_id FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND scope_type = 'team' AND active = TRUE`,
    [userId],
  );
  return rows.map((r: any) => r.scope_id as string);
}

/**
 * Get all teams a user is a member of via the team_members table.
 * Includes teams where the user is active (not left).
 */
export async function resolveTeamMembership(
  tenantId: string,
  userId: string,
): Promise<{ teamId: string; teamRole: string }[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT tm.team_id::text, tm.team_role
     FROM "${schema}".team_members tm
     WHERE tm.user_id = $1 AND tm.active = TRUE AND tm.left_at IS NULL`,
    [userId],
  );
  return rows.map((r: any) => ({ teamId: r.team_id as string, teamRole: r.team_role as string }));
}

/**
 * Get all active members of a specific team from the team_members table.
 * Returns user IDs with their team roles.
 */
export async function getTeamMembers(
  tenantId: string,
  teamId: string,
): Promise<{ userId: string; teamRole: string }[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT tm.user_id, tm.team_role
     FROM "${schema}".team_members tm
     WHERE tm.team_id::text = $1 AND tm.active = TRUE AND tm.left_at IS NULL`,
    [teamId],
  );
  return rows.map((r: any) => ({ userId: r.user_id as string, teamRole: r.team_role as string }));
}

/**
 * Expand a team scope to include child teams (via parent_team_id).
 * Returns the team and all descendant team IDs.
 */
export async function expandTeamScope(
  tenantId: string,
  teamId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `WITH RECURSIVE team_tree AS (
       SELECT team_id::text FROM "${schema}".teams WHERE team_id::text = $1 AND active = TRUE
       UNION ALL
       SELECT t.team_id::text FROM "${schema}".teams t
       JOIN team_tree tt ON t.parent_team_id::text = tt.team_id
       WHERE t.active = TRUE
     )
     SELECT team_id FROM team_tree`,
    [teamId],
  );
  return rows.map((r: any) => r.team_id as string);
}

/**
 * Check if a user is within a target team's scope.
 * Considers both role-assignment scope and team_members membership,
 * plus child-team expansion for team leads.
 */
export async function isWithinTeamScope(
  tenantId: string,
  userId: string,
  targetTeamId: string,
): Promise<boolean> {
  // Check direct role-assignment scope
  const assignedTeams = await resolveTeamScope(tenantId, userId);
  if (assignedTeams.includes(targetTeamId)) return true;

  // Expand assigned teams to include children
  for (const teamId of assignedTeams) {
    const expanded = await expandTeamScope(tenantId, teamId);
    if (expanded.includes(targetTeamId)) return true;
  }

  // Check team_members table for direct membership
  const membership = await resolveTeamMembership(tenantId, userId);
  if (membership.some(m => m.teamId === targetTeamId)) return true;

  return false;
}

/**
 * Get the department that a team belongs to.
 * Returns null if the team has no department_id set.
 */
export async function getTeamDepartment(
  tenantId: string,
  teamId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT department_id::text FROM "${schema}".teams
     WHERE team_id::text = $1 AND active = TRUE`,
    [teamId],
  );
  return rows.length > 0 ? rows[0].department_id : null;
}

/**
 * Get all teams under a specific department.
 */
export async function getTeamsByDepartment(
  tenantId: string,
  departmentId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT team_id::text FROM "${schema}".teams
     WHERE department_id::text = $1 AND active = TRUE`,
    [departmentId],
  );
  return rows.map((r: any) => r.team_id as string);
}
