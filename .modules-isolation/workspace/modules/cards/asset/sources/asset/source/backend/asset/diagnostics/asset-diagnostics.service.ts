import { safeQuery, tenantSchema } from '../ports/database.port';

export interface AssetDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  inventoryHealth: InventoryHealthResult;
  classificationHealth: ClassificationHealthResult;
  lifecycleHealth: LifecycleHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface InventoryHealthResult {
  unclassifiedAssets: number;
  assetsWithoutOwner: number;
  assetsApproachingEol: number;
  assetsPassedEol: number;
  issues: string[];
}

export interface ClassificationHealthResult {
  overdueReviews: number;
  criticalUnreviewed: number;
  issues: string[];
}

export interface LifecycleHealthResult {
  stuckInDecommission: number;
  noMaintenanceSchedule: number;
  overdueDisposal: number;
  issues: string[];
}

export class AssetDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<AssetDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      unclassifiedResult, noOwnerResult, approachingEolResult, passedEolResult,
      overdueReviewResult, critUnreviewedResult,
      stuckDecomResult, noMaintenanceResult, overdueDisposalResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status = 'active' AND (classification IS NULL OR classification = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status NOT IN ('decommissioned', 'archived') AND (owner IS NULL OR owner = '')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status = 'active' AND end_of_life BETWEEN NOW() AND NOW() + INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status = 'active' AND end_of_life < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".asset_classifications WHERE review_due_at < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets a WHERE a.deleted_at IS NULL AND a.criticality = 'critical' AND NOT EXISTS (SELECT 1 FROM "${schema}".asset_classifications WHERE asset_id = a.asset_id AND classified_at > NOW() - INTERVAL '365 days')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status = 'decommissioning' AND updated_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL AND status = 'active' AND asset_type IN ('hardware', 'software') AND maintenance_schedule IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".asset_lifecycles WHERE disposal_method IS NOT NULL AND disposal_date IS NULL AND current_phase = 'disposal'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const unclassified = unclassifiedResult.rows[0]?.count ?? 0;
    const noOwner = noOwnerResult.rows[0]?.count ?? 0;
    const approachingEol = approachingEolResult.rows[0]?.count ?? 0;
    const passedEol = passedEolResult.rows[0]?.count ?? 0;
    const overdueReview = overdueReviewResult.rows[0]?.count ?? 0;
    const critUnreviewed = critUnreviewedResult.rows[0]?.count ?? 0;
    const stuckDecom = stuckDecomResult.rows[0]?.count ?? 0;
    const noMaintenance = noMaintenanceResult.rows[0]?.count ?? 0;
    const overdueDisposal = overdueDisposalResult.rows[0]?.count ?? 0;

    const invIssues: string[] = [];
    if (unclassified > 0) { invIssues.push(`${unclassified} active assets unclassified`); warnings.push(`${unclassified} asset(s) missing classification`); }
    if (noOwner > 0) invIssues.push(`${noOwner} assets without owner`);
    if (passedEol > 0) { invIssues.push(`${passedEol} active assets past end-of-life`); errors.push(`${passedEol} asset(s) past EOL still active`); }
    if (approachingEol > 0) invIssues.push(`${approachingEol} assets approaching EOL within 90 days`);

    const classIssues: string[] = [];
    if (overdueReview > 0) classIssues.push(`${overdueReview} classification reviews overdue`);
    if (critUnreviewed > 0) { classIssues.push(`${critUnreviewed} critical assets not reviewed in 12 months`); warnings.push(`${critUnreviewed} critical asset(s) need classification review`); }

    const lcIssues: string[] = [];
    if (stuckDecom > 0) lcIssues.push(`${stuckDecom} assets stuck in decommissioning 30+ days`);
    if (noMaintenance > 0) lcIssues.push(`${noMaintenance} HW/SW assets without maintenance schedule`);
    if (overdueDisposal > 0) lcIssues.push(`${overdueDisposal} assets with overdue disposal`);

    const criticalCount = passedEol + (errors.length > 0 ? 1 : 0);
    const degradedCount = unclassified + noOwner + overdueReview + stuckDecom;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'asset',
      tenantId,
      generatedAt: new Date().toISOString(),
      inventoryHealth: { unclassifiedAssets: unclassified, assetsWithoutOwner: noOwner, assetsApproachingEol: approachingEol, assetsPassedEol: passedEol, issues: invIssues },
      classificationHealth: { overdueReviews: overdueReview, criticalUnreviewed: critUnreviewed, issues: classIssues },
      lifecycleHealth: { stuckInDecommission: stuckDecom, noMaintenanceSchedule: noMaintenance, overdueDisposal: overdueDisposal, issues: lcIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
