/**
 * Resolve which positions a user has direct scope over,
 * from user_role_assignments with scope_type = 'position'.
 */
export declare function resolvePositionScope(tenantId: string, userId: string): Promise<string[]>;
/**
 * Walk UP the position hierarchy (reports-to chain) from a given position
 * to the top of the reporting line. Returns all ancestor position IDs
 * including the starting position.
 */
export declare function getPositionHierarchy(tenantId: string, positionId: string): Promise<string[]>;
/**
 * Walk DOWN the position hierarchy to find all subordinate positions
 * (direct and indirect reports). Does NOT include the starting position.
 */
export declare function getSubordinatePositions(tenantId: string, positionId: string): Promise<string[]>;
/**
 * Check if a user's position scope includes a target position.
 * A position is "within scope" if:
 *   1. The user has a direct role-assignment for that position, OR
 *   2. The target is a subordinate of any position the user is assigned to.
 */
export declare function isWithinPositionScope(tenantId: string, userId: string, targetPositionId: string): Promise<boolean>;
/**
 * Get the department that a position belongs to.
 * Returns null if the position has no dept_id set.
 */
export declare function getPositionDepartment(tenantId: string, positionId: string): Promise<string | null>;
/**
 * Get all positions within a specific department.
 */
export declare function getPositionsByDepartment(tenantId: string, departmentId: string): Promise<string[]>;
/**
 * Get the direct reports-to position for a given position.
 * Returns null if the position is at the top of the hierarchy.
 */
export declare function getReportsToPosition(tenantId: string, positionId: string): Promise<string | null>;
