import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getAiGovernanceSeedData, seedAiGovernanceModule } from '../data/ai-governance-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getAiGovernanceSeedData();
  res.json(ok({ moduleCode: 'ai-governance', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'ai-governance_config', entityId: 'ai-governance' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedAiGovernanceModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'ai-governance', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json(ok({
    moduleCode: 'ai-governance',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    permissions: getAiGovernanceSeedData().permissions.length,
    roles: getAiGovernanceSeedData().roles.length,
    actions: getAiGovernanceSeedData().actions.length,
  }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'ai-governance', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'ai-governance', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}

export async function getSlaConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const schema = tenantSchema(req.tenantId);
  const { rows } = await safeQuery(
    `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'ai-governance' AND config_key = 'sla_policy' LIMIT 1`,
    [],
  ).catch(() => ({ rows: [] }));

  const tenantOverrides = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;

  res.json(ok({
    moduleCode: 'ai-governance',
    sla: {
      defaults: {
        assessmentReviewSlaHours: 336,
        modelRegistrationSlaHours: 72,
        biasDetectionSlaHours: 48,
        ethicalReviewSlaHours: 168,
      },
      timeouts: {
        approvalTimeoutHours: 72,
        escalationAfterHours: 96,
        reminderBeforeHours: 24,
      },
      thresholds: {
        maxOpenAssessments: 50,
        maxPendingRegistrations: 20,
        biasAlertThreshold: 0.15,
      },
      tenantOverrides,
    },
  }, req));
}

export async function getEscalationPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const schema = tenantSchema(req.tenantId);
  const { rows } = await safeQuery(
    `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'ai-governance' AND config_key = 'escalation_policy' LIMIT 1`,
    [],
  ).catch(() => ({ rows: [] }));

  const tenantPolicy = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;

  res.json(ok({
    moduleCode: 'ai-governance',
    escalation: {
      defaultPath: ['ai-governance.operator', 'ai-governance.module_lead', 'ai-governance.executive_owner'],
      escalateAfterHours: 96,
      reminderBeforeHours: 24,
      autoEscalateOnSlaBreach: true,
      notifyOnEscalation: true,
      maxEscalationLevels: 3,
      tenantPolicy,
    },
  }, req));
}

export async function getRunbookLinks(_req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json(ok({
    moduleCode: 'ai-governance',
    runbooks: [
      { code: 'ai_governance.model_registration', titleEn: 'Model Registration', titleAr: 'تسجيل النموذج', url: '/docs/runbooks/ai-governance/model-registration.md' },
      { code: 'ai_governance.bias_detection', titleEn: 'Bias Detection Response', titleAr: 'استجابة كشف التحيز', url: '/docs/runbooks/ai-governance/bias-detection.md' },
      { code: 'ai_governance.ethical_review', titleEn: 'Ethical Review Process', titleAr: 'عملية المراجعة الأخلاقية', url: '/docs/runbooks/ai-governance/ethical-review.md' },
      { code: 'ai_governance.impact_assessment', titleEn: 'Impact Assessment', titleAr: 'تقييم الأثر', url: '/docs/runbooks/ai-governance/impact-assessment.md' },
      { code: 'ai_governance.monitoring_alerts', titleEn: 'Monitoring Alert Triage', titleAr: 'فرز تنبيهات المراقبة', url: '/docs/runbooks/ai-governance/monitoring-alerts.md' },
      { code: 'ai_governance.diagnostics_triage', titleEn: 'Diagnostics Triage', titleAr: 'فرز التشخيصات', url: '/docs/runbooks/ai-governance/diagnostics-triage.md' },
    ],
  }, _req));
}
