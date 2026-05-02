import { Router, Request, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../../ports/middleware.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getComplianceDiagnostics, getOverdueObligationsDiagnostics, getMappingDriftDiagnostics, getMissingEvidenceDiagnostics } from '../diagnostics/compliance-diagnostics.service';
import { getComplianceDashboard, getComplianceRegulatorReadiness, getRemediationLinkage } from '../services/compliance/compliance-dashboard.service';
import { validate } from "../../ports/middleware.port";
const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

router.get(
  '/settings',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['compliance'],
    ).catch(() => ({ rows: [] }));
    res.json({ success: true, data: rows });
  }),
);

router.get(
  '/health',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getComplianceDiagnostics(tenantId);
    const healthy =
      diagnostics.criticalGaps === 0 &&
      diagnostics.failedAssessments === 0 &&
      diagnostics.overdueObligations === 0;
    res.json({ success: true, healthy, diagnostics });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await getComplianceDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

router.get(
  '/diagnostics/overdue-obligations',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const items = await getOverdueObligationsDiagnostics(tenantId, limit);
    res.json({ success: true, data: items, total: items.length });
  }),
);

router.get(
  '/diagnostics/mapping-drift',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const _limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const items = await getMappingDriftDiagnostics(tenantId);
    res.json({ success: true, data: items, total: items.length });
  }),
);

router.get(
  '/diagnostics/missing-evidence',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
    const items = await getMissingEvidenceDiagnostics(tenantId, limit);
    res.json({ success: true, data: items, total: items.length });
  }),
);

router.get(
  '/overview',
  authenticate,
  requirePermission('compliance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const [frameworks, obligations] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
         FROM "${schema}".compliance_frameworks WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'met')::int AS met,
           COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('met', 'waived'))::int AS overdue
         FROM "${schema}".compliance_obligations WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, met: 0, overdue: 0 }] })),
    ]);
    res.json({
      success: true,
      data: {
        totalFrameworks: frameworks.rows[0]?.total ?? 0,
        activeFrameworks: frameworks.rows[0]?.active ?? 0,
        totalObligations: obligations.rows[0]?.total ?? 0,
        metObligations: obligations.rows[0]?.met ?? 0,
        overdueObligations: obligations.rows[0]?.overdue ?? 0,
      },
    });
  }),
);

router.get(
  '/dashboard',
  authenticate,
  requirePermission('compliance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const dashboard = await getComplianceDashboard(tenantId);
    res.json({ success: true, data: dashboard });
  }),
);

router.get(
  '/dashboard/regulator-readiness',
  authenticate,
  requirePermission('compliance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const data = await getComplianceRegulatorReadiness(tenantId);
    res.json({ success: true, data });
  }),
);

router.get(
  '/dashboard/remediation-linkage',
  authenticate,
  requirePermission('compliance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 30);
    const data = await getRemediationLinkage(tenantId, limit);
    res.json({ success: true, data, total: data.length });
  }),
);

router.get(
  '/sla-config',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT config_key, config_value FROM "${schema}".module_configs
       WHERE module_code = 'compliance' AND config_key LIKE 'sla.%'
       ORDER BY config_key`,
    ).catch(() => ({ rows: [] }));

    const defaults = {
      'sla.obligation_response_hours': 48,
      'sla.assessment_completion_days': 30,
      'sla.attestation_review_hours': 72,
      'sla.remediation_target_days': 90,
      'sla.evidence_freshness_days': 180,
      'sla.framework_review_cycle_days': 365,
    };

    const config: Record<string, unknown> = { ...defaults };
    for (const row of rows) {
      config[row.config_key] = row.config_value;
    }

    res.json({ success: true, data: config });
  }),
);

router.get(
  '/escalation-policy',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT config_key, config_value FROM "${schema}".module_configs
       WHERE module_code = 'compliance' AND config_key LIKE 'escalation.%'
       ORDER BY config_key`,
    ).catch(() => ({ rows: [] }));

    const defaults = {
      'escalation.overdue_obligation_hours': 24,
      'escalation.stuck_assessment_days': 7,
      'escalation.blocked_review_days': 3,
      'escalation.chain': ['compliance.operator', 'compliance.module_lead', 'compliance.executive_owner'],
      'escalation.auto_reassign_on_timeout': false,
      'escalation.notify_channels': ['email', 'inbox'],
    };

    const config: Record<string, unknown> = { ...defaults };
    for (const row of rows) {
      config[row.config_key] = row.config_value;
    }

    res.json({ success: true, data: config });
  }),
);

router.get(
  '/runbooks',
  authenticate,
  requirePermission('compliance.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: [
        { code: 'overdue-obligations', titleEn: 'Overdue Obligations Remediation', titleAr: 'معالجة الالتزامات المتأخرة', diagnosticEndpoint: '/api/compliance-admin/diagnostics/overdue-obligations', steps: ['Review overdue obligations list', 'Reassign or extend deadlines', 'Escalate critical items to module lead', 'Document resolution in audit trail'] },
        { code: 'failed-assessment', titleEn: 'Failed Assessment Recovery', titleAr: 'استرداد التقييم الفاشل', diagnosticEndpoint: '/api/compliance-admin/diagnostics', steps: ['Identify failed assessments from diagnostics', 'Review assessment configuration', 'Re-run assessment with corrected parameters', 'Verify results and close finding'] },
        { code: 'mapping-drift', titleEn: 'Framework Mapping Drift Resolution', titleAr: 'حل انحراف ربط الأطر', diagnosticEndpoint: '/api/compliance-admin/diagnostics/mapping-drift', steps: ['Pull mapping drift diagnostics', 'Identify orphaned or deprecated mappings', 'Update control-framework links', 'Run coverage recalculation'] },
        { code: 'evidence-gap', titleEn: 'Missing Evidence Remediation', titleAr: 'معالجة الأدلة المفقودة', diagnosticEndpoint: '/api/compliance-admin/diagnostics/missing-evidence', steps: ['List obligations without evidence', 'Assign evidence collection tasks', 'Set evidence freshness thresholds', 'Monitor collection progress'] },
        { code: 'stuck-review', titleEn: 'Blocked Review Escalation', titleAr: 'تصعيد المراجعات المعلقة', diagnosticEndpoint: '/api/compliance-admin/diagnostics', steps: ['Identify stuck assessments/reviews', 'Check reviewer availability', 'Escalate per escalation policy', 'Reassign if necessary'] },
        { code: 'attestation-campaign', titleEn: 'Attestation Campaign Management', titleAr: 'إدارة حملات الإقرار', diagnosticEndpoint: '/api/compliance/attestations/campaigns', steps: ['Create campaign with target audience', 'Activate campaign', 'Monitor submission rates', 'Send reminders for pending', 'Review and close campaign'] },
      ],
    });
  }),
);

export default router;
