/**
 * Resolve which teams a user has direct scope over,
 * from user_role_assignments with scope_type = 'team'.
 */
export declare function resolveTeamScope(tenantId: string, userId: string): Promise<string[]>;
/**
 * Get all teams a user is a member of via the team_members table.
 * Includes teams where the user is active (not left).
 */
export declare function resolveTeamMembership(tenantId: string, userId: string): Promise<{
    teamId: string;
    teamRole: string;
}[]>;
/**
 * Get all active members of a specific team from the team_members table.
 * Returns user IDs with their team roles.
 */
export declare function getTeamMembers(tenantId: string, teamId: string): Promise<{
    userId: string;
    teamRole: string;
}[]>;
/**
 * Expand a team scope to include child teams (via parent_team_id).
 * Returns the team and all descendant team IDs.
 */
export declare function expandTeamScope(tenantId: string, teamId: string): Promise<string[]>;
/**
 * Check if a user is within a target team's scope.
 * Considers both role-assignment scope and team_members membership,
 * plus child-team expansion for team leads.
 */
export declare function isWithinTeamScope(tenantId: string, userId: string, targetTeamId: string): Promise<boolean>;
/**
 * Get the department that a team belongs to.
 * Returns null if the team has no department_id set.
 */
export declare function getTeamDepartment(tenantId: string, teamId: string): Promise<string | null>;
/**
 * Get all teams under a specific department.
 */
export declare function getTeamsByDepartment(tenantId: string, departmentId: string): Promise<string[]>;
