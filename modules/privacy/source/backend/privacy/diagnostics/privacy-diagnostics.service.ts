import { safeQuery, tenantSchema } from '../ports/database.port';

export interface PrivacyDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  processingActivityHealth: ProcessingActivityHealthResult;
  assessmentHealth: AssessmentHealthResult;
  obligationHealth: ObligationHealthResult;
  dsrHealth: DsrHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface ProcessingActivityHealthResult {
  activitiesWithoutLegalBasis: number;
  activitiesWithoutAssessment: number;
  stalledActivities: number;
  issues: string[];
}

export interface AssessmentHealthResult {
  overdueAssessments: number;
  highRiskWithoutMitigation: number;
  pendingDpoReview: number;
  issues: string[];
}

export interface ObligationHealthResult {
  nonCompliantObligations: number;
  overdueObligations: number;
  issues: string[];
}

export interface DsrHealthResult {
  overdueRequests: number;
  pendingVerification: number;
  issues: string[];
}

export class PrivacyDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<PrivacyDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      noLegalBasisResult, noAssessmentResult, stalledResult,
      overdueAssessResult, highRiskResult, pendingDpoResult,
      nonCompliantResult, overdueOblResult,
      overdueDsrResult, pendingVerifResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_activities WHERE deleted_at IS NULL AND status = 'active' AND (legal_basis IS NULL OR legal_basis = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_activities a WHERE a.deleted_at IS NULL AND a.status = 'active' AND NOT EXISTS (SELECT 1 FROM "${schema}".privacy_assessments WHERE activity_id = a.activity_id)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_activities WHERE deleted_at IS NULL AND status = 'under_review' AND updated_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_assessments WHERE status IN ('draft', 'in_progress') AND started_at < NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_assessments WHERE risk_level = 'high' AND status != 'approved' AND (mitigation_measures IS NULL OR mitigation_measures = '[]')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_assessments WHERE status = 'completed' AND dpo_review_approved IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_obligations WHERE status = 'non_compliant'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_obligations WHERE status != 'compliant' AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_dsr_requests WHERE status NOT IN ('completed', 'rejected') AND deadline_at < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".privacy_dsr_requests WHERE status = 'received'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const noLegalBasis = noLegalBasisResult.rows[0]?.count ?? 0;
    const noAssessment = noAssessmentResult.rows[0]?.count ?? 0;
    const stalled = stalledResult.rows[0]?.count ?? 0;
    const overdueAssess = overdueAssessResult.rows[0]?.count ?? 0;
    const highRisk = highRiskResult.rows[0]?.count ?? 0;
    const pendingDpo = pendingDpoResult.rows[0]?.count ?? 0;
    const nonCompliant = nonCompliantResult.rows[0]?.count ?? 0;
    const overdueObl = overdueOblResult.rows[0]?.count ?? 0;
    const overdueDsr = overdueDsrResult.rows[0]?.count ?? 0;
    const pendingVerif = pendingVerifResult.rows[0]?.count ?? 0;

    const actIssues: string[] = [];
    if (noLegalBasis > 0) { actIssues.push(`${noLegalBasis} active activities without legal basis`); errors.push(`${noLegalBasis} processing activit(ies) missing legal basis`); }
    if (noAssessment > 0) actIssues.push(`${noAssessment} active activities without privacy assessment`);
    if (stalled > 0) actIssues.push(`${stalled} activities stalled in review 30+ days`);

    const assessIssues: string[] = [];
    if (overdueAssess > 0) { assessIssues.push(`${overdueAssess} assessments overdue (90+ days)`); warnings.push(`${overdueAssess} privacy assessment(s) overdue`); }
    if (highRisk > 0) { assessIssues.push(`${highRisk} high-risk assessments without mitigation`); errors.push(`${highRisk} high-risk assessment(s) need mitigation`); }
    if (pendingDpo > 0) assessIssues.push(`${pendingDpo} assessments pending DPO review`);

    const oblIssues: string[] = [];
    if (nonCompliant > 0) { oblIssues.push(`${nonCompliant} non-compliant obligations`); warnings.push(`${nonCompliant} privacy obligation(s) non-compliant`); }
    if (overdueObl > 0) oblIssues.push(`${overdueObl} overdue obligations`);

    const dsrIssues: string[] = [];
    if (overdueDsr > 0) { dsrIssues.push(`${overdueDsr} DSR requests overdue`); errors.push(`${overdueDsr} data subject request(s) past deadline`); }
    if (pendingVerif > 0) dsrIssues.push(`${pendingVerif} DSR requests pending verification`);

    const criticalCount = noLegalBasis + highRisk + overdueDsr;
    const degradedCount = noAssessment + stalled + overdueAssess + nonCompliant;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'privacy',
      tenantId,
      generatedAt: new Date().toISOString(),
      processingActivityHealth: { activitiesWithoutLegalBasis: noLegalBasis, activitiesWithoutAssessment: noAssessment, stalledActivities: stalled, issues: actIssues },
      assessmentHealth: { overdueAssessments: overdueAssess, highRiskWithoutMitigation: highRisk, pendingDpoReview: pendingDpo, issues: assessIssues },
      obligationHealth: { nonCompliantObligations: nonCompliant, overdueObligations: overdueObl, issues: oblIssues },
      dsrHealth: { overdueRequests: overdueDsr, pendingVerification: pendingVerif, issues: dsrIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
