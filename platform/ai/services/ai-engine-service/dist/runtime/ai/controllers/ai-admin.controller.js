import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getAiSeedData, seedAiModule } from '../data/ai-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
export async function getModuleConfig(req, res) {
    const seedData = getAiSeedData();
    res.json(ok({ moduleCode: 'ai', config: seedData.defaultConfigs }, req));
}
export async function updateModuleConfig(req, res) {
    setAuditData(res, { action: 'update', entityType: 'ai_config', entityId: 'ai' });
    res.json(action('Configuration updated', req));
}
export async function reseedModule(req, res) {
    const tenantId = req.tenantId;
    const schema = req.tenantSchema || `tenant_${tenantId}`;
    await seedAiModule(tenantId, schema);
    setAuditData(res, { action: 'reseed', entityType: 'ai', entityId: tenantId });
    res.json(action('Module reseeded', req));
}
export async function getModuleHealth(req, res) {
    res.json(ok({
        moduleCode: 'ai',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        permissions: getAiSeedData().permissions.length,
        roles: getAiSeedData().roles.length,
        actions: getAiSeedData().actions.length,
    }, req));
}
export async function reindexModule(req, res) {
    setAuditData(res, { action: 'reindex', entityType: 'ai', entityId: req.tenantId });
    res.json(action('Reindex initiated', req));
}
export async function backfillModule(req, res) {
    setAuditData(res, { action: 'backfill', entityType: 'ai', entityId: req.tenantId });
    res.json(action('Backfill initiated', req));
}
export async function getSlaConfig(req, res) {
    const schema = tenantSchema(req.tenantId);
    const { rows } = await safeQuery(`SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'ai' AND config_key = 'sla_policy' LIMIT 1`, []).catch(() => ({ rows: [] }));
    const tenantOverrides = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json(ok({
        moduleCode: 'ai',
        sla: {
            defaults: {
                agentDeploymentSlaHours: 72,
                configReviewSlaHours: 24,
                killSwitchResponseMinutes: 5,
                budgetAlertThresholdPercent: 80,
            },
            timeouts: {
                approvalTimeoutHours: 24,
                escalationAfterHours: 48,
                reminderBeforeHours: 8,
            },
            thresholds: {
                maxFailedRunsBeforeAlert: 10,
                maxErrorRatePercent: 15,
                maxCostPerDay: 500,
            },
            tenantOverrides,
        },
    }, req));
}
export async function getEscalationPolicy(req, res) {
    const schema = tenantSchema(req.tenantId);
    const { rows } = await safeQuery(`SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'ai' AND config_key = 'escalation_policy' LIMIT 1`, []).catch(() => ({ rows: [] }));
    const tenantPolicy = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json(ok({
        moduleCode: 'ai',
        escalation: {
            defaultPath: ['ai.operator', 'ai.module_lead', 'ai.executive_owner', 'ai.platform_admin'],
            escalateAfterHours: 48,
            reminderBeforeHours: 8,
            autoEscalateOnSlaBreach: true,
            notifyOnEscalation: true,
            maxEscalationLevels: 4,
            tenantPolicy,
        },
    }, req));
}
export async function getRunbookLinks(_req, res) {
    res.json(ok({
        moduleCode: 'ai',
        runbooks: [
            { code: 'ai.agent_deployment', titleEn: 'Agent Deployment', titleAr: 'نشر الوكيل', url: '/docs/runbooks/ai/agent-deployment.md' },
            { code: 'ai.kill_switch', titleEn: 'Kill Switch Activation', titleAr: 'تفعيل مفتاح الإيقاف', url: '/docs/runbooks/ai/kill-switch.md' },
            { code: 'ai.budget_management', titleEn: 'Budget Management', titleAr: 'إدارة الميزانية', url: '/docs/runbooks/ai/budget-management.md' },
            { code: 'ai.model_configuration', titleEn: 'Model Configuration', titleAr: 'تكوين النموذج', url: '/docs/runbooks/ai/model-configuration.md' },
            { code: 'ai.failed_run_triage', titleEn: 'Failed Run Triage', titleAr: 'فرز التشغيل الفاشل', url: '/docs/runbooks/ai/failed-run-triage.md' },
            { code: 'ai.escalation_handling', titleEn: 'Escalation Handling', titleAr: 'معالجة التصعيد', url: '/docs/runbooks/ai/escalation-handling.md' },
            { code: 'ai.diagnostics_triage', titleEn: 'Diagnostics Triage', titleAr: 'فرز التشخيصات', url: '/docs/runbooks/ai/diagnostics-triage.md' },
        ],
    }, _req));
}
//# sourceMappingURL=ai-admin.controller.js.map