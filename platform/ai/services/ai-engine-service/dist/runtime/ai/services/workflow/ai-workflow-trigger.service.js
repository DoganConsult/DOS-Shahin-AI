// @ts-nocheck
// ============================================
// Shahin — AI Workflow Trigger Service
// Evaluates thresholds across ALL modules
// and auto-creates workflow instances.
// Covers: risk, compliance, incident, vendor,
// audit, policy, evidence, governance, bcp,
// asset, training, qiyas, ai-governance,
// exception, remediation, action, foundation
// ============================================
import { tenantSchema } from '../../ports/database.port.js';
import * as auditTrail from "../../../audit/services/audit/core/audit-trail.service.js";
import { logger } from '../../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
const SEVERITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };
const TRIGGER_WORKFLOW_MAP = {
    risk: 'risk_treatment',
    compliance_gap: 'compliance_remediation',
    incident: 'incident_response',
    vendor: 'vendor-due-diligence',
    audit: 'audit-planning',
    policy: 'policy-review-cycle',
    evidence: 'evidence-collection-cycle',
    governance: 'governance-charter-review',
    bcp: 'bcp-exercise-test',
    asset: 'asset-classification',
    training: 'training-campaign',
    qiyas: 'qiyas-maturity-assessment',
    'ai-governance': 'ai-governance-assessment',
    exception: 'exception-approval',
    remediation: 'remediation-tracking',
    action: 'action-item-lifecycle',
    foundation: 'foundation-access-review',
    reporting: 'report-generation',
    team: 'team-onboarding',
    notification: 'notification-escalation',
};
const DEFAULT_MODULE_TRIGGERS = {
    vendor: { enabled: true, threshold_field: 'risk_score', threshold_value: 70, threshold_operator: '>=', template_key: 'vendor-due-diligence', description: 'Vendor risk score exceeds threshold' },
    audit: { enabled: true, threshold_field: 'finding_count', threshold_value: 5, threshold_operator: '>=', template_key: 'audit-planning', description: 'Audit finding count triggers remediation' },
    policy: { enabled: true, threshold_field: 'days_until_expiry', threshold_value: 30, threshold_operator: '<=', template_key: 'policy-review-cycle', description: 'Policy expiring within threshold' },
    evidence: { enabled: true, threshold_field: 'staleness_days', threshold_value: 90, threshold_operator: '>=', template_key: 'evidence-collection-cycle', description: 'Evidence is stale beyond threshold' },
    governance: { enabled: true, threshold_field: 'health_score', threshold_value: 50, threshold_operator: '<=', template_key: 'governance-charter-review', description: 'Governance health score drops below threshold' },
    bcp: { enabled: true, threshold_field: 'months_since_test', threshold_value: 6, threshold_operator: '>=', template_key: 'bcp-exercise-test', description: 'BCP plan not tested within threshold' },
    asset: { enabled: true, threshold_field: 'criticality', threshold_value: 'high', threshold_operator: '>=', template_key: 'asset-classification', description: 'High-criticality asset requires classification workflow' },
    training: { enabled: true, threshold_field: 'overdue_count', threshold_value: 3, threshold_operator: '>=', template_key: 'training-campaign', description: 'Training overdue count triggers escalation' },
    qiyas: { enabled: true, threshold_field: 'maturity_score', threshold_value: 2, threshold_operator: '<=', template_key: 'qiyas-maturity-assessment', description: 'Low maturity score triggers assessment' },
    'ai-governance': { enabled: true, threshold_field: 'risk_level', threshold_value: 'high', threshold_operator: '>=', template_key: 'ai-governance-assessment', description: 'High-risk AI system triggers governance assessment' },
    exception: { enabled: true, threshold_field: 'days_until_expiry', threshold_value: 14, threshold_operator: '<=', template_key: 'exception-approval', description: 'Exception nearing expiry triggers review' },
    remediation: { enabled: true, threshold_field: 'days_overdue', threshold_value: 7, threshold_operator: '>=', template_key: 'remediation-tracking', description: 'Overdue remediation triggers escalation' },
    action: { enabled: true, threshold_field: 'days_overdue', threshold_value: 5, threshold_operator: '>=', template_key: 'action-item-lifecycle', description: 'Overdue action item triggers escalation' },
};
export async function getConfig(tenantId) {
    const { safeQuery } = await import('@dos/db');
    const { getFirstRow } = await import('../../../../utils/db-utils.js');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_trigger_config WHERE tenant_id = $1`, [tenantId]);
    if (!result.rows.length)
        return null;
    const row = getFirstRow(result);
    return {
        ...row,
        module_triggers: typeof row.module_triggers === 'string' ? JSON.parse(row.module_triggers) : (row.module_triggers || {}),
    };
}
export async function upsertConfig(tenantId, config) {
    const { safeQuery } = await import('@dos/db');
    const { getFirstRow } = await import('../../../../utils/db-utils.js');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_trigger_config (tenant_id, enabled, risk_threshold, compliance_gap_threshold, incident_severity_threshold, module_triggers, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       enabled = COALESCE($2, ai_trigger_config.enabled),
       risk_threshold = COALESCE($3, ai_trigger_config.risk_threshold),
       compliance_gap_threshold = COALESCE($4, ai_trigger_config.compliance_gap_threshold),
       incident_severity_threshold = COALESCE($5, ai_trigger_config.incident_severity_threshold),
       module_triggers = COALESCE($6, ai_trigger_config.module_triggers),
       updated_at = NOW()
     RETURNING *`, [
        tenantId,
        config.enabled ?? true,
        config.risk_threshold ?? 20,
        config.compliance_gap_threshold ?? 30,
        config.incident_severity_threshold ?? 'high',
        JSON.stringify(config.module_triggers ?? {}),
    ]);
    return getFirstRow(result);
}
export async function getModuleTriggerConfig(tenantId, moduleCode) {
    const config = await getConfig(tenantId);
    if (!config)
        return DEFAULT_MODULE_TRIGGERS[moduleCode] ?? null;
    return config.module_triggers?.[moduleCode] ?? DEFAULT_MODULE_TRIGGERS[moduleCode] ?? null;
}
export async function upsertModuleTrigger(tenantId, moduleCode, rule) {
    const config = await getConfig(tenantId);
    const existing = config?.module_triggers ?? {};
    const defaultRule = DEFAULT_MODULE_TRIGGERS[moduleCode] ?? { enabled: true, threshold_field: 'score', threshold_value: 0, threshold_operator: '>=', template_key: moduleCode };
    const merged = { ...defaultRule, ...existing[moduleCode], ...rule };
    existing[moduleCode] = merged;
    await upsertConfig(tenantId, { module_triggers: existing });
    return merged;
}
export async function evaluateAndTrigger(tenantId, userId, context) {
    const config = await getConfig(tenantId);
    if (!config || !config.enabled) {
        return { triggered: false, reason: 'AI triggers disabled' };
    }
    let shouldTrigger = false;
    let reason = '';
    switch (context.type) {
        case 'risk':
            if (context.score != null && context.score >= config.risk_threshold) {
                shouldTrigger = true;
                reason = `Risk score ${context.score} >= threshold ${config.risk_threshold}`;
            }
            break;
        case 'compliance_gap':
            if (context.gapPercent != null && context.gapPercent >= config.compliance_gap_threshold) {
                shouldTrigger = true;
                reason = `Compliance gap ${context.gapPercent}% >= threshold ${config.compliance_gap_threshold}%`;
            }
            break;
        case 'incident':
            if (context.severity) {
                const sevLevel = SEVERITY_ORDER[context.severity] || 0;
                const threshLevel = SEVERITY_ORDER[config.incident_severity_threshold] || 3;
                if (sevLevel >= threshLevel) {
                    shouldTrigger = true;
                    reason = `Incident severity '${context.severity}' >= threshold '${config.incident_severity_threshold}'`;
                }
            }
            break;
        default: {
            const result = evaluateModuleTrigger(config, context);
            shouldTrigger = result.shouldTrigger;
            reason = result.reason;
            break;
        }
    }
    if (!shouldTrigger) {
        return { triggered: false, reason: reason || 'Thresholds not met' };
    }
    const templateKey = TRIGGER_WORKFLOW_MAP[context.type] ?? context.type;
    let instanceId;
    try {
        const { startWorkflowExecution } = await import('@dos/platform-core/workflows');
        const startResult = await startWorkflowExecution(tenantId, templateKey, {
            _moduleCode: context.type,
            _entityType: context.type,
            _entityId: context.entityId,
            _userId: userId,
            ...context.data,
        }, userId);
        instanceId = startResult.instanceId;
    }
    catch (err) {
        logger.warn(`[AITrigger] Failed to start workflow via engine: ${toErrorMessage(err)}`);
        return { triggered: false, reason: `Workflow engine unavailable: ${toErrorMessage(err)}` };
    }
    await auditTrail.recordAudit({
        tenantId,
        userId,
        action: 'create',
        module: 'ai',
        entityType: context.type,
        entityId: context.entityId,
        afterState: { reason, templateKey, instanceId, context },
    });
    return { triggered: true, workflowInstanceId: instanceId, reason };
}
function evaluateModuleTrigger(config, context) {
    const moduleRule = config.module_triggers?.[context.type] ?? DEFAULT_MODULE_TRIGGERS[context.type];
    if (!moduleRule || !moduleRule.enabled) {
        return { shouldTrigger: false, reason: `No trigger rule configured for module '${context.type}'` };
    }
    const fieldValue = context.data?.[moduleRule.threshold_field] ?? context.score ?? context.gapPercent;
    if (fieldValue == null) {
        return { shouldTrigger: false, reason: `No value for field '${moduleRule.threshold_field}'` };
    }
    const numericValue = typeof fieldValue === 'number' ? fieldValue : (SEVERITY_ORDER[String(fieldValue)] ?? parseFloat(String(fieldValue)));
    const thresholdNumeric = typeof moduleRule.threshold_value === 'number'
        ? moduleRule.threshold_value
        : (SEVERITY_ORDER[String(moduleRule.threshold_value)] ?? parseFloat(String(moduleRule.threshold_value)));
    if (isNaN(numericValue) || isNaN(thresholdNumeric)) {
        return { shouldTrigger: false, reason: `Cannot compare '${fieldValue}' with threshold '${moduleRule.threshold_value}'` };
    }
    let shouldTrigger = false;
    switch (moduleRule.threshold_operator) {
        case '>=':
            shouldTrigger = numericValue >= thresholdNumeric;
            break;
        case '>':
            shouldTrigger = numericValue > thresholdNumeric;
            break;
        case '==':
            shouldTrigger = numericValue === thresholdNumeric;
            break;
        case '<=':
            shouldTrigger = numericValue <= thresholdNumeric;
            break;
        case '<':
            shouldTrigger = numericValue < thresholdNumeric;
            break;
    }
    const reason = shouldTrigger
        ? `${context.type}: ${moduleRule.threshold_field} (${fieldValue}) ${moduleRule.threshold_operator} ${moduleRule.threshold_value}`
        : `${context.type}: threshold not met (${fieldValue} ${moduleRule.threshold_operator} ${moduleRule.threshold_value})`;
    return { shouldTrigger, reason };
}
export function getDefaultModuleTriggers() {
    return { ...DEFAULT_MODULE_TRIGGERS };
}
export function getSupportedTriggerModules() {
    return Object.keys(TRIGGER_WORKFLOW_MAP);
}
//# sourceMappingURL=ai-workflow-trigger.service.js.map