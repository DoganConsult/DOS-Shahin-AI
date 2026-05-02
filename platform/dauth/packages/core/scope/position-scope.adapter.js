"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePositionScope = resolvePositionScope;
exports.getPositionHierarchy = getPositionHierarchy;
exports.getSubordinatePositions = getSubordinatePositions;
exports.isWithinPositionScope = isWithinPositionScope;
exports.getPositionDepartment = getPositionDepartment;
exports.getPositionsByDepartment = getPositionsByDepartment;
exports.getReportsToPosition = getReportsToPosition;
/**
 * DAuth Position Scope Adapter — resolves position scope from DOS foundation tables.
 * Queries: positions table (reports_to_position_id chain for hierarchy).
 */
const db_1 = require("@dos/db");
/**
 * Resolve which positions a user has direct scope over,
 * from user_role_assignments with scope_type = 'position'.
 */
async function resolvePositionScope(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT DISTINCT scope_id FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND scope_type = 'position' AND active = TRUE`, [userId]);
    return rows.map((r) => r.scope_id);
}
/**
 * Walk UP the position hierarchy (reports-to chain) from a given position
 * to the top of the reporting line. Returns all ancestor position IDs
 * including the starting position.
 */
async function getPositionHierarchy(tenantId, positionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`WITH RECURSIVE chain AS (
       SELECT position_id::text, reports_to_position_id::text
       FROM "${schema}".positions WHERE position_id::text = $1 AND status = 'active'
       UNION ALL
       SELECT p.position_id::text, p.reports_to_position_id::text
       FROM "${schema}".positions p
       JOIN chain c ON p.position_id::text = c.reports_to_position_id
       WHERE p.status = 'active'
     )
     SELECT position_id FROM chain`, [positionId]);
    return rows.map((r) => r.position_id);
}
/**
 * Walk DOWN the position hierarchy to find all subordinate positions
 * (direct and indirect reports). Does NOT include the starting position.
 */
async function getSubordinatePositions(tenantId, positionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`WITH RECURSIVE subs AS (
       SELECT position_id::text FROM "${schema}".positions
       WHERE reports_to_position_id::text = $1 AND status = 'active'
       UNION ALL
       SELECT p.position_id::text FROM "${schema}".positions p
       JOIN subs s ON p.reports_to_position_id::text = s.position_id
       WHERE p.status = 'active'
     )
     SELECT position_id FROM subs`, [positionId]);
    return rows.map((r) => r.position_id);
}
/**
 * Check if a user's position scope includes a target position.
 * A position is "within scope" if:
 *   1. The user has a direct role-assignment for that position, OR
 *   2. The target is a subordinate of any position the user is assigned to.
 */
async function isWithinPositionScope(tenantId, userId, targetPositionId) {
    const positions = await resolvePositionScope(tenantId, userId);
    if (positions.includes(targetPositionId))
        return true;
    for (const posId of positions) {
        const subs = await getSubordinatePositions(tenantId, posId);
        if (subs.includes(targetPositionId))
            return true;
    }
    return false;
}
/**
 * Get the department that a position belongs to.
 * Returns null if the position has no dept_id set.
 */
async function getPositionDepartment(tenantId, positionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT dept_id::text FROM "${schema}".positions
     WHERE position_id::text = $1 AND status = 'active'`, [positionId]);
    return rows.length > 0 ? rows[0].dept_id : null;
}
/**
 * Get all positions within a specific department.
 */
async function getPositionsByDepartment(tenantId, departmentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT position_id::text FROM "${schema}".positions
     WHERE dept_id::text = $1 AND status = 'active'`, [departmentId]);
    return rows.map((r) => r.position_id);
}
/**
 * Get the direct reports-to position for a given position.
 * Returns null if the position is at the top of the hierarchy.
 */
async function getReportsToPosition(tenantId, positionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT reports_to_position_id::text FROM "${schema}".positions
     WHERE position_id::text = $1 AND status = 'active'`, [positionId]);
    return rows.length > 0 ? rows[0].reports_to_position_id : null;
}
//# sourceMappingURL=position-scope.adapter.js.map