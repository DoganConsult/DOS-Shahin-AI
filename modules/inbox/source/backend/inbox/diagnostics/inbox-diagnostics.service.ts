import { safeQuery, tenantSchema } from '../ports/database.port';

export interface InboxDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  aggregationHealth: AggregationHealthResult;
  itemHealth: ItemHealthResult;
  deliveryHealth: DeliveryHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface AggregationHealthResult {
  sourceModulesConnected: number;
  staleSources: number;
  issues: string[];
}

export interface ItemHealthResult {
  expiredUnactioned: number;
  overdueActions: number;
  staleItems90Days: number;
  issues: string[];
}

export interface DeliveryHealthResult {
  failedDeliveries: number;
  duplicateItems: number;
  issues: string[];
}

export class InboxDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<InboxDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      expiredResult, overdueResult, staleResult,
      failedResult, duplicateResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".inbox_items WHERE status NOT IN ('actioned', 'dismissed') AND expires_at < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".inbox_items WHERE action_required = true AND status NOT IN ('actioned', 'dismissed', 'expired') AND action_deadline < NOW()`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".inbox_items WHERE status NOT IN ('actioned', 'dismissed', 'expired') AND created_at < NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".inbox_delivery_failures WHERE created_at > NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM (SELECT source_entity_id, user_id, COUNT(*) AS cnt FROM "${schema}".inbox_items WHERE source_entity_id IS NOT NULL GROUP BY source_entity_id, user_id HAVING COUNT(*) > 1) dupes`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const expired = expiredResult.rows[0]?.count ?? 0;
    const overdue = overdueResult.rows[0]?.count ?? 0;
    const stale = staleResult.rows[0]?.count ?? 0;
    const failed = failedResult.rows[0]?.count ?? 0;
    const duplicate = duplicateResult.rows[0]?.count ?? 0;

    const itemIssues: string[] = [];
    if (expired > 0) itemIssues.push(`${expired} expired unactioned items`);
    if (overdue > 0) { itemIssues.push(`${overdue} action-required items overdue`); warnings.push(`${overdue} inbox action(s) overdue`); }
    if (stale > 0) itemIssues.push(`${stale} items stale (90+ days)`);

    const deliveryIssues: string[] = [];
    if (failed > 0) { deliveryIssues.push(`${failed} delivery failures in 24h`); warnings.push(`${failed} inbox delivery failure(s)`); }
    if (duplicate > 0) deliveryIssues.push(`${duplicate} duplicate items detected`);

    const criticalCount = (overdue > 10 ? 1 : 0) + (failed > 5 ? 1 : 0);
    const degradedCount = expired + overdue + stale + failed;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'inbox',
      tenantId,
      generatedAt: new Date().toISOString(),
      aggregationHealth: { sourceModulesConnected: 0, staleSources: 0, issues: [] },
      itemHealth: { expiredUnactioned: expired, overdueActions: overdue, staleItems90Days: stale, issues: itemIssues },
      deliveryHealth: { failedDeliveries: failed, duplicateItems: duplicate, issues: deliveryIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
