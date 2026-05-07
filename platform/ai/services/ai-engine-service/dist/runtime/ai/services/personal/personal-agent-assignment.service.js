// @ts-nocheck
// ============================================================================
// Personal Agent Assignment Management
//
// CRUD operations for assigning dedicated agents to users.
// Agents inherit user roles and permissions.
// ============================================================================
import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service.js';
import { getFirstRow } from '@dos/db';
// ============================================================================
// Assignment CRUD
// ============================================================================
/**
 * Assign a dedicated agent to a user.
 * Agent inherits user roles and permissions.
 */
export async function assignPersonalAgent(tenantId, userId, agentId, config) {
    const schema = tenantSchema(tenantId);
    // Get user roles and permissions
    const userRoles = await getUserRoles(tenantId, userId);
    const userPermissions = await getUserPermissions(tenantId, userId);
    const assignmentId = uuid();
    const now = new Date().toISOString();
    await safeQuery(`INSERT INTO "${schema}".personal_agent_assignments
     (assignment_id, tenant_id, user_id, agent_id, agent_name_en, agent_name_ar,
      inherited_roles, inherited_permissions, activation_mode, sla_based_activation,
      sla_threshold_hours, sla_priority_filter, company_policy_rules, process_governance_rules,
      allowed_action_types, blocked_action_types, requires_approval_for, auto_approve_below_risk,
      metadata, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`, [
        assignmentId, tenantId, userId, agentId,
        config.agentNameEn || null,
        config.agentNameAr || null,
        JSON.stringify(userRoles),
        JSON.stringify(userPermissions),
        config.activationMode || 'human',
        config.slaBasedActivation || false,
        config.slaThresholdHours || null,
        config.slaPriorityFilter ? JSON.stringify(config.slaPriorityFilter) : null,
        JSON.stringify(config.companyPolicyRules || {}),
        JSON.stringify(config.processGovernanceRules || {}),
        JSON.stringify(config.allowedActionTypes || []),
        JSON.stringify(config.blockedActionTypes || []),
        JSON.stringify(config.requiresApprovalFor || []),
        config.autoApproveBelowRisk || 'low',
        JSON.stringify(config.metadata || {}),
        config.createdBy || userId,
        now, now,
    ]);
    await recordAudit({
        tenantId,
        userId: config.createdBy || userId,
        module: 'foundation',
        action: 'personal_agent_assigned',
        entityType: 'agent_assignment',
        entityId: assignmentId,
        afterState: { agentId, activationMode: config.activationMode || 'human' },
    });
    return (await getPersonalAgentAssignment(tenantId, userId, agentId));
}
/**
 * Get personal agent assignment for a user
 */
export async function getPersonalAgentAssignment(tenantId, userId, agentId) {
    const schema = tenantSchema(tenantId);
    const conditions = ['tenant_id = $1', 'user_id = $2', 'is_active = true'];
    const params = [tenantId, userId];
    if (agentId) {
        conditions.push('agent_id = $3');
        params.push(agentId);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".personal_agent_assignments
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 1`, params);
    if (!result.rows.length)
        return null;
    return mapAssignmentRow(getFirstRow(result));
}
/**
 * Update personal agent assignment
 */
export async function updatePersonalAgentAssignment(tenantId, userId, agentId, updates, updatedBy) {
    const schema = tenantSchema(tenantId);
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    if (updates.activationMode !== undefined) {
        updateFields.push(`activation_mode = $${paramIndex++}`);
        updateValues.push(updates.activationMode);
    }
    if (updates.slaBasedActivation !== undefined) {
        updateFields.push(`sla_based_activation = $${paramIndex++}`);
        updateValues.push(updates.slaBasedActivation);
    }
    if (updates.slaThresholdHours !== undefined) {
        updateFields.push(`sla_threshold_hours = $${paramIndex++}`);
        updateValues.push(updates.slaThresholdHours);
    }
    if (updates.allowedActionTypes !== undefined) {
        updateFields.push(`allowed_action_types = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.allowedActionTypes));
    }
    if (updates.blockedActionTypes !== undefined) {
        updateFields.push(`blocked_action_types = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.blockedActionTypes));
    }
    if (updates.isEnabled !== undefined) {
        updateFields.push(`is_enabled = $${paramIndex++}`);
        updateValues.push(updates.isEnabled);
    }
    if (updates.userConsentGranted !== undefined) {
        updateFields.push(`user_consent_granted = $${paramIndex++}`);
        updateValues.push(updates.userConsentGranted);
        if (updates.userConsentGranted) {
            updateFields.push(`consent_granted_at = NOW()`);
        }
    }
    updateFields.push(`updated_at = NOW()`, `updated_by = $${paramIndex++}`);
    updateValues.push(updatedBy);
    updateValues.push(tenantId, userId, agentId);
    await safeQuery(`UPDATE "${schema}".personal_agent_assignments
     SET ${updateFields.join(', ')}
     WHERE tenant_id = $${paramIndex++} AND user_id = $${paramIndex++} AND agent_id = $${paramIndex++}`, updateValues);
    await recordAudit({
        tenantId,
        userId: updatedBy,
        module: 'foundation',
        action: 'personal_agent_updated',
        entityType: 'agent_assignment',
        entityId: agentId,
        afterState: updates,
    });
    return (await getPersonalAgentAssignment(tenantId, userId, agentId));
}
// ============================================================================
// Internal Helpers
// ============================================================================
/** Fetch user roles from the tenant schema */
export async function getUserRoles(tenantId, userId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT role FROM "${schema}".users WHERE user_id = $1`, [userId]);
        return getFirstRow(result)?.role ? [getFirstRow(result)?.role] : [];
    }
    catch {
        return [];
    }
}
/** Fetch user permissions from the tenant schema via dynamic RBAC bindings */
export async function getUserPermissions(tenantId, userId) {
    const schema = tenantSchema(tenantId);
    const permissions = new Set();
    try {
        const { rows } = await safeQuery(`SELECT DISTINCT b.permission_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".module_role_definitions rd
         ON rd.role_code = ura.role_id AND rd.is_active = true
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = rd.module_code AND b.role_code = rd.role_code AND b.is_active = true
       WHERE ura.user_id = $1 AND ura.active = true`, [userId]);
        for (const r of rows)
            permissions.add(r.permission_code);
        if (permissions.size > 0)
            return Array.from(permissions);
    }
    catch { /* dynamic RBAC tables may not exist */ }
    try {
        const { rows } = await safeQuery(`SELECT DISTINCT b.permission_code
       FROM "${schema}".enterprise_user_role_assignments eura
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = eura.module_code AND b.role_code = eura.functional_role_code AND b.is_active = true
       WHERE eura.user_id = $1 AND eura.is_active = true`, [userId]);
        for (const r of rows)
            permissions.add(r.permission_code);
        if (permissions.size > 0)
            return Array.from(permissions);
    }
    catch { /* enterprise tables may not exist */ }
    try {
        const roles = await getUserRoles(tenantId, userId);
        if (roles.length > 0) {
            const { rows } = await safeQuery(`SELECT permission_code, allowed_roles FROM "${schema}".authorization_permissions`);
            for (const r of rows) {
                const allowedRoles = r.allowed_roles || [];
                if (roles.some(role => allowedRoles.includes(role))) {
                    permissions.add(r.permission_code);
                }
            }
        }
    }
    catch { /* legacy table may not exist */ }
    return Array.from(permissions);
}
/** Map a database row to a PersonalAgentAssignment object */
export function mapAssignmentRow(row) {
    return {
        assignmentId: row.assignment_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        agentId: row.agent_id,
        agentNameEn: row.agent_name_en,
        agentNameAr: row.agent_name_ar,
        inheritedRoles: typeof row.inherited_roles === 'string' ? JSON.parse(row.inherited_roles) : row.inherited_roles,
        inheritedPermissions: typeof row.inherited_permissions === 'string' ? JSON.parse(row.inherited_permissions) : row.inherited_permissions,
        activationMode: row.activation_mode,
        slaBasedActivation: row.sla_based_activation,
        slaThresholdHours: row.sla_threshold_hours,
        slaPriorityFilter: row.sla_priority_filter ? (typeof row.sla_priority_filter === 'string' ? JSON.parse(row.sla_priority_filter) : row.sla_priority_filter) : undefined,
        companyPolicyRules: typeof row.company_policy_rules === 'string' ? JSON.parse(row.company_policy_rules) : row.company_policy_rules,
        processGovernanceRules: typeof row.process_governance_rules === 'string' ? JSON.parse(row.process_governance_rules) : row.process_governance_rules,
        allowedActionTypes: typeof row.allowed_action_types === 'string' ? JSON.parse(row.allowed_action_types) : row.allowed_action_types,
        blockedActionTypes: typeof row.blocked_action_types === 'string' ? JSON.parse(row.blocked_action_types) : row.blocked_action_types,
        requiresApprovalFor: typeof row.requires_approval_for === 'string' ? JSON.parse(row.requires_approval_for) : row.requires_approval_for,
        autoApproveBelowRisk: row.auto_approve_below_risk,
        isActive: row.is_active,
        isEnabled: row.is_enabled,
        lastActivityAt: row.last_activity_at,
        totalActionsExecuted: row.total_actions_executed || 0,
        totalActionsApproved: row.total_actions_approved || 0,
        totalActionsRejected: row.total_actions_rejected || 0,
        userConsentGranted: row.user_consent_granted,
        consentGrantedAt: row.consent_granted_at,
        consentPurpose: row.consent_purpose,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=personal-agent-assignment.service.js.map