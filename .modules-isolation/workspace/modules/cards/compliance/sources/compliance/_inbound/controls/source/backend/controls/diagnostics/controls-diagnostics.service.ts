import { safeQuery, tenantSchema } from '../ports/database.port';

export interface ControlsDiagnosticsReport {
  generated_at: string;
  mapping_consistency: MappingConsistencyResult;
  ownership_gaps: OwnershipGapResult;
  test_effectiveness: TestEffectivenessResult;
  protected_transitions: ProtectedTransitionResult;
  automation_health: AutomationHealthResult;
  overall_health: 'healthy' | 'degraded' | 'critical';
}

export interface MappingConsistencyResult {
  unmapped_active_controls: number;
  orphaned_risk_links: number;
  orphaned_obligation_links: number;
  orphaned_policy_links: number;
  issues: string[];
}

export interface OwnershipGapResult {
  controls_without_primary_owner: number;
  controls_without_operator: number;
  total_ownership_gaps: number;
  issues: string[];
}

export interface TestEffectivenessResult {
  overdue_tests: number;
  never_tested_active_controls: number;
  ineffective_controls: number;
  issues: string[];
}

export interface ProtectedTransitionResult {
  controls_in_review_over_7_days: number;
  stale_certifications: number;
  issues: string[];
}

export interface AutomationHealthResult {
  failing_automations: number;
  degraded_automations: number;
  unknown_state_count: number;
  issues: string[];
}

export class ControlsDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<ControlsDiagnosticsReport> {
    const schema = tenantSchema(tenantId);

    const [
      unmappedResult,
      orphanedRiskResult,
      orphanedObligationResult,
      orphanedPolicyResult,
      noPrimaryOwnerResult,
      noOperatorResult,
      overdueTestsResult,
      neverTestedResult,
      ineffectiveResult,
      longReviewResult,
      staleCertResult,
      failingAutoResult,
      degradedAutoResult,
      unknownAutoResult,
    ] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL AND c.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM ${schema}.control_risk_links WHERE control_id = c.control_id)
            AND NOT EXISTS (SELECT 1 FROM ${schema}.control_obligation_mappings WHERE control_id = c.control_id)
            AND NOT EXISTS (SELECT 1 FROM ${schema}.control_policy_links WHERE control_id = c.control_id)`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_risk_links rl
          WHERE NOT EXISTS (SELECT 1 FROM ${schema}.controls WHERE control_id = rl.control_id AND deleted_at IS NULL)`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_obligation_mappings om
          WHERE NOT EXISTS (SELECT 1 FROM ${schema}.controls WHERE control_id = om.control_id AND deleted_at IS NULL)`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_policy_links pl
          WHERE NOT EXISTS (SELECT 1 FROM ${schema}.controls WHERE control_id = pl.control_id AND deleted_at IS NULL)`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL AND c.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM ${schema}.control_owners WHERE control_id = c.control_id AND is_primary = true)`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL AND c.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM ${schema}.control_owners WHERE control_id = c.control_id AND ownership_type = 'operator')`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls
          WHERE deleted_at IS NULL AND status = 'active'
            AND last_tested_at < NOW() - INTERVAL '90 days'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls
          WHERE deleted_at IS NULL AND status = 'active'
            AND last_tested_at IS NULL
            AND created_at < NOW() - INTERVAL '90 days'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls
          WHERE deleted_at IS NULL AND status = 'active'
            AND effectiveness_rating = 'ineffective'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.controls
          WHERE deleted_at IS NULL AND status = 'under_review'
            AND updated_at < NOW() - INTERVAL '7 days'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_certification_campaigns
          WHERE status = 'active' AND due_date < NOW() - INTERVAL '1 day'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_automation_state a
           JOIN ${schema}.controls c ON c.control_id = a.control_id
          WHERE c.deleted_at IS NULL AND a.health_status = 'failing'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_automation_state a
           JOIN ${schema}.controls c ON c.control_id = a.control_id
          WHERE c.deleted_at IS NULL AND a.health_status = 'degraded'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count FROM ${schema}.control_automation_state a
           JOIN ${schema}.controls c ON c.control_id = a.control_id
          WHERE c.deleted_at IS NULL AND a.health_status = 'unknown'`,
        []
      ),
    ]);

    const unmapped = unmappedResult.rows[0]?.count ?? 0;
    const orphanedRisk = orphanedRiskResult.rows[0]?.count ?? 0;
    const orphanedObligation = orphanedObligationResult.rows[0]?.count ?? 0;
    const orphanedPolicy = orphanedPolicyResult.rows[0]?.count ?? 0;
    const noPrimary = noPrimaryOwnerResult.rows[0]?.count ?? 0;
    const noOperator = noOperatorResult.rows[0]?.count ?? 0;
    const overdue = overdueTestsResult.rows[0]?.count ?? 0;
    const neverTested = neverTestedResult.rows[0]?.count ?? 0;
    const ineffective = ineffectiveResult.rows[0]?.count ?? 0;
    const longReview = longReviewResult.rows[0]?.count ?? 0;
    const staleCert = staleCertResult.rows[0]?.count ?? 0;
    const failingAuto = failingAutoResult.rows[0]?.count ?? 0;
    const degradedAuto = degradedAutoResult.rows[0]?.count ?? 0;
    const unknownAuto = unknownAutoResult.rows[0]?.count ?? 0;

    const mappingIssues: string[] = [];
    if (unmapped > 0) mappingIssues.push(`${unmapped} active controls have no risk, obligation, or policy mappings`);
    if (orphanedRisk > 0) mappingIssues.push(`${orphanedRisk} orphaned risk links reference deleted controls`);
    if (orphanedObligation > 0) mappingIssues.push(`${orphanedObligation} orphaned obligation links reference deleted controls`);
    if (orphanedPolicy > 0) mappingIssues.push(`${orphanedPolicy} orphaned policy links reference deleted controls`);

    const ownershipIssues: string[] = [];
    if (noPrimary > 0) ownershipIssues.push(`${noPrimary} active controls have no primary owner assigned`);
    if (noOperator > 0) ownershipIssues.push(`${noOperator} active controls have no operator assigned`);

    const testIssues: string[] = [];
    if (overdue > 0) testIssues.push(`${overdue} active controls have tests overdue (>90 days since last test)`);
    if (neverTested > 0) testIssues.push(`${neverTested} active controls have never been tested (created >90 days ago)`);
    if (ineffective > 0) testIssues.push(`${ineffective} active controls are rated ineffective`);

    const transitionIssues: string[] = [];
    if (longReview > 0) transitionIssues.push(`${longReview} controls have been under_review for more than 7 days`);
    if (staleCert > 0) transitionIssues.push(`${staleCert} certification campaigns are past due date`);

    const autoIssues: string[] = [];
    if (failingAuto > 0) autoIssues.push(`${failingAuto} automated controls are in failing health state`);
    if (degradedAuto > 0) autoIssues.push(`${degradedAuto} automated controls are in degraded health state`);
    if (unknownAuto > 0) autoIssues.push(`${unknownAuto} automated controls have unknown health state`);

    const criticalCount = failingAuto + noPrimary + (ineffective > 5 ? 1 : 0);
    const degradedCount = unmapped + overdue + neverTested + longReview + degradedAuto;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      generated_at: new Date().toISOString(),
      mapping_consistency: {
        unmapped_active_controls: unmapped,
        orphaned_risk_links: orphanedRisk,
        orphaned_obligation_links: orphanedObligation,
        orphaned_policy_links: orphanedPolicy,
        issues: mappingIssues,
      },
      ownership_gaps: {
        controls_without_primary_owner: noPrimary,
        controls_without_operator: noOperator,
        total_ownership_gaps: noPrimary + noOperator,
        issues: ownershipIssues,
      },
      test_effectiveness: {
        overdue_tests: overdue,
        never_tested_active_controls: neverTested,
        ineffective_controls: ineffective,
        issues: testIssues,
      },
      protected_transitions: {
        controls_in_review_over_7_days: longReview,
        stale_certifications: staleCert,
        issues: transitionIssues,
      },
      automation_health: {
        failing_automations: failingAuto,
        degraded_automations: degradedAuto,
        unknown_state_count: unknownAuto,
        issues: autoIssues,
      },
      overall_health: overallHealth,
    };
  }

  async getMappingConsistency(tenantId: string): Promise<MappingConsistencyResult> {
    const report = await this.runDiagnostics(tenantId);
    return report.mapping_consistency;
  }

  async getOwnershipGapDiagnostics(tenantId: string): Promise<OwnershipGapResult> {
    const report = await this.runDiagnostics(tenantId);
    return report.ownership_gaps;
  }

  async getTestEffectivenessDiagnostics(tenantId: string): Promise<TestEffectivenessResult> {
    const report = await this.runDiagnostics(tenantId);
    return report.test_effectiveness;
  }

  async getProtectedTransitionDiagnostics(tenantId: string): Promise<ProtectedTransitionResult> {
    const report = await this.runDiagnostics(tenantId);
    return report.protected_transitions;
  }

  async getAutomationHealthDiagnostics(tenantId: string): Promise<AutomationHealthResult> {
    const report = await this.runDiagnostics(tenantId);
    return report.automation_health;
  }
}
