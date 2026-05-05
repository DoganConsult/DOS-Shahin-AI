// @ts-nocheck
import { logger } from '../../ports/logger.port';
// ============================================================================
// Personal Agent Auto-Assignment
//
// Automatically assigns personal agents when tenant mode changes
// to hyper or autonomous.
// ============================================================================
import { safeQuery } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { toErrorMessage } from '@dos/module-sdk';
import { assignPersonalAgent, getPersonalAgentAssignment, updatePersonalAgentAssignment, } from './personal-agent-assignment.service';
// ============================================================================
// Auto-Assignment When Tenant Mode Activates
// ============================================================================
/**
 * Auto-assign personal agents to all active users when tenant mode
 * changes to hyper/autonomous. Existing assignments are updated to
 * match the new activation mode.
 */
export async function autoAssignAgentsForTenantMode(tenantId, targetMode, activatedBy) {
    // Map platform mode to activation mode
    const activationModeMap = {
        'human': 'human',
        'hybrid': 'hyper',
        'shadow_agent': 'hyper',
        'full_autonomous': 'autonomous',
    };
    const activationMode = activationModeMap[targetMode] || 'human';
    // Get all active users in the tenant (users table is in public schema)
    const users = await safeQuery(`SELECT DISTINCT u.user_id, u.email, u.display_name
     FROM public.users u
     WHERE u.tenant_id = $1 AND u.is_active = true AND u.deleted_at IS NULL`, [tenantId]);
    let assignedCount = 0;
    for (const user of users.rows) {
        try {
            // Check if user already has an agent assigned
            const existing = await getPersonalAgentAssignment(tenantId, user.user_id);
            if (existing) {
                // Update existing assignment to match tenant mode
                await updatePersonalAgentAssignment(tenantId, user.user_id, existing.agentId, { activationMode }, activatedBy);
                continue;
            }
            // Auto-assign default agent (A01 - Compliance Assistant)
            await assignPersonalAgent(tenantId, user.user_id, 'A01', {
                agentNameEn: 'Personal Compliance Assistant',
                agentNameAr: '\u0645\u0633\u0627\u0639\u062f \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0627\u0644\u0634\u062e\u0635\u064a',
                activationMode,
                slaBasedActivation: true,
                slaThresholdHours: 24,
                allowedActionTypes: ['evidence_collection', 'task_reminder', 'status_update', 'compliance_check'],
                autoApproveBelowRisk: 'medium',
                createdBy: activatedBy,
            });
            assignedCount++;
        }
        catch (error) {
            logger.error(`[PersonalAgent] Failed to auto-assign agent for user ${user.user_id}: ${toErrorMessage(error)}`);
        }
    }
    await recordAudit({
        tenantId,
        userId: activatedBy,
        module: 'foundation',
        action: 'agents_auto_assigned',
        entityType: 'tenant_mode_activation',
        entityId: tenantId,
        afterState: { targetMode, activationMode, assignedCount },
    });
    return assignedCount;
}
//# sourceMappingURL=personal-agent-auto-assign.service.js.map