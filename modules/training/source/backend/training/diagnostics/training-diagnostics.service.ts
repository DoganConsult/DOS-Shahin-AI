import { safeQuery, tenantSchema } from '../ports/database.port';

export interface TrainingDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  assignmentHealth: AssignmentHealthResult;
  completionHealth: CompletionHealthResult;
  campaignHealth: CampaignHealthResult;
  complianceGaps: ComplianceGapsResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface AssignmentHealthResult {
  overdueAssignments: number;
  stalledAssignments: number;
  unassignedPrograms: number;
  issues: string[];
}

export interface CompletionHealthResult {
  lowPassRatePrograms: number;
  noCompletionsIn90Days: number;
  averageCompletionRate: number;
  issues: string[];
}

export interface CampaignHealthResult {
  activeCampaigns: number;
  stalledCampaigns: number;
  campaignsEndingSoon: number;
  issues: string[];
}

export interface ComplianceGapsResult {
  mandatoryNotAssigned: number;
  recurringOverdue: number;
  issues: string[];
}

export class TrainingDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<TrainingDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      overdueAssignResult, stalledAssignResult, unassignedProgResult,
      lowPassResult, noCompletion90Result,
      activeCampaignResult, stalledCampaignResult, endingSoonResult,
      mandatoryNotAssignedResult, recurringOverdueResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_assignments WHERE status NOT IN ('completed', 'exempted') AND due_date < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_assignments WHERE status = 'in_progress' AND updated_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_programs p WHERE p.deleted_at IS NULL AND p.status = 'active' AND NOT EXISTS (SELECT 1 FROM "${schema}".training_assignments WHERE program_id = p.program_id)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_programs WHERE deleted_at IS NULL AND status = 'active' AND passing_score IS NOT NULL AND program_id IN (SELECT program_id FROM "${schema}".training_assignments WHERE status = 'completed' GROUP BY program_id HAVING AVG(CASE WHEN passed THEN 1 ELSE 0 END) < 0.5)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_programs p WHERE p.deleted_at IS NULL AND p.status = 'active' AND NOT EXISTS (SELECT 1 FROM "${schema}".training_assignments WHERE program_id = p.program_id AND status = 'completed' AND completed_at > NOW() - INTERVAL '90 days')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_campaigns WHERE status = 'active'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_campaigns WHERE status = 'active' AND updated_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_campaigns WHERE status = 'active' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_programs WHERE deleted_at IS NULL AND mandatory = true AND status = 'active' AND program_id NOT IN (SELECT DISTINCT program_id FROM "${schema}".training_assignments)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".training_programs WHERE deleted_at IS NULL AND mandatory = true AND recurrence_policy IS NOT NULL AND recurrence_policy != 'none' AND updated_at < NOW() - INTERVAL '365 days'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const overdueAssign = overdueAssignResult.rows[0]?.count ?? 0;
    const stalledAssign = stalledAssignResult.rows[0]?.count ?? 0;
    const unassignedProg = unassignedProgResult.rows[0]?.count ?? 0;
    const lowPass = lowPassResult.rows[0]?.count ?? 0;
    const noCompletion90 = noCompletion90Result.rows[0]?.count ?? 0;
    const activeCampaign = activeCampaignResult.rows[0]?.count ?? 0;
    const stalledCampaign = stalledCampaignResult.rows[0]?.count ?? 0;
    const endingSoon = endingSoonResult.rows[0]?.count ?? 0;
    const mandatoryNotAssigned = mandatoryNotAssignedResult.rows[0]?.count ?? 0;
    const recurringOverdue = recurringOverdueResult.rows[0]?.count ?? 0;

    const assignIssues: string[] = [];
    if (overdueAssign > 0) { assignIssues.push(`${overdueAssign} overdue assignments`); warnings.push(`${overdueAssign} training assignment(s) overdue`); }
    if (stalledAssign > 0) assignIssues.push(`${stalledAssign} assignments stalled 30+ days`);
    if (unassignedProg > 0) assignIssues.push(`${unassignedProg} active programs with no assignments`);

    const completionIssues: string[] = [];
    if (lowPass > 0) completionIssues.push(`${lowPass} programs with <50% pass rate`);
    if (noCompletion90 > 0) completionIssues.push(`${noCompletion90} programs with no completions in 90 days`);

    const campaignIssues: string[] = [];
    if (stalledCampaign > 0) campaignIssues.push(`${stalledCampaign} stalled campaigns`);
    if (endingSoon > 0) campaignIssues.push(`${endingSoon} campaigns ending within 7 days`);

    const complianceIssues: string[] = [];
    if (mandatoryNotAssigned > 0) { complianceIssues.push(`${mandatoryNotAssigned} mandatory programs not assigned`); errors.push(`${mandatoryNotAssigned} mandatory training program(s) have no assignments`); }
    if (recurringOverdue > 0) { complianceIssues.push(`${recurringOverdue} recurring trainings overdue for renewal`); warnings.push(`${recurringOverdue} recurring training(s) overdue`); }

    const criticalCount = mandatoryNotAssigned + (errors.length > 0 ? 1 : 0);
    const degradedCount = overdueAssign + stalledAssign + lowPass + stalledCampaign + recurringOverdue;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'training',
      tenantId,
      generatedAt: new Date().toISOString(),
      assignmentHealth: { overdueAssignments: overdueAssign, stalledAssignments: stalledAssign, unassignedPrograms: unassignedProg, issues: assignIssues },
      completionHealth: { lowPassRatePrograms: lowPass, noCompletionsIn90Days: noCompletion90, averageCompletionRate: 0, issues: completionIssues },
      campaignHealth: { activeCampaigns: activeCampaign, stalledCampaigns: stalledCampaign, campaignsEndingSoon: endingSoon, issues: campaignIssues },
      complianceGaps: { mandatoryNotAssigned, recurringOverdue, issues: complianceIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
