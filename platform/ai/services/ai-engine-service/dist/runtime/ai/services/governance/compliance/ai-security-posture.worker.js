import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { CANONICAL_AGRC_MODULE_CODES } from '../../../ports/config.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
const LOG_TAG = '[AI-SecurityPosture]';
const POSTURE_WEIGHTS = {
    rbac: parseInt(process.env.POSTURE_WEIGHT_RBAC || '3', 10),
    sod: parseInt(process.env.POSTURE_WEIGHT_SOD || '2', 10),
    audit: parseInt(process.env.POSTURE_WEIGHT_AUDIT || '2', 10),
    approval: parseInt(process.env.POSTURE_WEIGHT_APPROVAL || '2', 10),
};
export async function assessSecurityPosture(tenantId) {
    const schema = tenantSchema(tenantId);
    const dimensions = [];
    const moduleScores = [];
    const rbacDimension = await assessRbacCoverage(schema);
    dimensions.push(rbacDimension);
    const sodDimension = await assessSoDCoverage(schema);
    dimensions.push(sodDimension);
    const auditDimension = await assessAuditCoverage(schema);
    dimensions.push(auditDimension);
    const approvalDimension = await assessApprovalCoverage(schema);
    dimensions.push(approvalDimension);
    for (const mod of CANONICAL_AGRC_MODULE_CODES) {
        const score = await assessModuleSecurity(schema, mod);
        moduleScores.push(score);
    }
    const totalWeightedScore = dimensions.reduce((sum, d) => sum + (d.score / d.maxScore) * d.weight, 0);
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const overallScore = Math.round((totalWeightedScore / totalWeight) * 100);
    const recommendations = generatePostureRecommendations(dimensions, moduleScores);
    logger.info(`${LOG_TAG} Security posture for ${tenantId}: ${overallScore}/100`);
    const result = { tenantId, timestamp: new Date().toISOString(), overallScore, dimensions, moduleScores, recommendations };
    try {
        await safeQuery(`INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('security_posture_result', $1, 'info', 'platform')`, [JSON.stringify(result)]);
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to persist posture result for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return result;
}
export async function getLastSecurityPosture(tenantId) {
    try {
        const schema = tenantSchema(tenantId);
        const { rows } = await safeQuery(`SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'security_posture_result'
       ORDER BY created_at DESC LIMIT 1`);
        if (rows.length > 0) {
            const data = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
            return data;
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} getLastSecurityPosture failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
}
async function assessRbacCoverage(schema) {
    const items = [];
    let score = 0;
    const maxScore = 30;
    try {
        const { rows: roles } = await safeQuery(`SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_role_definitions WHERE is_active = true`);
        const modulesWithRoles = Number(roles[0]?.cnt || 0);
        const rolesPassed = modulesWithRoles >= 20;
        items.push({ check: 'modules_with_roles', passed: rolesPassed, detail: `${modulesWithRoles}/25 modules have role definitions`, points: rolesPassed ? 10 : Math.round((modulesWithRoles / 25) * 10) });
        score += items[items.length - 1].points;
        const { rows: perms } = await safeQuery(`SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_permissions WHERE is_active = true`);
        const modulesWithPerms = Number(perms[0]?.cnt || 0);
        const permsPassed = modulesWithPerms >= 20;
        items.push({ check: 'modules_with_permissions', passed: permsPassed, detail: `${modulesWithPerms}/25 modules have permission definitions`, points: permsPassed ? 10 : Math.round((modulesWithPerms / 25) * 10) });
        score += items[items.length - 1].points;
        const { rows: bindings } = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".module_role_permission_bindings WHERE is_active = true`);
        const bindingCount = Number(bindings[0]?.cnt || 0);
        const bindingsPassed = bindingCount > 100;
        items.push({ check: 'role_permission_bindings', passed: bindingsPassed, detail: `${bindingCount} active role-permission bindings`, points: bindingsPassed ? 10 : Math.min(10, Math.round(bindingCount / 10)) });
        score += items[items.length - 1].points;
    }
    catch (err) {
        logger.warn(`${LOG_TAG} assessRbacCoverage failed: ${err instanceof Error ? err.message : String(err)}`);
        items.push({ check: 'rbac_tables_exist', passed: false, detail: 'Dynamic RBAC tables not found', points: 0 });
    }
    return { name: 'RBAC Coverage', score, maxScore, weight: POSTURE_WEIGHTS.rbac, items };
}
async function assessSoDCoverage(schema) {
    const items = [];
    let score = 0;
    const maxScore = 20;
    try {
        const { rows } = await safeQuery(`SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_sod_rules WHERE is_active = true`);
        const modulesWithSod = Number(rows[0]?.cnt || 0);
        const passed = modulesWithSod >= 15;
        items.push({ check: 'modules_with_sod', passed, detail: `${modulesWithSod}/25 modules have SoD rules`, points: passed ? 10 : Math.round((modulesWithSod / 25) * 10) });
        score += items[items.length - 1].points;
        const { rows: enforced } = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".module_sod_rules WHERE is_active = true AND enforcement_mode = 'block'`);
        const enforcedCount = Number(enforced[0]?.cnt || 0);
        const enforcedPassed = enforcedCount > 10;
        items.push({ check: 'enforced_sod_rules', passed: enforcedPassed, detail: `${enforcedCount} SoD rules in 'block' mode`, points: enforcedPassed ? 10 : Math.min(10, enforcedCount) });
        score += items[items.length - 1].points;
    }
    catch (err) {
        logger.warn(`${LOG_TAG} assessSoDCoverage failed: ${err instanceof Error ? err.message : String(err)}`);
        items.push({ check: 'sod_tables_exist', passed: false, detail: 'SoD tables not found', points: 0 });
    }
    return { name: 'SoD Coverage', score, maxScore, weight: POSTURE_WEIGHTS.sod, items };
}
async function assessAuditCoverage(schema) {
    const items = [];
    let score = 0;
    const maxScore = 20;
    try {
        const { rows } = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".rbac_config_audit WHERE created_at > NOW() - INTERVAL '7 days'`);
        const recentAudits = Number(rows[0]?.cnt || 0);
        const passed = recentAudits > 0;
        items.push({ check: 'recent_audit_entries', passed, detail: `${recentAudits} RBAC config changes audited in last 7 days`, points: passed ? 10 : 0 });
        score += items[items.length - 1].points;
        const { rows: eventRows } = await safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".agrc_event_log WHERE created_at > NOW() - INTERVAL '7 days'`);
        const eventCount = Number(eventRows[0]?.cnt || 0);
        const eventPassed = eventCount > 10;
        items.push({ check: 'event_logging_active', passed: eventPassed, detail: `${eventCount} events logged in last 7 days`, points: eventPassed ? 10 : Math.min(10, eventCount) });
        score += items[items.length - 1].points;
    }
    catch (err) {
        logger.warn(`${LOG_TAG} assessAuditCoverage failed: ${err instanceof Error ? err.message : String(err)}`);
        items.push({ check: 'audit_tables_exist', passed: false, detail: 'Audit tables not found', points: 0 });
    }
    return { name: 'Audit Trail', score, maxScore, weight: POSTURE_WEIGHTS.audit, items };
}
async function assessApprovalCoverage(schema) {
    const items = [];
    let score = 0;
    const maxScore = 15;
    try {
        const { rows } = await safeQuery(`SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_approval_matrices WHERE is_active = true`);
        const modulesWithApproval = Number(rows[0]?.cnt || 0);
        const passed = modulesWithApproval >= 10;
        items.push({ check: 'modules_with_approval', passed, detail: `${modulesWithApproval}/25 modules have approval matrices`, points: passed ? 15 : Math.round((modulesWithApproval / 25) * 15) });
        score += items[items.length - 1].points;
    }
    catch (err) {
        logger.warn(`${LOG_TAG} assessApprovalCoverage failed: ${err instanceof Error ? err.message : String(err)}`);
        items.push({ check: 'approval_tables_exist', passed: false, detail: 'Approval tables not found', points: 0 });
    }
    return { name: 'Approval Coverage', score, maxScore, weight: POSTURE_WEIGHTS.approval, items };
}
async function assessModuleSecurity(schema, moduleCode) {
    const checks = { hasRoles: false, hasPermissions: false, hasActions: false, hasSodRules: false, hasApprovalMatrix: false, hasOwnership: false };
    let score = 0;
    const maxScore = 6;
    try {
        const [roles, perms, actions, sod, approval, ownership] = await Promise.all([
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_role_definitions WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_role_definitions' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_permissions WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_role_definitions' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_actions WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_role_definitions' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_sod_rules WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_permissions' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_approval_matrices WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_actions' }),
            swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT 1 FROM "${schema}".module_ownership_rules WHERE module_code = $1 AND is_active = true LIMIT 1`, [moduleCode]), { operation: 'query module_sod_rules' }),
        ]);
        checks.hasRoles = roles.rows.length > 0;
        if (checks.hasRoles)
            score++;
        checks.hasPermissions = perms.rows.length > 0;
        if (checks.hasPermissions)
            score++;
        checks.hasActions = actions.rows.length > 0;
        if (checks.hasActions)
            score++;
        checks.hasSodRules = sod.rows.length > 0;
        if (checks.hasSodRules)
            score++;
        checks.hasApprovalMatrix = approval.rows.length > 0;
        if (checks.hasApprovalMatrix)
            score++;
        checks.hasOwnership = ownership.rows.length > 0;
        if (checks.hasOwnership)
            score++;
    }
    catch (err) {
        logger.warn(`${LOG_TAG} assessModuleSecurity failed for ${moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { moduleCode, ...checks, score, maxScore };
}
export async function getPostureTrend(tenantId, days = 30) {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(Math.floor(Number(days) || 30), 365));
    const points = [];
    try {
        const { rows } = await safeQuery(`SELECT payload, created_at FROM "${schema}".agrc_event_log
       WHERE event_type = 'security_posture_result'
         AND created_at > NOW() - make_interval(days => $1)
       ORDER BY created_at ASC
       LIMIT 100`, [safeDays]);
        for (const r of rows) {
            const data = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
            const dimScores = {};
            for (const dim of (data.dimensions || [])) {
                dimScores[dim.name] = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;
            }
            points.push({
                timestamp: r.created_at || data.timestamp,
                overallScore: data.overallScore || 0,
                dimensionScores: dimScores,
            });
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} getPostureTrend failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    let trend = 'stable';
    let changePercent = 0;
    if (points.length >= 2) {
        const first = points[0].overallScore;
        const last = points[points.length - 1].overallScore;
        changePercent = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
        if (changePercent > 5)
            trend = 'improving';
        else if (changePercent < -5)
            trend = 'degrading';
    }
    return { tenantId, points, trend, changePercent };
}
function generatePostureRecommendations(dimensions, moduleScores) {
    const recs = [];
    let priority = 1;
    for (const dim of dimensions) {
        if (dim.score < dim.maxScore * 0.5) {
            recs.push({
                priority: priority++,
                titleEn: `Improve ${dim.name}`,
                titleAr: `تحسين ${dim.name}`,
                actionEn: `${dim.name} score is ${dim.score}/${dim.maxScore}. Review failing checks and remediate.`,
                actionAr: `درجة ${dim.name} هي ${dim.score}/${dim.maxScore}. راجع الفحوصات الفاشلة وعالجها.`,
            });
        }
    }
    const weakModules = moduleScores.filter(m => m.score < 3).map(m => m.moduleCode);
    if (weakModules.length > 0) {
        recs.push({
            priority: priority++,
            titleEn: `${weakModules.length} modules have weak security coverage`,
            titleAr: `${weakModules.length} وحدة لديها تغطية أمنية ضعيفة`,
            actionEn: `Run security seeder for: ${weakModules.slice(0, 10).join(', ')}`,
            actionAr: `شغّل البذر الأمني لـ: ${weakModules.slice(0, 10).join(', ')}`,
        });
    }
    return recs;
}
//# sourceMappingURL=ai-security-posture.worker.js.map