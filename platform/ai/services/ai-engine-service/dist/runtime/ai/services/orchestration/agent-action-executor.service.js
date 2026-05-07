// @ts-nocheck
import { logger } from '../../ports/logger.port.js';
import { getAgentRbacEntry } from '../../ports/platform.port.js';
/**
 * Agent Action Executor Service
 *
 * Executes individual actions produced by AI agents. Handles all action
 * types including task creation, notifications, risk flagging, vendor
 * cross-agent propagation, and observation recording.
 *
 * Extracted from agent-runner.service.ts for maintainability.
 */
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port.js';
/** Resolve a role code to the first matching user (DOS foundation scope, per ownership split). */
async function resolveAssigneeToUserId(tenantId, opts) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`SELECT ura.user_id FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".functional_roles fr ON fr.id = ura.functional_role_id
     WHERE fr.code = $1 AND ura.is_active = TRUE
     ORDER BY ura.created_at ASC LIMIT 1`, [opts.roleCode]);
    return res.rows[0]?.user_id || null;
}
import { createNotification } from '../../../notification/services/notification.service.js';
import { eventBus } from '../../ports/events.port.js';
import { evaluateDelegation } from '../../../governance/services/misc/delegation-rules.service.js';
import { hasOpenConflict } from './agent-cooperation.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallowNull, swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Resolve which user to notify (first user with matching role) ────────────
export async function resolveAssignee(tenantId, role) {
    if (!role)
        return null;
    return swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, { roleCode: role }), { tenantId: tenantId, operation: 'fallback query' });
}
export async function resolveUserPermissions(tenantId, userId) {
    try {
        const result = await safeQuery(`SELECT role FROM users WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`, [tenantId, userId]);
        const role = getFirstRow(result)?.role || '';
        const ROLE_PERMISSIONS = {
            admin: ['workspace.config.write', 'users.account.manage', 'framework.record.manage', 'control.record.write', 'evidence.item.write', 'compliance.program.write', 'risk.record.write', 'policy.document.write', 'vendor.record.write', 'report.document.write', 'audit.record.manage', 'journey.record.write', 'profile.record.write', 'procedure.document.write', 'task.item.write'],
            owner: ['workspace.config.write', 'users.account.manage', 'framework.record.manage', 'control.record.write', 'evidence.item.write', 'compliance.program.write', 'risk.record.write', 'policy.document.write', 'vendor.record.write', 'report.document.write', 'audit.record.manage', 'journey.record.write', 'profile.record.write', 'procedure.document.write', 'task.item.write'],
            ciso: ['framework.record.manage', 'control.record.write', 'evidence.item.write', 'compliance.program.write', 'risk.record.write', 'policy.document.write', 'vendor.record.write', 'report.document.write', 'audit.record.manage'],
            compliance_officer: ['framework.record.manage', 'control.record.write', 'evidence.item.write', 'compliance.program.write', 'policy.document.write', 'report.document.write'],
            risk_manager: ['risk.record.write', 'vendor.record.write', 'report.document.write'],
            auditor: ['report.document.write', 'audit.record.manage', 'evidence.item.write'],
            viewer: [],
        };
        return ROLE_PERMISSIONS[role] || [];
    }
    catch {
        return [];
    }
}
export function getDefaultAgentPermissions(agentId) {
    const entry = getAgentRbacEntry(agentId);
    return entry?.permissions || [];
}
// ── Execute a single action produced by an agent ───────────────────────────
export async function executeAction(tenantId, agentId, action, runId) {
    // ── TENANT PLATFORM MODE GUARDRAILS (Law 2) ──
    try {
        const modeRes = await safeQuery(`SELECT config->>'mode' as mode FROM dos.tenants WHERE tenant_id = $1`, [tenantId]);
        const platformMode = modeRes.rows[0]?.mode || 'manual';
        if (platformMode === 'manual') {
            logger.info(`[AgentRunner] Action blocked: Tenant ${tenantId} is in manual mode. Observe only.`);
            return;
        }
        if (platformMode === 'hybrid') {
            const allowedPriorities = ['low', undefined];
            if (!allowedPriorities.includes(action.priority)) {
                logger.info(`[AgentRunner] Action queued: Hybrid mode stops non-low priority execution for ${agentId}. Pushing to review queue.`);
                action._forceQueue = true;
            }
        }
    }
    catch (err) {
        logger.warn('[AgentRunner] Failed to fetch tenant platform mode. Failing safely back to manual mode constraints.');
        return;
    }
    // Delegation validation: ensure agent respects time windows, daily limits, and risk caps
    try {
        const delegationCheck = await evaluateDelegation(tenantId, 'system', agentId, action.type, action.payload?.riskLevel || 'medium');
        if (!delegationCheck.allowed) {
            logger.info(`[AgentRunner] Delegation blocked ${agentId}/${action.type}: ${delegationCheck.reason}`);
            return;
        }
    }
    catch {
        // Delegation rules table may not exist yet — allow action (graceful degradation)
    }
    // Feature 17: Block execution if there's an open conflict for this entity
    if (action.entityType && action.entityId) {
        const conflictExists = await hasOpenConflict(tenantId, action.entityType, action.entityId);
        if (conflictExists) {
            logger.info(`[AgentRunner] Blocked action ${action.type} for ${action.entityType}/${action.entityId} due to open conflict`);
            return;
        }
    }
    // Feature 20: Check sensitivity levels for high-risk AI processing
    if (action.entityType && action.entityId) {
        const schema = tenantSchema(tenantId);
        let sensitivityLevel = null;
        let dataClassification = null;
        let entityTitle = null;
        try {
            // Check risk sensitivity level
            if (action.entityType === 'risk') {
                const riskResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT sensitivity_level, title FROM "${schema}".risks WHERE risk_id = $1`, [action.entityId]), { tenantId: tenantId, operation: 'query risks' });
                if (riskResult.rows.length > 0) {
                    sensitivityLevel = getFirstRow(riskResult)?.sensitivity_level || 'normal';
                    entityTitle = getFirstRow(riskResult)?.title || null;
                }
            }
            // Check control data classification
            if (action.entityType === 'control') {
                const controlResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT data_classification, title FROM "${schema}".ucf_controls WHERE control_id = $1`, [action.entityId]), { tenantId: tenantId, operation: 'query ucf_controls' });
                if (controlResult.rows.length > 0) {
                    dataClassification = getFirstRow(controlResult)?.data_classification || 'internal';
                    entityTitle = getFirstRow(controlResult)?.title || null;
                }
            }
            // Trigger DPIA check if high-risk conditions are met
            if ((sensitivityLevel === 'high' || sensitivityLevel === 'restricted') ||
                (dataClassification === 'restricted' || dataClassification === 'confidential')) {
                logger.info(`[AgentRunner] Feature 20: High-risk AI processing detected for ${action.entityType}/${action.entityId} (sensitivity: ${sensitivityLevel}, classification: ${dataClassification})`);
                await eventBus.publish({
                    eventType: 'privacy.impact_high',
                    tenantId,
                    sourceService: `agent-runner-${agentId}`,
                    severity: 'warning',
                    entityType: action.entityType,
                    entityId: action.entityId,
                    payload: {
                        processingActivity: entityTitle || `${action.entityType} ${action.entityId}`,
                        sensitivityLevel: sensitivityLevel || 'normal',
                        dataClassification: dataClassification || 'internal',
                        agentId,
                        actionType: action.type,
                        description: action.description,
                    },
                });
            }
        }
        catch (err) {
            // Log but don't block action execution if sensitivity check fails
            logger.warn(`[AgentRunner] Feature 20: Failed to check sensitivity for ${action.entityType}/${action.entityId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    const _dueDate = action.dueInDays
        ? new Date(Date.now() + action.dueInDays * 86_400_000).toISOString().split('T')[0]
        : undefined;
    const schema = tenantSchema(tenantId);
    switch (action.type) {
        case 'create_task':
        case 'flag_risk':
        case 'request_evidence': {
            // Route through RACI -> team -> member via process orchestration
            const taskTypeMap = {
                create_task: 'remediation',
                flag_risk: 'risk_assessment',
                request_evidence: 'evidence_request',
            };
            try {
                const { createProcessTask } = await import('@dos/platform-core/workflows');
                await createProcessTask(tenantId, {
                    title: `[${agentId}] ${action.title}`,
                    description: action.description,
                    taskType: (taskTypeMap[action.type] ?? 'remediation'),
                    priority: (action.priority) ?? 'medium',
                    entityType: action.entityType,
                    entityId: action.entityId,
                    dueInHours: action.dueInDays ? action.dueInDays * 24 : undefined,
                    triggerSource: `agent_${agentId}`,
                    triggerData: { agentId, actionType: action.type },
                    createdBy: `agent-${agentId}`,
                });
            }
            catch (orchErr) {
                logger.error(`[AgentRunner] createProcessTask FAILED for ${agentId} (${action.type}): ${toErrorMessage(orchErr)}`);
            }
            break;
        }
        case 'send_notification': {
            const notifyTarget = await swallowNull(EC.FALLBACK_QUERY, resolveAssignee(tenantId, action.assignToRole), { tenantId: tenantId, operation: 'fallback query' });
            if (notifyTarget) {
                await createNotification(tenantId, {
                    userId: notifyTarget,
                    type: `agent_${agentId.toLowerCase()}`,
                    title: `[${agentId}] ${action.title}`,
                    body: action.description,
                    link: action.entityType ? `/${action.entityType}s` : null,
                });
            }
            break;
        }
        case 'publish_event': {
            await eventBus.publish({
                eventType: `agent.action_proposed`,
                tenantId,
                sourceService: `agent-runner-${agentId}`,
                severity: action.priority === 'critical' ? 'critical' : action.priority === 'high' ? 'warning' : 'info',
                entityType: action.entityType,
                entityId: action.entityId,
                payload: { agentId, title: action.title, description: action.description, priority: action.priority },
            });
            break;
        }
        case 'create_control': {
            await safeQuery(`INSERT INTO "${schema}".controls (control_id, title, description, status, owner, created_at)
         VALUES ($1, $2, $3, 'draft', $4, NOW())`, [`CTRL-${Date.now().toString(36)}`, `[${agentId}] ${action.title}`, action.description, 'agent']);
            break;
        }
        case 'update_risk_score': {
            if (action.entityId) {
                await safeQuery(`UPDATE "${schema}".risks SET risk_score = $1, ai_assessment = $2, updated_at = NOW()
           WHERE risk_id = $3`, [action.payload?.score || 0, action.description, action.entityId]);
            }
            break;
        }
        case 'create_finding': {
            await safeQuery(`INSERT INTO "${schema}".findings (title, description, severity, status, source_type, source_id, created_at)
         VALUES ($1, $2, $3, 'open', $4, $5, NOW())`, [`[${agentId}] ${action.title}`, action.description,
                action.priority || 'medium', `agent_${agentId}`, action.entityId || null]);
            break;
        }
        case 'close_incident': {
            if (action.entityId) {
                await safeQuery(`UPDATE "${schema}".incidents SET status = 'closed', resolution = $1, resolved_at = NOW(), updated_at = NOW()
           WHERE incident_id = $2`, [action.description, action.entityId]);
            }
            break;
        }
        case 'update_control_status': {
            if (action.entityId) {
                await safeQuery(`UPDATE "${schema}".controls SET status = $1, updated_at = NOW() WHERE control_id = $2`, [action.payload?.status || 'implemented', action.entityId]);
            }
            break;
        }
        case 'create_remediation': {
            try {
                const { createProcessTask } = await import('@dos/platform-core/workflows');
                await createProcessTask(tenantId, {
                    title: `[${agentId}] ${action.title}`,
                    description: action.description,
                    taskType: 'remediation',
                    priority: (action.priority) ?? 'medium',
                    entityType: action.entityType,
                    entityId: action.entityId,
                    dueInHours: action.dueInDays ? action.dueInDays * 24 : undefined,
                    triggerSource: `agent_${agentId}`,
                    triggerData: { agentId, actionType: 'create_remediation' },
                    createdBy: `agent-${agentId}`,
                });
            }
            catch (orchErr) {
                logger.error(`[AgentRunner] createProcessTask FAILED for ${agentId} (create_remediation): ${toErrorMessage(orchErr)}`);
            }
            break;
        }
        case 'escalate': {
            const escalateTarget = await swallowNull(EC.FALLBACK_QUERY, resolveAssignee(tenantId, action.assignToRole), { tenantId: tenantId, operation: 'fallback query' });
            await createNotification(tenantId, {
                userId: escalateTarget || 'owner',
                type: 'escalation',
                title: `🚨 [${agentId}] ESCALATION: ${action.title}`,
                body: action.description,
                link: action.entityType ? `/${action.entityType}s/${action.entityId}` : null,
            });
            await eventBus.publish({
                eventType: `agent.escalation`,
                tenantId,
                sourceService: `agent-runner-${agentId}`,
                severity: 'critical',
                entityType: action.entityType,
                entityId: action.entityId,
                payload: { agentId, title: action.title, description: action.description, priority: 'critical' },
            });
            break;
        }
        case 'trigger_sync': {
            const { syncAllConnections } = await import('../../integrations/services/connector-sync.service.js');
            const connectorType = (action.payload?.connectorType || 'siem');
            await syncAllConnections(tenantId, connectorType).catch((err) => logger.warn(`[AgentRunner] Sync trigger failed: ${toErrorMessage(err)}`));
            break;
        }
        // ── Vendor Cross-Agent Propagation Actions (A09) ──────────────────────
        case 'propagate_vendor_risk': {
            try {
                const { propagateVendorRiskToEnterprise } = await import('../../../vendor/services/vendor/vendor-cross-agent.service.js');
                await propagateVendorRiskToEnterprise(tenantId, action.entityId || '', String(action.payload?.vendorName || action.title), (action.payload?.riskScore ?? 30), String(action.payload?.riskTier || 'high'), { reason: action.description });
            }
            catch (err) {
                logger.error(`[AgentRunner] propagate_vendor_risk FAILED for ${agentId}: ${toErrorMessage(err)}`);
            }
            break;
        }
        case 'propagate_vendor_gap': {
            try {
                const { propagateVendorGapToRemediation } = await import('../../../vendor/services/vendor/vendor-cross-agent.service.js');
                await propagateVendorGapToRemediation(tenantId, action.entityId || '', String(action.payload?.vendorName || action.title), action.description, (action.priority) || 'medium', action.payload?.controlId);
            }
            catch (err) {
                logger.error(`[AgentRunner] propagate_vendor_gap FAILED for ${agentId}: ${toErrorMessage(err)}`);
            }
            break;
        }
        case 'propagate_vendor_evidence': {
            try {
                const { propagateVendorEvidenceToControls } = await import('../../../vendor/services/vendor/vendor-cross-agent.service.js');
                await propagateVendorEvidenceToControls(tenantId, action.entityId || '', String(action.payload?.vendorName || action.title), String(action.payload?.documentType || 'soc2'), String(action.payload?.documentId || ''), (action.payload?.expiryDate));
            }
            catch (err) {
                logger.error(`[AgentRunner] propagate_vendor_evidence FAILED for ${agentId}: ${toErrorMessage(err)}`);
            }
            break;
        }
        case 'propagate_vendor_finding': {
            try {
                const { propagateVendorFindingToAudit } = await import('../../../vendor/services/vendor/vendor-cross-agent.service.js');
                await propagateVendorFindingToAudit(tenantId, action.entityId || '', String(action.payload?.vendorName || ''), action.title, action.description, (action.priority) || 'medium');
            }
            catch (err) {
                logger.error(`[AgentRunner] propagate_vendor_finding FAILED for ${agentId}: ${toErrorMessage(err)}`);
            }
            break;
        }
        default: {
            logger.warn(`[AgentRunner] Unknown action type: ${action.type} from ${agentId}`);
        }
    }
    // ── AI OS R2: Record observation for every executed action ────────────────
    try {
        const { recordObservation } = await import('../observability/ai-observation.service.js');
        await recordObservation({
            tenantId,
            agentId,
            runId: runId || undefined,
            entityType: action.entityType,
            entityId: action.entityId,
            observationType: action.type === 'flag_risk' ? 'anomaly'
                : action.type === 'create_finding' ? 'gap'
                    : action.type === 'escalate' ? 'drift'
                        : 'pattern',
            title: `[${agentId}] ${action.title}`,
            description: action.description,
            severity: action.priority === 'critical' ? 'critical'
                : action.priority === 'high' ? 'warning'
                    : 'info',
            confidence: action.payload?.confidence ?? undefined,
        });
    }
    catch { /* observation is best-effort, don't block agent execution */ }
}
//# sourceMappingURL=agent-action-executor.service.js.map