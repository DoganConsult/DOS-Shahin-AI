import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../../ports/middleware.port';
import { getComplianceSeedData, seedComplianceModule } from '../data/compliance-seed';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import * as complianceQuery from '../repositories/compliance-query.repo';
import { COMPLIANCE_LIMITS, COMPLIANCE_TIMEOUTS, COMPLIANCE_SLA_DEFAULTS, COMPLIANCE_BUSINESS_THRESHOLDS } from '../data/compliance-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getComplianceSeedData();
  res.json(ok({ moduleCode: 'compliance', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'compliance_config', entityId: 'compliance' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedComplianceModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'compliance', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getComplianceSeedData();

  const [statusStats, gapStats, certStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'assessment_in_progress')::int AS assessment_in_progress,
         COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
         COUNT(*) FILTER (WHERE status = 'partially_compliant')::int AS partially_compliant,
         COUNT(*) FILTER (WHERE status = 'non_compliant')::int AS non_compliant,
         COUNT(*) FILTER (WHERE status = 'remediation')::int AS remediation,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
       FROM "${schema}".compliance_programs WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*)::int AS open_gaps,
         COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed', 'accepted'))::int AS critical_gaps,
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed', 'accepted'))::int AS overdue_remediations
       FROM "${schema}".compliance_gaps WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE expiry_date < NOW() + INTERVAL '30 days' AND expiry_date > NOW())::int AS expiring_soon,
         COUNT(*) FILTER (WHERE expiry_date < NOW())::int AS expired
       FROM "${schema}".compliance_certifications WHERE deleted_at IS NULL AND status = 'active'`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const gs = gapStats.rows[0] || {};
  const cs = certStats.rows[0] || {};

  const total = ss.total || 0;
  const compliant = ss.compliant || 0;
  const nonCompliant = ss.non_compliant || 0;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100 * 100) / 100 : 0;

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((gs.critical_gaps || 0) > 0 || (gs.overdue_remediations || 0) > 5 || (cs.expired || 0) > 0) healthStatus = 'critical';
  else if (nonCompliant > 0 || (gs.open_gaps || 0) > 10 || (cs.expiring_soon || 0) > 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'compliance',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total,
      draft: ss.draft || 0,
      active: ss.active || 0,
      assessmentInProgress: ss.assessment_in_progress || 0,
      compliant,
      partiallyCompliant: ss.partially_compliant || 0,
      nonCompliant,
      remediation: ss.remediation || 0,
      archived: ss.archived || 0,
    },
    complianceRate,
    gaps: {
      openGaps: gs.open_gaps || 0,
      criticalGaps: gs.critical_gaps || 0,
      overdueRemediations: gs.overdue_remediations || 0,
    },
    certifications: {
      expiringSoon: cs.expiring_soon || 0,
      expired: cs.expired || 0,
    },
    limits: COMPLIANCE_LIMITS,
    timeouts: COMPLIANCE_TIMEOUTS,
  }, req));
}

export async function getComplianceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, frameworkRates, gapSummary, agingReport] = await Promise.all([
    complianceQuery.getKpiMetrics(tenantId),
    complianceQuery.getFrameworkComplianceRate(tenantId),
    complianceQuery.getGapAnalysisSummary(tenantId),
    complianceQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, frameworkRates, gapSummary, agingReport }, req));
}

export async function getNonCompliantItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const items = await complianceQuery.getNonCompliantItems(tenantId);
  res.json(ok({ items, total: items.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'compliance', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'compliance', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}

export async function getSlaConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'compliance' AND config_key = 'sla_policy' LIMIT 1`,
    [],
  ).catch(() => ({ rows: [] }));

  const tenantOverrides = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;

  res.json(ok({
    moduleCode: 'compliance',
    sla: {
      defaults: COMPLIANCE_SLA_DEFAULTS,
      timeouts: COMPLIANCE_TIMEOUTS,
      thresholds: COMPLIANCE_BUSINESS_THRESHOLDS,
      tenantOverrides,
    },
  }, req));
}

export async function getEscalationPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'compliance' AND config_key = 'escalation_policy' LIMIT 1`,
    [],
  ).catch(() => ({ rows: [] }));

  const tenantPolicy = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;

  res.json(ok({
    moduleCode: 'compliance',
    escalation: {
      defaultPath: ['compliance.operator', 'compliance.module_lead', 'compliance.executive_owner', 'compliance.platform_admin'],
      escalateAfterHours: COMPLIANCE_TIMEOUTS.ESCALATION_AFTER_HOURS,
      reminderBeforeHours: COMPLIANCE_TIMEOUTS.REMINDER_BEFORE_HOURS,
      autoEscalateOnSlaBreach: true,
      notifyOnEscalation: true,
      maxEscalationLevels: 4,
      tenantPolicy,
    },
  }, req));
}

export async function getRunbookLinks(_req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json(ok({
    moduleCode: 'compliance',
    runbooks: [
      { code: 'compliance.framework_onboarding', titleEn: 'Framework Onboarding', titleAr: 'إعداد الإطار التنظيمي', url: '/docs/runbooks/compliance/framework-onboarding.md' },
      { code: 'compliance.assessment_execution', titleEn: 'Assessment Execution', titleAr: 'تنفيذ التقييم', url: '/docs/runbooks/compliance/assessment-execution.md' },
      { code: 'compliance.gap_remediation', titleEn: 'Gap Remediation Workflow', titleAr: 'سير عمل معالجة الفجوات', url: '/docs/runbooks/compliance/gap-remediation.md' },
      { code: 'compliance.attestation_campaign', titleEn: 'Attestation Campaign', titleAr: 'حملة الإقرارات', url: '/docs/runbooks/compliance/attestation-campaign.md' },
      { code: 'compliance.regulatory_submission', titleEn: 'Regulatory Submission', titleAr: 'التقديم التنظيمي', url: '/docs/runbooks/compliance/regulatory-submission.md' },
      { code: 'compliance.escalation_handling', titleEn: 'Escalation Handling', titleAr: 'معالجة التصعيد', url: '/docs/runbooks/compliance/escalation-handling.md' },
      { code: 'compliance.diagnostics_triage', titleEn: 'Diagnostics Triage', titleAr: 'فرز التشخيصات', url: '/docs/runbooks/compliance/diagnostics-triage.md' },
    ],
  }, _req));
}
