import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { logger } from '../../ports/logger.port.js';
import { eventBus } from '../../ports/events.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
const LOG_TAG = '[AI-AutoRemediation]';
const UNUSED_DAYS_THRESHOLD = parseInt(process.env.PERM_UNUSED_DAYS_THRESHOLD || '30', 10);
async function checkTenantOperatingMode(tenantId) {
    try {
        const { rows } = await safeQuery(`SELECT default_operation_mode FROM public.tenant_module_entitlements WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
        return rows[0]?.default_operation_mode || 'human_only';
    }
    catch {
        logger.warn(`${LOG_TAG} Could not read operating mode for ${tenantId}, defaulting to human_only`);
        return 'human_only';
    }
}
async function checkApprovalGate(schema, tenantId, actionType) {
    try {
        const { rows } = await safeQuery(`SELECT 1 FROM "${schema}".module_approval_matrices
       WHERE module_code = 'platform' AND action_type = $1 AND is_active = true
       AND requires_approval = true LIMIT 1`, [actionType]);
        return rows.length === 0;
    }
    catch {
        logger.warn(`${LOG_TAG} Approval gate check failed for ${tenantId}/${actionType}, blocking by default`);
        return false;
    }
}
export async function runAutoRemediation(tenantId, dryRun = true) {
    const schema = tenantSchema(tenantId);
    const actions = [];
    const opMode = await checkTenantOperatingMode(tenantId);
    if (opMode === 'human_only' && !dryRun) {
        logger.warn(`${LOG_TAG} Tenant ${tenantId} is in human_only mode — forcing dryRun=true`);
        dryRun = true;
    }
    if (!dryRun) {
        const canProceed = await checkApprovalGate(schema, tenantId, 'ai_auto_remediation');
        if (!canProceed) {
            logger.warn(`${LOG_TAG} Approval gate blocks non-dryRun remediation for ${tenantId}`);
            dryRun = true;
        }
    }
    await proposeUnusedPermissionDeactivation(schema, tenantId, actions, dryRun);
    await proposeActionItemsFromDrift(schema, tenantId, actions, dryRun);
    await proposeSoDRulesFromConflicts(schema, tenantId, actions, dryRun);
    const summary = {
        proposed: actions.length,
        autoApplied: actions.filter(a => a.applied).length,
        pendingApproval: actions.filter(a => a.requiresApproval && !a.applied).length,
    };
    logger.info(`${LOG_TAG} ${tenantId}: ${summary.proposed} proposed, ${summary.autoApplied} auto-applied, ${summary.pendingApproval} pending`);
    const report = { tenantId, timestamp: new Date().toISOString(), actions, summary };
    try {
        await safeQuery(`INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_auto_remediation', $1, 'info', 'platform')`, [JSON.stringify(report)]);
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to log remediation report for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (summary.proposed > 0) {
        swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'ai.remediation.completed',
            tenantId,
            severity: 'info',
            payload: summary,
        }), { tenantId, operation: 'eventBus:ai.remediation.completed' });
    }
    return report;
}
async function proposeUnusedPermissionDeactivation(schema, tenantId, actions, dryRun) {
    try {
        const { rows } = await safeQuery(`SELECT b.module_code, b.role_code, b.permission_code
       FROM "${schema}".module_role_permission_bindings b
       WHERE b.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".role_usage_audit rua
           WHERE rua.permission_code = b.permission_code
             AND rua.result = 'allowed'
             AND rua.created_at > NOW() - make_interval(days => $1)
         )
       LIMIT 50`, [Math.max(1, Math.min(UNUSED_DAYS_THRESHOLD, 365))]);
        for (const r of rows) {
            const action = {
                type: 'deactivate_permission',
                moduleCode: r.module_code,
                detail: `Permission "${r.permission_code}" for role "${r.role_code}" unused for ${UNUSED_DAYS_THRESHOLD}+ days`,
                applied: false,
                requiresApproval: true,
            };
            if (!dryRun) {
                try {
                    await safeQuery(`INSERT INTO "${schema}".action_items (module_code, title, description, status, priority, created_by)
             VALUES ($1, $2, $3, 'open', 'medium', 'ai-auto-remediation')`, [r.module_code, `Deactivate unused permission: ${r.permission_code}`, action.detail]);
                }
                catch (err) {
                    logger.warn(`${LOG_TAG} action_items insert failed: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            actions.push(action);
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} proposeUnusedPermissionDeactivation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function proposeActionItemsFromDrift(schema, _tenantId, actions, dryRun) {
    try {
        const { rows } = await safeQuery(`SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'rbac_drift_result'
       ORDER BY created_at DESC LIMIT 1`);
        if (rows.length === 0)
            return;
        const driftReport = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
        const criticalDrifts = (driftReport.drifts || []).filter((d) => d.severity === 'critical' || d.severity === 'high');
        for (const drift of criticalDrifts.slice(0, 20)) {
            const action = {
                type: 'create_action_item',
                moduleCode: drift.moduleCode || 'platform',
                detail: `Drift: ${drift.detail}. Fix: ${drift.suggestedFix}`,
                applied: false,
                requiresApproval: false,
            };
            if (!dryRun) {
                try {
                    await safeQuery(`INSERT INTO "${schema}".action_items (module_code, title, description, status, priority, created_by)
             VALUES ($1, $2, $3, 'open', $4, 'ai-auto-remediation')
             ON CONFLICT DO NOTHING`, [drift.moduleCode || 'platform', `RBAC Drift: ${drift.category}`, action.detail, drift.severity === 'critical' ? 'critical' : 'high']);
                    action.applied = true;
                }
                catch (err) {
                    logger.warn(`${LOG_TAG} drift action_items insert failed: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            actions.push(action);
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} proposeActionItemsFromDrift failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function proposeSoDRulesFromConflicts(schema, _tenantId, actions, _dryRun) {
    try {
        const { rows } = await safeQuery(`SELECT b1.role_code, b1.permission_code AS perm1, b2.permission_code AS perm2, b1.module_code
       FROM "${schema}".module_role_permission_bindings b1
       JOIN "${schema}".module_role_permission_bindings b2
         ON b1.module_code = b2.module_code AND b1.role_code = b2.role_code
         AND b1.permission_code < b2.permission_code
       WHERE b1.is_active = true AND b2.is_active = true
         AND b1.permission_code LIKE '%.write' AND b2.permission_code LIKE '%.approve'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".module_sod_rules s
           WHERE s.module_code = b1.module_code AND s.is_active = true
             AND s.conflicting_actions::text LIKE '%' || split_part(b1.permission_code, '.', 3) || '%'
         )
       LIMIT 20`);
        for (const r of rows) {
            actions.push({
                type: 'generate_sod_rule',
                moduleCode: r.module_code,
                detail: `Role "${r.role_code}" has both "${r.perm1}" and "${r.perm2}" — potential SoD violation. Consider adding SoD rule.`,
                applied: false,
                requiresApproval: true,
            });
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} proposeSoDRulesFromConflicts failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
export async function getLastRemediationReport(tenantId) {
    try {
        const schema = tenantSchema(tenantId);
        const { rows } = await safeQuery(`SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_auto_remediation'
       ORDER BY created_at DESC LIMIT 1`);
        if (rows.length > 0) {
            return (typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload);
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} getLastRemediationReport failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
}
//# sourceMappingURL=ai-auto-remediation.service.js.map